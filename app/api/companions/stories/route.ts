import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

/**
 * GET /api/companions/stories — all published stories with like/comment counts
 */
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('companion_stories')
      .select('*, story_likes(count), story_comments(count)')
      .eq('is_published', true)
      .order('sort_order', { ascending: true });

    if (error) {
      // Fallback without counts if join fails (tables may not exist yet)
      const { data: fallback } = await supabaseAdmin
        .from('companion_stories')
        .select('*')
        .eq('is_published', true)
        .order('sort_order', { ascending: true });
      return NextResponse.json({ stories: fallback ?? [] });
    }

    // Flatten counts
    const stories = (data ?? []).map((s: Record<string, unknown>) => ({
      ...s,
      real_likes: Array.isArray(s.story_likes) ? (s.story_likes as { count: number }[])[0]?.count ?? 0 : 0,
      real_comments: Array.isArray(s.story_comments) ? (s.story_comments as { count: number }[])[0]?.count ?? 0 : 0,
      story_likes: undefined,
      story_comments: undefined,
    }));

    return NextResponse.json({ stories });
  } catch {
    return NextResponse.json({ stories: [] });
  }
}
