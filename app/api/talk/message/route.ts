import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { verifyToken } from '@/lib/auth';
import { incrementStat } from '@/lib/achievements/checker';

const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY;
const TOGETHER_MODEL = process.env.TOGETHER_MODEL || 'Qwen/Qwen2.5-72B-Instruct-Turbo';
const NOVITA_API_KEY = process.env.NOVITA_API_KEY;
const NOVITA_CHAT_MODEL = process.env.NOVITA_CHAT_MODEL || 'meta-llama/llama-3.3-70b-instruct';
const LLM_PROVIDER = process.env.LLM_PROVIDER || 'novita';

// POST /api/talk/message — send a message in daily talk
export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

  const userId = payload.userId;
  const { message, sessionId, tz } = await req.json();

  if (!message || !sessionId) {
    return NextResponse.json({ error: 'message and sessionId required' }, { status: 400 });
  }

  // Get session
  const { data: session } = await supabaseAdmin
    .from('daily_talk_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .single();

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  // Rate limit: max 5 messages per minute
  const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
  const { count } = await supabaseAdmin
    .from('daily_talk_messages')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', sessionId)
    .eq('role', 'user')
    .gte('created_at', oneMinuteAgo);

  if ((count ?? 0) >= 5) {
    return NextResponse.json({ error: 'Rate limit exceeded. Please wait a moment.' }, { status: 429 });
  }

  // Save user message
  await supabaseAdmin.from('daily_talk_messages').insert({
    session_id: sessionId,
    user_id: userId,
    role: 'user',
    content: message,
  });

  // Increment message count
  const newCount = session.message_count + 1;
  await supabaseAdmin
    .from('daily_talk_sessions')
    .update({ message_count: newCount })
    .eq('id', sessionId);

  // Get character
  const { data: character } = await supabaseAdmin
    .from('talk_characters')
    .select('*')
    .eq('id', session.character_id)
    .single();

  if (!character) return NextResponse.json({ error: 'Character not found' }, { status: 500 });

  // Get streak
  const { data: streak } = await supabaseAdmin
    .from('user_talk_streaks')
    .select('*')
    .eq('user_id', userId)
    .single();

  // Get conversation history for this session
  const { data: history } = await supabaseAdmin
    .from('daily_talk_messages')
    .select('role, content')
    .eq('session_id', sessionId)
    .order('created_at')
    .limit(20);

  // Build system prompt
  const systemPrompt = buildSystemPrompt(character, session, streak, newCount);

  // Call LLM
  const aiResponse = await callLLM(systemPrompt, history ?? []);

  // Save AI response
  await supabaseAdmin.from('daily_talk_messages').insert({
    session_id: sessionId,
    user_id: userId,
    role: 'assistant',
    content: aiResponse,
  });

  // Track chat message for achievements
  await incrementStat(userId, 'chat_messages_count', 1);

  // Check if completed (5 user messages)
  let completed = false;
  let rewardTotal = 0;
  let achievementUnlocks: { achievementId: string; name: string; nameJa: string; rewardCredits: number }[] = [];

  if (newCount >= 5 && !session.completed) {
    completed = true;
    rewardTotal = session.base_reward + session.bonus_reward;

    // Mark session complete
    await supabaseAdmin
      .from('daily_talk_sessions')
      .update({
        completed: true,
        completed_at: new Date().toISOString(),
        reward_claimed: true,
      })
      .eq('id', sessionId);

    // Grant credits
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('credits')
      .eq('id', userId)
      .single();

    if (user) {
      await supabaseAdmin
        .from('users')
        .update({ credits: user.credits + rewardTotal })
        .eq('id', userId);

      await supabaseAdmin.from('credit_log').insert({
        user_id: userId,
        type: 'daily_talk_reward',
        delta: rewardTotal,
        note: `Daily talk reward (day ${session.streak_day})`,
      });
    }

    // Update streak
    const today = tz ? getLocalDate(tz) : new Date().toISOString().split('T')[0];
    await updateStreak(userId, today);

    // Check streak achievements
    const { data: updatedStreak } = await supabaseAdmin
      .from('user_talk_streaks')
      .select('current_streak')
      .eq('user_id', userId)
      .single();

    if (updatedStreak) {
      await supabaseAdmin
        .from('user_stats')
        .upsert({ user_id: userId, chat_streak: updatedStreak.current_streak, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });

      const streakUnlocks = await import('@/lib/achievements/checker').then(m => m.checkAndUnlockAchievements(userId, 'chat_streak'));
      achievementUnlocks = [...achievementUnlocks, ...streakUnlocks];
    }
  }

  return NextResponse.json({
    reply: aiResponse,
    messageCount: newCount,
    completed,
    rewardTotal,
    streakDay: session.streak_day,
    achievementUnlocks,
  });
}

