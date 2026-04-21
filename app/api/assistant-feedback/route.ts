import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { verifyToken, findUserById } from '@/lib/auth';

/**
 * POST /api/assistant-feedback
 * Called by the companion-chat API when the Nude Assistant detects
 * a companion request, complaint, or feature request.
 */
export async function POST(req: NextRequest) {
  try {
    const { type, summary, userMessage, assistantReply, locale } = await req.json();

    if (!type || !summary || !userMessage) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Extract user info from auth token
    let userId: string | null = null;
    let userEmail: string | null = null;
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const payload = verifyToken(token);
      if (payload) {
        const user = await findUserById(payload.userId);
        if (user) {
          userId = user.id;
          userEmail = user.email;
        }
      }
    }

    const { error } = await supabaseAdmin.from('user_feedback').insert({
      type,
      summary,
      user_message: userMessage,
      assistant_reply: assistantReply || null,
      user_id: userId,
      user_email: userEmail,
      locale: locale || 'en',
      status: 'new',
    });

    if (error) {
      console.error('Failed to save feedback:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('assistant-feedback error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
