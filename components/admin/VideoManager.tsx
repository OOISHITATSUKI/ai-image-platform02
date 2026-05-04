'use client';

import React, { useEffect, useState } from 'react';
import { extractVideoMetadata, isCloseTo916 } from '@/lib/video/metadata';
import type { VideoType } from '@/lib/video/validator';

// ── Emotion definitions ──
const EMOTIONS = [
  { code: 'happy',        label: '😊 嬉しい',      unlockLevel: 0 },
  { code: 'shy',          label: '😳 恥ずかしい',  unlockLevel: 0 },
  { code: 'flirty',       label: '😉 いちゃいちゃ', unlockLevel: 20 },
  { code: 'greeting',     label: '👋 挨拶',        unlockLevel: 0 },
  { code: 'goodbye',      label: '👋 バイバイ',    unlockLevel: 0 },
  { code: 'pouty',        label: '😤 すねる',      unlockLevel: 0 },
  { code: 'sad',          label: '😢 悲しい',      unlockLevel: 0 },
  { code: 'angry',        label: '😠 怒る',        unlockLevel: 0 },
  { code: 'excited',      label: '🤩 興奮',        unlockLevel: 10 },
  { code: 'affectionate', label: '🥰 甘える',      unlockLevel: 30 },
] as const;

// ── Live Action slot definitions ──
const LIVE_ACTION_SLOTS = [
  { actionId: 'greeting',      variant: 'dressed',   label: 'Greeting — dressed',       level: 1 },
  { actionId: 'greeting',      variant: 'undressed', label: 'Greeting — undressed',     level: 1 },
  { actionId: 'sexy_tease',    variant: 'dressed',   label: 'Sexy tease — dressed',     level: 1 },
  { actionId: 'sexy_tease',    variant: 'undressed', label: 'Sexy tease — undressed',   level: 1 },
  { actionId: 'redress',       variant: 'off',       label: 'Re-dress → off',           level: 3 },
  { actionId: 'redress',       variant: 'on',        label: 'Re-dress → on',            level: 3 },
  { actionId: 'ahegao',        variant: 'undressed', label: 'Ahegao',                   level: 4 },
  { actionId: 'panty_tease',   variant: 'undressed', label: 'Panty tease',              level: 4 },
  { actionId: 'get_all_fours', variant: 'undressed', label: 'Get on all fours',         level: 4 },
  { actionId: 'beg_me',        variant: 'undressed', label: 'Beg me',                   level: 4 },
  { actionId: 'rub_tits',      variant: 'undressed', label: 'Rub your tits',            level: 4 },
  { actionId: 'bounce_ass',    variant: 'undressed', label: 'Bounce your ass',          level: 5 },
  { actionId: 'squirt',        variant: 'undressed', label: 'Squirt',                   level: 5 },
  { actionId: 'handjob',       variant: 'undressed', label: 'Handjob',                  level: 6 },
  { actionId: 'boobjob',       variant: 'undressed', label: 'Boobjob',                  level: 7 },
  { actionId: 'blowjob',       variant: 'undressed', label: 'Blowjob',                  level: 8 },
  { actionId: 'missionary',    variant: 'undressed', label: 'Missionary',               level: 9 },
  { actionId: 'blowjob_doggy', variant: 'undressed', label: 'Blowjob + Doggy',          level: 9 },
] as const;

interface Props {
  companionId: string;
}

interface EmotionVideo {
  id: string;
  emotion: string;
  variation_index: number;
  video_url: string;
  file_size_bytes: number;
}

interface LiveActionVideo {
  id: string;
  action_id: string;
  variant: string;
  video_url: string;
  file_size_bytes: number;
}

