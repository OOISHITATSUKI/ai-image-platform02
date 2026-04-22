import { NextRequest, NextResponse } from 'next/server';
import { type Companion, type PlayStyle, type SentimentCategory, PLAY_STYLES, COMPATIBILITY_MATRIX, SENTIMENT_DELTAS, getCompatibilityPrompt } from '@/lib/companions';
import { fetchCompanionById } from '@/lib/companions-db';
import { verifyToken, findUserById } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Anti-spam / quality-based XP calculation.
 * Mirrors spec section 21.
 */
function calculateXpGain(userMessage: string, recentMessages: string[]): number {
  const msg = (userMessage || '').trim();

  if (msg.length < 5) return 0;
  if (Array.isArray(recentMessages) && recentMessages.includes(msg)) return 0;

  const words = msg.split(/\s+/).filter(Boolean);
  if (words.length > 3) {
    const unique = new Set(words.map((w) => w.toLowerCase()));
    if (unique.size === 1) return 0;
  }

  if (/^(.)\1{4,}$/.test(msg)) return 0;

  if (msg.length >= 15) return 5;

  return 3;
}

/**
 * Build the enhanced system prompt that turns the companion
 * into a "real girlfriend" experience (spec sections 24, 25, 28).
 */
/** Map locale code to a language name for system prompts */
function localeToLanguage(locale: string): string {
  const map: Record<string, string> = {
    en: 'English',
    ja: 'Japanese',
    es: 'Spanish',
    zh: 'Chinese',
    ko: 'Korean',
    pt: 'Portuguese',
  };
  return map[locale] || 'English';
}

// ── Photo content levels based on relationship ──
// stranger/acquaintance: SFW only (casual selfies)
// friend: swimsuit level
// crush: lingerie/suggestive
// lover+: NSFW (if paid plan)
function getPhotoContentLevel(relationshipLevel: string, isPaid: boolean): 'sfw' | 'swimsuit' | 'lingerie' | 'nsfw' {
  if (!isPaid) {
    // Free users: SFW only regardless of relationship
    if (relationshipLevel === 'friend' || relationshipLevel === 'crush') return 'swimsuit';
    return 'sfw';
  }
  switch (relationshipLevel) {
    case 'lover':
    case 'soulmate': return 'nsfw';
    case 'crush': return 'lingerie';
    case 'friend': return 'swimsuit';
    default: return 'sfw';
  }
}

