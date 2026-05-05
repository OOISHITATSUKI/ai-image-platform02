import { NextRequest, NextResponse } from 'next/server';
import { uploadToR2, deleteFromR2 } from '@/lib/storage/r2';
import { validateVideoFile, type VideoType } from '@/lib/video/validator';
import { supabaseAdmin } from '@/lib/supabase-server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const videoType = (formData.get('videoType') as VideoType) || 'emotion';
    const characterId = formData.get('characterId') as string;
    const emotion = formData.get('emotion') as string | null;
    const variationIndex = formData.get('variationIndex') as string | null;
    const actionId = formData.get('actionId') as string | null;
    const variant = formData.get('variant') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (!characterId) {
      return NextResponse.json({ error: 'Missing characterId' }, { status: 400 });
    }

    // Validate
    const validation = validateVideoFile(
      { name: file.name, type: file.type, size: file.size },
      videoType,
    );
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 },
      );
    }

    // Build R2 key
    const ts = Date.now();
    let remoteKey: string;
    if (videoType === 'hover') {
      remoteKey = `videos/${characterId}/hover-${ts}.mp4`;
    } else if (emotion) {
      remoteKey = `videos/${characterId}/emotion/${emotion}-${variationIndex ?? 0}-${ts}.mp4`;
    } else if (actionId && variant) {
      remoteKey = `videos/${characterId}/liveaction/${actionId}-${variant}-${ts}.mp4`;
    } else {
      remoteKey = `videos/${characterId}/${videoType}-${ts}.mp4`;
    }

    // Upload to R2
    const buffer = Buffer.from(await file.arrayBuffer());
    const videoUrl = await uploadToR2(buffer, remoteKey, 'video/mp4');
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    console.log(`[video-upload] ${videoType} ${characterId}: ${sizeMB}MB → ${remoteKey} | emotion=${emotion} actionId=${actionId}`);

    // Save to DB based on video type
    if (videoType === 'hover') {
      const { error: dbErr, count } = await supabaseAdmin
        .from('companions')
        .update({ hover_video_url: videoUrl })
        .eq('id', characterId);

      if (dbErr) {
        console.error(`[video-upload] hover DB update failed for ${characterId}:`, dbErr);
        return NextResponse.json({ error: `DB update failed: ${dbErr.message}` }, { status: 500 });
      }
      console.log(`[video-upload] hover saved for ${characterId}: ${videoUrl} (rows: ${count})`);

      return NextResponse.json({ ok: true, videoUrl, sizeMB, warnings: validation.warnings });
    }

    if (emotion) {
      const idx = variationIndex ? parseInt(variationIndex) : 0;

      // Upsert: delete existing if any, then insert
      const { data: existing } = await supabaseAdmin
        .from('character_emotion_videos')
        .select('id, video_url')
        .eq('character_id', characterId)
        .eq('emotion', emotion)
        .eq('variation_index', idx)
        .maybeSingle();

      if (existing) {
        // Delete old from R2
        try {
          const oldKey = new URL(existing.video_url).pathname.slice(1);
          await deleteFromR2(oldKey);
        } catch {}
        await supabaseAdmin
          .from('character_emotion_videos')
          .delete()
          .eq('id', existing.id);
      }

      const { error } = await supabaseAdmin
        .from('character_emotion_videos')
        .insert({
          character_id: characterId,
          emotion,
          variation_index: idx,
          video_url: videoUrl,
          file_size_bytes: file.size,
        });

      if (error) {
        try { await deleteFromR2(remoteKey); } catch {}
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true, videoUrl, sizeMB, warnings: validation.warnings });
    }

    if (actionId && variant) {
      // Upsert live action video
      const { data: existing } = await supabaseAdmin
        .from('character_liveaction_videos')
        .select('id, video_url')
        .eq('character_id', characterId)
        .eq('action_id', actionId)
        .eq('variant', variant)
        .maybeSingle();

      if (existing) {
        try {
          const oldKey = new URL(existing.video_url).pathname.slice(1);
          await deleteFromR2(oldKey);
        } catch {}
        await supabaseAdmin
          .from('character_liveaction_videos')
          .delete()
          .eq('id', existing.id);
      }

      const { error } = await supabaseAdmin
        .from('character_liveaction_videos')
        .insert({
          character_id: characterId,
          action_id: actionId,
          variant,
          video_url: videoUrl,
          file_size_bytes: file.size,
        });

      if (error) {
        try { await deleteFromR2(remoteKey); } catch {}
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true, videoUrl, sizeMB, warnings: validation.warnings });
    }

    return NextResponse.json({ ok: true, videoUrl, sizeMB, warnings: validation.warnings });
  } catch (error) {
    console.error('[video-upload] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