function buildSystemPrompt(
  character: { personality_prompt: string; name: string },
  session: { streak_day: number; message_count: number },
  streak: { current_streak: number; longest_streak: number } | null,
  currentCount: number
): string {
  return `${character.personality_prompt}

# Context about this user:
- Today is day ${session.streak_day} of their consecutive talk streak.
- Longest streak record: ${streak?.longest_streak ?? 0} days.
- Total messages exchanged with you today: ${currentCount}/5.

# Rules:
- Reply in 1-2 short sentences only. Never write more than 2 sentences.
- Never generate images. If asked, say "Try the image generation tab."
- Today's goal: 5 message exchanges. Current count: ${currentCount}/5.
- When count reaches 5, congratulate them and mention the credit reward naturally.
- If they return after a break, acknowledge it warmly without guilt-tripping.
- Match the user's language.`;
}

async function callLLM(systemPrompt: string, messages: { role: string; content: string }[]): Promise<string> {
  const chatMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map(m => ({ role: m.role, content: m.content })),
  ];

  try {
    if (LLM_PROVIDER === 'together' && TOGETHER_API_KEY) {
      const res = await fetch('https://api.together.xyz/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TOGETHER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: TOGETHER_MODEL,
          messages: chatMessages,
          max_tokens: 150,
          temperature: 0.7,
        }),
        signal: AbortSignal.timeout(15000),
      });

      const data = await res.json();
      return data.choices?.[0]?.message?.content?.trim() || 'Sorry, I could not respond.';
    } else {
      // Default: Novita
      const res = await fetch('https://api.novita.ai/v3/openai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${NOVITA_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: NOVITA_CHAT_MODEL,
          messages: chatMessages,
          max_tokens: 150,
          temperature: 0.7,
        }),
        signal: AbortSignal.timeout(15000),
      });

      const data = await res.json();
      return data.choices?.[0]?.message?.content?.trim() || 'Sorry, I could not respond.';
    }
  } catch {
    return "…ごめん、ちょっと調子悪いみたい。もう一回話しかけて。";
  }
}

async function updateStreak(userId: string, today: string) {
  const { data: streak } = await supabaseAdmin
    .from('user_talk_streaks')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!streak) {
    // First time
    await supabaseAdmin.from('user_talk_streaks').insert({
      user_id: userId,
      current_streak: 1,
      longest_streak: 1,
      last_completed_date: today,
      total_completed_days: 1,
    });
    return;
  }

  const lastDate = streak.last_completed_date;
  const yesterday = getYesterday(today);

  let newStreak: number;
  if (lastDate === yesterday) {
    newStreak = streak.current_streak + 1;
  } else if (lastDate === today) {
    return; // Already counted today
  } else {
    newStreak = 1; // Streak broken
  }

  await supabaseAdmin
    .from('user_talk_streaks')
    .update({
      current_streak: newStreak,
      longest_streak: Math.max(streak.longest_streak, newStreak),
      last_completed_date: today,
      total_completed_days: streak.total_completed_days + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
}

function getLocalDate(tz: string): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
    return formatter.format(new Date());
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

function getYesterday(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().split('T')[0];
}