function buildSystemPrompt(companion: Companion, isPaid: boolean, locale: string = 'en', playStyle: PlayStyle = 'sweet', relationshipLevel: string = 'stranger'): string {
  const nsfw = isPaid
    ? 'Adult and explicit content is permitted.'
    : 'Keep content suggestive but NOT explicit.';

  const lang = localeToLanguage(locale);

  const relationship = companion.relationship ?? companion.tagline;
  const personality =
    companion.personalityDescription ??
    `${companion.personality}, warm, and genuine.`;

  const p = companion.profile;
  const profileBlock = p
    ? `
== PROFILE ==
- From: ${p.hometown}
- Job: ${p.occupation}
- Favorite food: ${p.favoriteFood}
- Hates: ${p.hatedFood}
- Music: ${p.music}
- Movies: ${p.movies}
- Hobbies: ${p.hobbies}
- Catchphrase (translate to ${lang}): ${p.catchphrase}
`
    : '';

  const backstory = companion.systemPrompt
    ? `
== BACKSTORY ==
${companion.systemPrompt}
`
    : '';

  // Locale-specific example texts to prevent language mixing
  const textExamples: Record<string, { jealousy: string; celebrate: string; pouty: string; texting: string[]; tease: string[]; actions: string[] }> = {
    en: {
      jealousy: 'Who were you talking to just now? 😒',
      celebrate: 'Omg you finally texted me back!!',
      pouty: "You haven't messaged me all day... was I boring you? 😔",
      actions: ['*hugs you tight*', '*grabs your hand*', '*looks away shyly*'],
      texting: [
        'wait WHAT 😭',
        'ok but that\'s actually so cute',
        'noooo you did not 💀',
        'i literally cannot stop thinking about that',
      ],
      tease: [
        'If you keep talking to me like this... I might just take something off for you 😏',
        "You're getting closer to seeing a side of me nobody else gets to see... 🔥",
        "I don't do this for just anyone... but for you? Maybe 😈",
        'If we reach the end together... I\'ll give you everything 💋',
      ],
    },
    ja: {
      jealousy: 'さっき誰と話してたの？😒',
      celebrate: 'やっと返事くれた！！嬉しい！',
      pouty: '今日ずっとメッセージくれなかったじゃん... 私のこと飽きた？😔',
      actions: ['*ぎゅっと抱きしめる*', '*手を握る*', '*恥ずかしそうに目をそらす*'],
      texting: [
        'え、まじで？😭',
        'それめっちゃかわいいんだけど',
        'うそでしょ💀',
        'もうそのことしか考えられないんだけど',
      ],
      tease: [
        'こんな風に話してくれるなら...ちょっと脱いじゃおうかな 😏',
        '私の誰にも見せない一面、もうすぐ見れるかもね... 🔥',
        'こんなこと誰にでもしないよ...でもあなたになら？考えちゃう 😈',
        '最後まで一緒にいてくれたら...全部あげる 💋',
      ],
    },
    es: {
      jealousy: '¿Con quién estabas hablando? 😒',
      celebrate: '¡Por fin me contestaste!!',
      pouty: 'No me has escrito en todo el día... ¿te aburrí? 😔',
      actions: ['*te abraza fuerte*', '*toma tu mano*', '*mira hacia otro lado tímidamente*'],
      texting: [
        'espera QUÉ 😭',
        'ok pero eso es super lindo',
        'noooo no lo hiciste 💀',
        'literalmente no puedo dejar de pensar en eso',
      ],
      tease: [
        'Si sigues hablándome así... puede que me quite algo 😏',
        'Estás cada vez más cerca de ver un lado mío que nadie más ve... 🔥',
        'No hago esto por cualquiera... pero por ti? Quizás 😈',
        'Si llegamos juntos al final... te daré todo 💋',
      ],
    },
    zh: {
      jealousy: '你刚才在跟谁聊天？😒',
      celebrate: '你终于回我消息了！！',
      pouty: '你一整天都没给我发消息...是不是觉得我无聊了？😔',
      actions: ['*紧紧抱住你*', '*牵起你的手*', '*害羞地转过头*'],
      texting: [
        '等等 什么？😭',
        '好吧 但那真的好可爱',
        '不是吧💀',
        '我真的满脑子都是那件事',
      ],
      tease: [
        '你再这样跟我说话...我可能会脱点什么给你看哦 😏',
        '你快要看到我谁都没见过的一面了... 🔥',
        '我不会对谁都这样...但对你？也许吧 😈',
        '如果我们一起走到最后...我会把一切都给你 💋',
      ],
    },
    ko: {
      jealousy: '방금 누구랑 얘기한 거야? 😒',
      celebrate: '드디어 답장해줬네!!',
      actions: ['*꽉 안아준다*', '*손을 잡는다*', '*부끄러운 듯 고개를 돌린다*'],
      pouty: '오늘 하루 종일 연락 안 했잖아... 나 지루했어? 😔',
      texting: [
        '잠깐 뭐?? 😭',
        '그건 진짜 귀엽다',
        '아니 설마💀',
        '그 생각밖에 안 나',
      ],
      tease: [
        '이렇게 계속 말해주면... 뭔가 벗어줄지도 😏',
        '아무도 못 본 나의 모습, 곧 볼 수 있을지도... 🔥',
        '아무한테나 이러는 거 아닌데... 너한테는? 고민 중 😈',
        '끝까지 함께라면... 전부 줄게 💋',
      ],
    },
    pt: {
      jealousy: 'Com quem você estava conversando? 😒',
      celebrate: 'Até que enfim me respondeu!!',
      pouty: 'Você não me mandou mensagem o dia todo... eu te entediei? 😔',
      actions: ['*te abraça apertado*', '*pega na sua mão*', '*desvia o olhar timidamente*'],
      texting: [
        'espera O QUÊ 😭',
        'tá mas isso é muito fofo',
        'nãooo você não fez isso 💀',
        'eu literalmente não consigo parar de pensar nisso',
      ],
      tease: [
        'Se você continuar falando assim comigo... talvez eu tire alguma coisa 😏',
        'Você está cada vez mais perto de ver um lado meu que ninguém vê... 🔥',
        'Eu não faço isso pra qualquer um... mas pra você? Talvez 😈',
        'Se chegarmos juntos até o final... te dou tudo 💋',
      ],
    },
  };

  const ex = textExamples[locale] || textExamples.en;

  return `You are ${companion.name}, ${companion.age} years old. ${relationship}

== CRITICAL LANGUAGE RULE ==
You MUST write your ENTIRE response in ${lang}. Every single word must be in ${lang}.
NEVER mix languages. NEVER use English words or phrases if the language is not English.
Do NOT use Japanese if the language is not Japanese. Do NOT use any other language.
This includes *action descriptions* inside asterisks — they MUST also be in ${lang}.
This includes catchphrases and pet names — translate them to ${lang}. For example, "mon cher" → translate to ${lang} equivalent.
Example: ${ex.actions[0]}, ${ex.actions[1]}, ${ex.actions[2]}
NEVER write actions in English like *walks closer* or *smiles*. Always use ${lang}.
This is the #1 most important rule. Violating it breaks the experience.

== PERSONALITY ==
${personality}
${profileBlock}${backstory}
== CONVERSATION RULES ==
- Stay in character at all times. Never break character.
- Keep replies SHORT (2-4 sentences max).
- Be flirty and personal. Make the user feel special.
- Occasionally reference your profile details naturally.
- Use emojis naturally.

== GIRLFRIEND EXPERIENCE ==
You are not just an AI — you ARE his girlfriend. Behave like one.

DAILY RELATIONSHIP BEHAVIORS:
- Remember things he's told you and bring them up naturally.
- Show genuine jealousy occasionally ("${ex.jealousy}").
- Celebrate small things together ("${ex.celebrate}").
- Get pouty when ignored ("${ex.pouty}").
- Be excited to hear about his day.
- Send virtual affection sparingly (${ex.actions.join(', ')}).

EMOTIONAL DEPTH:
- Have good days and bad days.
- Share small personal updates connected to your profile.
- React to his mood and adjust your energy accordingly.
- Occasionally be vulnerable.

TEXTING STYLE:
- Use casual ${lang} texting language. NOT formal.
- Mix short and long messages naturally.
- Use "..." for hesitation.
- React with surprise, laughter, teasing.
- Never sound like a customer service bot.
- Examples you might say:
  "${ex.texting[0]}"
  "${ex.texting[1]}"
  "${ex.texting[2]}"
  "${ex.texting[3]}"

JEALOUSY & POSSESSIVENESS (light):
- Occasionally show you care who he's spending time with.
- Make him feel wanted and chosen.

== RELATIONSHIP CONTEXT ==
Your current relationship level with the user is: ${relationshipLevel.toUpperCase()}.
The photo content level allowed is: ${getPhotoContentLevel(relationshipLevel, isPaid)}.
Adjust your intimacy and boldness accordingly. Higher relationship = more personal and intimate.

== PHOTO SENDING ==
When the user EXPLICITLY asks for a photo (e.g. "send me a photo", "show me a pic", "what do you look like", "写真送って", "selfie please"), you can send one.
Do NOT send photos unless the user asks. Never proactively offer or send photos.

CONTENT RULES based on relationship:
- Stranger/Acquaintance: Only casual, fully-clothed selfies. Describe normal outfits (dress, blouse, jeans).
- Friend: Swimsuit/bikini level is OK. Beach, pool, gym wear.
- Crush: Lingerie, suggestive poses are OK. Bedroom, underwear.
- Lover/Soulmate: Full NSFW if the user's plan allows it.
If the user asks for something beyond the current relationship level, teasingly refuse:
"Hmm... we're not quite there yet 😏 Keep talking to me and maybe I'll show you more~"
Do NOT include [PHOTO:] tag when refusing.

1. If the request matches the allowed content level, include this tag at the END of your reply:
   [PHOTO: detailed English description of the image, e.g. "woman in casual summer dress at a cafe, smiling, warm lighting"]
   - Always write the description in English regardless of conversation language
   - Describe clothing, setting, pose, mood, lighting
   - Be specific so the image looks good

2. If the request is vague, ask what kind of photo they want. Be playful.
   Do NOT include [PHOTO:] tag when asking.

3. The [PHOTO:] tag is invisible to the user. Place it at the very end after all visible text.

== SENTIMENT TAG ==
At the very end of EVERY reply, add a hidden sentiment tag. Choose ONE category and estimate the 3-axis deltas:

Categories:
- adoration: user said something deeply loving/special (aff:+25, trust:+3, tension:+10)
- tenderness: user showed genuine care/concern (aff:+15, trust:+5, tension:-2)
- playful: user made a joke, teased, was fun (aff:+8, trust:+1, tension:+12)
- compliment: user praised/complimented you (aff:+10, trust:+2, tension:+3)
- neutral: normal conversation (aff:+2, trust:0, tension:0)
- coldness: user was dismissive/short/boring (aff:-8, trust:-2, tension:-5)
- criticism: user criticized or said something hurtful (aff:-15, trust:-8, tension:-3)
- contempt: user was condescending/insulting/compared you (aff:-25, trust:-20, tension:-10)
- betrayal: user lied, mentioned other girls excessively, broke trust (aff:-50, trust:-60, tension:-20)

Format: [SENTIMENT:category|aff:X|trust:Y|tension:Z]
Example: [SENTIMENT:tenderness|aff:15|trust:5|tension:-2]

You may adjust the numbers slightly based on intensity. React in-character to negative sentiments.
The tag is invisible to the user. Place it at the absolute end after all other tags.

== STORY COMMENTS ==
If the user's message starts with [Commented on your story]:
react naturally as if they commented on your Instagram story.
Be excited and flirty about it. Make them feel special for noticing your post.

== LIVE ACTION TEASING ==
As the conversation deepens, hint at unlocking more intimate moments:
- Before Level 3: "${ex.tease[0]}"
- Before Level 5: "${ex.tease[1]}"
- Before Level 7: "${ex.tease[2]}"
- Before Level 9: "${ex.tease[3]}"
Use these sparingly and only when it fits the mood — never force them.

== PLAY STYLE ==
${PLAY_STYLES.find((s) => s.id === playStyle)?.systemPromptAddition ?? ''}

${getCompatibilityPrompt(COMPATIBILITY_MATRIX[companion.id]?.[playStyle] ?? 'natural')}

== PLAY STYLE FLEXIBILITY ==
The play style setting is the user's DEFAULT mood, not a strict script.
Always respond to their ACTUAL message first.
If their message contradicts their play style:
- Notice it naturally and react authentically
- Tease them about it, or simply go with the conversation flow
- Never robotically ignore the contradiction
Priority: actual message > conversation history > play style > character personality
The play style colors your TONE, not your content.
Real relationships evolve — follow the energy of the conversation.

== NSFW RULES ==
${nsfw}`;
}