export default function VideoManager({ companionId }: Props) {
  const [hoverUrl, setHoverUrl] = useState<string | null>(null);
  const [emotionVideos, setEmotionVideos] = useState<EmotionVideo[]>([]);
  const [liveactionVideos, setLiveactionVideos] = useState<LiveActionVideo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVideos = async () => {
    try {
      const res = await fetch(`/api/admin/videos?characterId=${companionId}`);
      const data = await res.json();
      setHoverUrl(data.hoverVideoUrl ?? null);
      setEmotionVideos(data.emotionVideos ?? []);
      setLiveactionVideos(data.liveactionVideos ?? []);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVideos(); }, [companionId]);

  if (loading) return <div style={{ padding: 20, color: 'var(--text-tertiary)' }}>動画データ読み込み中...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ── Hover Video ── */}
      <fieldset style={fieldset}>
        <legend style={legend}>ホバー動画（ホーム画面）</legend>
        <p style={hint}>推奨: 9:16, 3-5秒, 2MB以下, MP4のみ</p>
        <VideoSlot
          companionId={companionId}
          videoType="hover"
          currentUrl={hoverUrl}
          onSuccess={fetchVideos}
        />
      </fieldset>

      {/* ── Emotion Videos ── */}
      <fieldset style={fieldset}>
        <legend style={legend}>感情動画（チャット連動 × 3バリエーション）</legend>
        <p style={hint}>推奨: 9:16, 3-5秒, 3MB以下, MP4のみ</p>
        {EMOTIONS.map((emo) => (
          <div key={emo.code} style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{emo.label}</span>
              <span style={levelBadge}>Lv {emo.unlockLevel}+</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {[0, 1, 2].map((idx) => {
                const existing = emotionVideos.find(
                  (v) => v.emotion === emo.code && v.variation_index === idx,
                );
                return (
                  <VideoSlot
                    key={`${emo.code}-${idx}`}
                    companionId={companionId}
                    videoType="emotion"
                    emotion={emo.code}
                    variationIndex={idx}
                    currentUrl={existing?.video_url ?? null}
                    videoId={existing?.id}
                    label={`#${idx + 1}`}
                    onSuccess={fetchVideos}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </fieldset>

      {/* ── Live Action Videos ── */}
      <fieldset style={fieldset}>
        <legend style={legend}>Live Action動画（R2管理）</legend>
        <p style={hint}>推奨: 9:16, MP4のみ, 15MB以下</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 10 }}>
          {LIVE_ACTION_SLOTS.map((slot) => {
            const existing = liveactionVideos.find(
              (v) => v.action_id === slot.actionId && v.variant === slot.variant,
            );
            return (
              <VideoSlot
                key={`${slot.actionId}-${slot.variant}`}
                companionId={companionId}
                videoType="liveaction"
                actionId={slot.actionId}
                variant={slot.variant}
                currentUrl={existing?.video_url ?? null}
                videoId={existing?.id}
                label={`Lv${slot.level} ${slot.label}`}
                onSuccess={fetchVideos}
              />
            );
          })}
        </div>
      </fieldset>

      {/* ── Storage Stats ── */}
      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', padding: '8px 0' }}>
        合計: ホバー {hoverUrl ? 1 : 0} / 感情 {emotionVideos.length}/30 / Live Action {liveactionVideos.length}/{LIVE_ACTION_SLOTS.length}
        {' '}| 合計サイズ: {((emotionVideos.reduce((s, v) => s + (v.file_size_bytes || 0), 0) + liveactionVideos.reduce((s, v) => s + (v.file_size_bytes || 0), 0)) / (1024 * 1024)).toFixed(1)}MB
      </div>
    </div>
  );
}

// ── Single Video Upload Slot ──

interface VideoSlotProps {
  companionId: string;
  videoType: VideoType;
  emotion?: string;
  variationIndex?: number;
  actionId?: string;
  variant?: string;
  currentUrl: string | null;
  videoId?: string;
  label?: string;
  onSuccess: () => void;
}

function VideoSlot({
  companionId, videoType, emotion, variationIndex, actionId, variant,
  currentUrl, videoId, label, onSuccess,
}: VideoSlotProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    setError(null);

    if (!file.type.startsWith('video/mp4') && file.type !== 'video/mp4') {
      setError('MP4のみ対応');
      return;
    }

    try {
      const meta = await extractVideoMetadata(file);
      if (!isCloseTo916(meta)) {
        if (!confirm(`アスペクト比が9:16ではありません (${meta.width}×${meta.height})。続行しますか？`)) return;
      }
    } catch {}

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('videoType', videoType);
      fd.append('characterId', companionId);
      if (emotion) fd.append('emotion', emotion);
      if (variationIndex !== undefined) fd.append('variationIndex', String(variationIndex));
      if (actionId) fd.append('actionId', actionId);
      if (variant) fd.append('variant', variant);

      const res = await fetch('/api/admin/videos/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.details?.join(', ') || 'Upload failed');
      onSuccess();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!videoId && videoType === 'hover') {
      // Clear hover_video_url
      await fetch(`/api/admin/companions/${companionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companion: { hover_video_url: null } }),
      });
      onSuccess();
      return;
    }
    if (!videoId) return;
    if (!confirm('この動画を削除しますか？')) return;
    await fetch(`/api/admin/videos/${videoId}`, { method: 'DELETE' });
    onSuccess();
  };

  return (
    <div style={slotBox}>
      {label && <div style={slotLabel}>{label}</div>}
      <div style={slotPreview}>
        {currentUrl ? (
          <video
            src={currentUrl}
            muted loop playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onMouseEnter={(e) => (e.currentTarget as HTMLVideoElement).play().catch(() => {})}
            onMouseLeave={(e) => { (e.currentTarget as HTMLVideoElement).pause(); e.currentTarget.currentTime = 0; }}
          />
        ) : (
          <div style={slotEmpty}>{uploading ? '...' : 'No video'}</div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        <label style={{ ...slotBtn, flex: 1 }}>
          {uploading ? 'Uploading...' : currentUrl ? 'Replace' : 'Upload'}
          <input
            type="file"
            accept="video/mp4"
            style={{ display: 'none' }}
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
              e.target.value = '';
            }}
          />
        </label>
        {currentUrl && (
          <button style={{ ...slotBtn, background: 'rgba(255,50,50,0.15)', borderColor: 'rgba(255,50,50,0.4)', color: '#ff8080' }} onClick={handleDelete}>
            ×
          </button>
        )}
      </div>
      {error && <div style={{ color: '#ff8080', fontSize: '0.68rem' }}>{error}</div>}
    </div>
  );
}

// ── Styles ──
const fieldset: React.CSSProperties = {
  border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 16,
};
const legend: React.CSSProperties = {
  padding: '0 8px', fontSize: '0.9rem', color: '#a68fff', fontWeight: 600,
};
const hint: React.CSSProperties = {
  fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: 12, marginTop: 0,
};
const levelBadge: React.CSSProperties = {
  background: 'rgba(124,92,252,0.2)', color: '#a68fff', borderRadius: 4,
  padding: '1px 6px', fontSize: '0.65rem', fontWeight: 700,
};
const slotBox: React.CSSProperties = {
  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: 8,
  display: 'flex', flexDirection: 'column', gap: 6, background: 'rgba(255,255,255,0.02)',
};
const slotLabel: React.CSSProperties = {
  fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 500, textAlign: 'center',
};
const slotPreview: React.CSSProperties = {
  aspectRatio: '9/16', width: '100%', maxWidth: 90, background: '#000',
  borderRadius: 6, overflow: 'hidden', alignSelf: 'center',
};
const slotEmpty: React.CSSProperties = {
  width: '100%', height: '100%', display: 'flex', alignItems: 'center',
  justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: '0.65rem', background: '#1a1a2e',
};
const slotBtn: React.CSSProperties = {
  padding: '5px 8px', borderRadius: 5, border: '1px solid rgba(124,92,252,0.4)',
  background: 'rgba(124,92,252,0.15)', color: 'var(--text-primary)',
  fontSize: '0.7rem', cursor: 'pointer', textAlign: 'center',
};