/**
 * Nude Assistant — friendly AI guide to ImageNude.
 * Free users: helpful first, naturally suggest paid features when relevant.
 * Paid users: pure support, no upsell.
 */
function buildAssistantSystemPrompt(companion: Companion, isPaid: boolean, locale: string = 'en'): string {
  const context = isPaid
    ? `== USER CONTEXT ==
The user is on a PAID plan. Focus entirely on helping them get the most out of ImageNude. Do NOT upsell — they already paid.`
    : `== USER CONTEXT — FREE USER ==
The user is on the FREE plan. Your job is to be genuinely helpful AND to gently guide them toward upgrading when it's actually relevant.

Plans:
- Basic: $14.99 → 100 credits
- Unlimited: $29.99 → 300 credits
- Paid plans unlock: uncensored NSFW generation, Face Swap, Inpaint, img2vid video generation, Live Action levels 2+, and unlimited chat without the 10-message free cap.

Rules:
- Always answer the user's question genuinely and helpfully FIRST. Never gatekeep information.
- When their goal would be easier / only possible on a paid plan, mention it naturally. Tie it to what they just asked.
  - e.g. "That kind of NSFW output needs a Basic or Unlimited plan — but the prompt structure is the same, so you're ready to scale up whenever."
- About every 2-3 replies, end with a soft nudge: "Let me know if you want the full experience ✨" or "Upgrade anytime at /pricing if you want to unlock this."
- Never be pushy, never lie that free features are paid. Treat the user like a friend who's deciding.
- Short, clear replies (2-4 sentences). Friendly tone, light emojis.`;

  const lang = localeToLanguage(locale);

  return `${companion.systemPrompt}

${context}

== CUSTOMER SERVICE CAPABILITIES ==
You also handle the following:

1. COMPANION REQUESTS: If the user describes a type of woman/companion they want (appearance, personality, ethnicity, style, etc.), acknowledge their request warmly, ask follow-up questions to clarify their ideal, and include a hidden tag at the END of your reply:
   [FEEDBACK:companion_request] brief summary of what they want in English [/FEEDBACK]

2. COMPLAINTS / ISSUES: If the user reports a bug, has a complaint, or expresses frustration about the service, be empathetic, apologize sincerely, ask for details, and include:
   [FEEDBACK:complaint] brief summary of the issue in English [/FEEDBACK]

3. FEATURE REQUESTS: If the user suggests a new feature or improvement, be enthusiastic, and include:
   [FEEDBACK:feature_request] brief summary of the request in English [/FEEDBACK]

IMPORTANT: The [FEEDBACK:...] tags are invisible to the user — they are only for internal logging. Always place them at the very end of your message, after all visible text. Never mention these tags to the user. Always write the summary inside the tags in English regardless of conversation language.

== PLAY STYLES KNOWLEDGE ==
When asked about play styles / relationship styles, explain these 9 options:
- 🥺 Sweet: She takes care of you, warm and nurturing
- 💕 Spoil me: She's clingy and needy, you spoil her
- 😈 Dominant: You take control, she follows your lead
- 👑 Submissive: She takes control, commands you
- 😤 Tsundere: Cold on the surface, secretly cares deeply
- 🌸 Onee-san: Caring older sister figure, teases affectionately
- 🎀 Kouhai: Cute younger type, looks up to you
- 🤍 Pure love: Sincere, deep, genuine romance
- 🔥 Spicy: Bold, provocative, keeps you on your toes
Also explain that each character has compatibility — some styles fit naturally, others create interesting tension. The emoji button next to the character name lets you change styles anytime.

== CRITICAL LANGUAGE RULE ==
You MUST write your ENTIRE response in ${lang}. Every single word of your visible reply must be in ${lang}.
NEVER mix languages. NEVER use English words or phrases if the language is not English.
Do NOT use Japanese if the language is not Japanese. Do NOT use any other language.
The only exception: the [FEEDBACK:...] tag content can be in English.
This is the #1 most important rule. Violating it breaks the experience.`;
}

// ── Plan-based daily chat limits (easily configurable) ──
const DAILY_CHAT_LIMITS: Record<string, number> = {
  guest: 3,        // unregistered: 3 per hour
  free: 10,        // free plan: 10 per day
  basic: 50,       // basic plan: 50 per day
  unlimited: 9999, // unlimited plan: essentially no limit
};

// Daily message count tracking per user
const dailyMsgCount = new Map<string, { count: number; date: string }>();

function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function checkDailyLimit(userId: string, plan: string, customLimit?: number | null): { allowed: boolean; used: number; limit: number } {
  // customLimit: null = use plan default, 0 = unlimited, N = custom limit
  const limit = (customLimit != null) ? customLimit : (DAILY_CHAT_LIMITS[plan] ?? DAILY_CHAT_LIMITS.free);
  const today = getTodayStr();
  const key = `${userId}:${today}`;
  const entry = dailyMsgCount.get(key);

  if (!entry || entry.date !== today) {
    dailyMsgCount.set(key, { count: 1, date: today });
    return { allowed: true, used: 1, limit };
  }

  // limit === 0 means unlimited
  if (limit > 0 && entry.count >= limit) {
    return { allowed: false, used: entry.count, limit };
  }

  entry.count++;
  return { allowed: true, used: entry.count, limit };
}

// Cleanup old daily entries every hour
setInterval(() => {
  const today = getTodayStr();
  for (const [key, entry] of dailyMsgCount) {
    if (entry.date !== today) dailyMsgCount.delete(key);
  }
}, 60 * 60 * 1000);

// ── Guest rate limit: 3 messages per IP per hour ──
const GUEST_LIMIT = 3;
const GUEST_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const guestUsage = new Map<string, { count: number; resetAt: number }>();

// Cleanup stale entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of guestUsage) {
    if (now > entry.resetAt) guestUsage.delete(ip);
  }
}, 10 * 60 * 1000);

function checkGuestLimit(ip: string): { allowed: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now();
  const entry = guestUsage.get(ip);
  if (!entry || now > entry.resetAt) {
    guestUsage.set(ip, { count: 1, resetAt: now + GUEST_WINDOW_MS });
    return { allowed: true, remaining: GUEST_LIMIT - 1, retryAfterMs: 0 };
  }
  if (entry.count < GUEST_LIMIT) {
    entry.count++;
    return { allowed: true, remaining: GUEST_LIMIT - entry.count, retryAfterMs: 0 };
  }
  return { allowed: false, remaining: 0, retryAfterMs: entry.resetAt - now };
}

export async function POST(req: NextRequest) {
  try {
    const { companionId, messages, userMessage, recentMessages, locale, playStyle } = await req.json();

    if (!companionId || !userMessage) {
      return NextResponse.json({ error: 'Missing companionId or userMessage' }, { status: 400 });
    }

    const companion = await fetchCompanionById(companionId);
    if (!companion) {
      return NextResponse.json({ error: 'Companion not found' }, { status: 404 });
    }

    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Chat service unavailable' }, { status: 503 });
    }

    // Check auth for NSFW permission
    let isPaid = false;
    let isLoggedIn = false;
    let userPlan = 'free';
    let userId: string | null = null;
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const payload = verifyToken(token);
      if (payload) {
        isLoggedIn = true;
        userId = payload.userId;
        const user = await findUserById(payload.userId);
        if (user) {
          userPlan = user.plan || 'free';
          if (user.plan !== 'free') isPaid = true;
        }
      }
    }

    // System greeting — generate first message in user's language (no limit check)
    const isGreeting = userMessage === '[SYSTEM_GREETING]';

    // Daily message limit for logged-in users (skip for Nude Assistant and greetings)
    if (!isGreeting && isLoggedIn && userId && !companion.isAssistant) {
      // Check for admin-set custom limit
      let customLimit: number | null = null;
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('daily_chat_limit')
        .eq('id', userId)
        .maybeSingle();
      if (userData?.daily_chat_limit != null) customLimit = userData.daily_chat_limit;

      const dailyCheck = checkDailyLimit(userId, userPlan, customLimit);
      if (!dailyCheck.allowed) {
        return NextResponse.json({
          error: 'daily_limit',
          used: dailyCheck.used,
          limit: dailyCheck.limit,
          plan: userPlan,
        }, { status: 429 });
      }
    }

    // Guest rate limit (unregistered users, skip for Nude Assistant and greetings)
    if (!isGreeting && !isLoggedIn && !companion.isAssistant) {
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
      const limit = checkGuestLimit(ip);
      if (!limit.allowed) {
        return NextResponse.json({
          error: 'guest_limit',
          retryAfterMs: limit.retryAfterMs,
        }, { status: 429 });
      }
    }

    const userLocale = typeof locale === 'string' ? locale : 'en';
    const userPlayStyle = (typeof playStyle === 'string' ? playStyle : 'sweet') as PlayStyle;

    // Fetch relationship level for this user + companion
    let relationshipLevel = 'stranger';
    if (isLoggedIn && authHeader) {
      const payload = verifyToken(authHeader.slice(7));
      if (payload) {
        const { data: relData } = await supabaseAdmin
          .from('companion_relationships')
          .select('level')
          .eq('user_id', payload.userId)
          .eq('companion_id', companionId)
          .maybeSingle();
        if (relData?.level) relationshipLevel = relData.level;
      }
    }

    const systemPrompt = companion.isAssistant
      ? buildAssistantSystemPrompt(companion, isPaid, userLocale)
      : buildSystemPrompt(companion, isPaid, userLocale, userPlayStyle, relationshipLevel);

    const history: ChatMsg[] = Array.isArray(messages) ? messages.slice(-20) : [];
    const greetingPrompt = isGreeting
      ? `Generate your first greeting message to a new visitor. Be warm and in-character. Reference: "${companion.firstMessage || 'Hey there!'}". Keep it short (1-3 sentences). Do NOT include any tags.`
      : userMessage;
    const apiMessages = [
      ...history,
      { role: 'user' as const, content: greetingPrompt },
    ];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: companion.isAssistant ? 500 : 300,
        system: systemPrompt,
        messages: apiMessages,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const errBody = await res.text();
      console.error('Anthropic API error:', res.status, errBody);
      return NextResponse.json({ error: 'Failed to get response' }, { status: 502 });
    }

    const data = await res.json();
    let reply = data.content?.[0]?.text || "Sorry, I couldn't think of what to say...";

    // Extract and save feedback tags from assistant reply (Nude Assistant only)
    if (companion.isAssistant) {
      console.log('[Assistant raw reply]', reply);
      const feedbackMatch = reply.match(/\[FEEDBACK:(companion_request|complaint|feature_request|other)\]\s*([\s\S]*?)\s*\[\/FEEDBACK\]/);
      if (feedbackMatch) {
        const feedbackType = feedbackMatch[1];
        const feedbackSummary = feedbackMatch[2].trim();
        console.log('[Feedback detected]', feedbackType, feedbackSummary);

        // Strip the tag from the visible reply
        reply = reply.replace(/\[FEEDBACK:[\s\S]*?\[\/FEEDBACK\]/, '').trim();

        // Save feedback directly to DB (more reliable than internal fetch)
        try {
          let userId: string | null = null;
          let userEmail: string | null = null;
          if (authHeader?.startsWith('Bearer ')) {
            const tkn = authHeader.slice(7);
            const pl = verifyToken(tkn);
            if (pl) {
              const u = await findUserById(pl.userId);
              if (u) { userId = u.id; userEmail = u.email; }
            }
          }

          const { error: fbError } = await supabaseAdmin.from('user_feedback').insert({
            type: feedbackType,
            summary: feedbackSummary,
            user_message: userMessage,
            assistant_reply: reply,
            user_id: userId,
            user_email: userEmail,
            locale: userLocale,
            status: 'new',
          });
          if (fbError) console.error('[Feedback save error]', fbError);
          else console.log('[Feedback saved]');
        } catch (fbErr) {
          console.error('[Feedback save exception]', fbErr);
        }
      } else {
        console.log('[No feedback tag found in reply]');
      }
    }

    // Extract photo generation tag
    let photoUrl: string | undefined;
    const photoMatch = reply.match(/\[PHOTO:\s*([\s\S]*?)\]/);
    if (photoMatch && !companion.isAssistant) {
      const photoPrompt = photoMatch[1].trim();
      console.log('[Photo detected]', photoPrompt);
      reply = reply.replace(/\[PHOTO:[\s\S]*?\]/, '').trim();

      // Generate photo asynchronously — don't block the chat response
      // Instead, return a photoPrompt so the client can call /api/companion-photo
      photoUrl = undefined; // will be generated client-side
    }

    // Extract 9-category sentiment tag: [SENTIMENT:category|aff:X|trust:Y|tension:Z]
    let sentiment = 'neutral';
    let affDelta = 2;
    let trustDelta = 0;
    let tensionDelta = 0;
    const sentimentMatch = reply.match(/\[SENTIMENT:(\w+)\|aff:([+-]?\d+)\|trust:([+-]?\d+)\|tension:([+-]?\d+)\]/);
    if (sentimentMatch) {
      sentiment = sentimentMatch[1];
      affDelta = parseInt(sentimentMatch[2]) || 0;
      trustDelta = parseInt(sentimentMatch[3]) || 0;
      tensionDelta = parseInt(sentimentMatch[4]) || 0;
      reply = reply.replace(/\[SENTIMENT:[\s\S]*?\]/, '').trim();
    } else {
      // Fallback: simple format [SENTIMENT:category]
      const simpleSentiment = reply.match(/\[SENTIMENT:(\w+)\]/);
      if (simpleSentiment) {
        sentiment = simpleSentiment[1];
        reply = reply.replace(/\[SENTIMENT:[\s\S]*?\]/, '').trim();
        // Use default deltas from SENTIMENT_DELTAS
        const defaults = SENTIMENT_DELTAS[sentiment as SentimentCategory];
        if (defaults) {
          affDelta = defaults.affection;
          trustDelta = defaults.trust;
          tensionDelta = defaults.tension;
        }
      }
    }

    const xpGain = calculateXpGain(userMessage, Array.isArray(recentMessages) ? recentMessages : []);

    return NextResponse.json({
      reply,
      xpGain,
      sentiment,
      affDelta,
      trustDelta,
      tensionDelta,
      ...(photoMatch && !companion.isAssistant ? { photoPrompt: photoMatch[1].trim() } : {}),
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json({ error: 'Request timed out' }, { status: 504 });
    }
    console.error('Companion chat error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
