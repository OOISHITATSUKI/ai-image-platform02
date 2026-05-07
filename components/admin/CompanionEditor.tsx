'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Companion } from '@/lib/companions';
import AvatarCropModal from '@/components/admin/AvatarCropModal';
import VideoManager from '@/components/admin/VideoManager';

interface Props {
  mode: 'new' | 'edit';
  companionId?: string;
}

interface VideoSlotDef {
  actionId: string;
  variant: 'dressed' | 'undressed' | 'off' | 'on';
  label: string;
  level?: number;
}

const LIVE_VIDEO_SLOTS: VideoSlotDef[] = [
  { actionId: 'greeting',      variant: 'dressed',   label: 'Greeting — dressed',   level: 1 },
  { actionId: 'greeting',      variant: 'undressed', label: 'Greeting — undressed', level: 1 },
  { actionId: 'sexy_tease',    variant: 'dressed',   label: 'Sexy tease — dressed', level: 1 },
  { actionId: 'sexy_tease',    variant: 'undressed', label: 'Sexy tease — undressed', level: 1 },
  { actionId: 'redress',       variant: 'off',       label: 'Re-dress → off (脱ぐ)', level: 3 },
  { actionId: 'redress',       variant: 'on',        label: 'Re-dress → on (着る)',  level: 3 },
  { actionId: 'ahegao',        variant: 'undressed', label: 'Ahegao',          level: 4 },
  { actionId: 'panty_tease',   variant: 'undressed', label: 'Panty tease',     level: 4 },
  { actionId: 'get_all_fours', variant: 'undressed', label: 'Get on all fours', level: 4 },
  { actionId: 'beg_me',        variant: 'undressed', label: 'Beg me',          level: 4 },
  { actionId: 'rub_tits',      variant: 'undressed', label: 'Rub your tits',   level: 4 },
  { actionId: 'bounce_ass',    variant: 'undressed', label: 'Bounce your ass', level: 5 },
  { actionId: 'squirt',        variant: 'undressed', label: 'Squirt',          level: 5 },
  { actionId: 'handjob',       variant: 'undressed', label: 'Handjob',         level: 6 },
  { actionId: 'boobjob',       variant: 'undressed', label: 'Boobjob',         level: 7 },
  { actionId: 'blowjob',       variant: 'undressed', label: 'Blowjob',         level: 8 },
  { actionId: 'missionary',    variant: 'undressed', label: 'Missionary',      level: 9 },
  { actionId: 'blowjob_doggy', variant: 'undressed', label: 'Blowjob + Doggy', level: 9 },
];

function LiveVideoSlot({
  companionId,
  slot,
}: {
  companionId: string;
  slot: VideoSlotDef;
}) {
  const baseUrl = `/companions/videos/${companionId}-${slot.actionId}-${slot.variant}.mp4`;
  const [cacheBust, setCacheBust] = useState<string>('initial');
  const [exists, setExists] = useState<boolean | null>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const urlWithBust = cacheBust === 'initial' ? baseUrl : `${baseUrl}?v=${cacheBust}`;

  useEffect(() => {
    let cancelled = false;
    fetch(baseUrl, { method: 'HEAD' })
      .then((r) => { if (!cancelled) setExists(r.ok); })
      .catch(() => { if (!cancelled) setExists(false); });
    return () => { cancelled = true; };
  }, [baseUrl]);

  const handleUpload = async (file: File) => {
    if (!companionId) {
      setErr('Save the companion first so it has an ID');
      return;
    }
    setUploading(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.append('video', file);
      fd.append('companionId', companionId);
      fd.append('actionId', slot.actionId);
      fd.append('variant', slot.variant);
      // NOTE: do NOT set Content-Type manually — the browser adds the
      // required multipart boundary automatically when body is FormData.
      const res = await fetch('/api/admin/upload-companion-video', {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setCacheBust(String(Date.now()));
      setExists(true);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={slotBox}>
      <div style={slotLabel}>
        {slot.level != null && <span style={slotLevel}>Lv{slot.level}</span>}
        <span>{slot.label}</span>
      </div>

      <div style={slotPreview}>
        {exists === null ? (
          <div style={slotEmpty}>…</div>
        ) : exists ? (
          <video
            key={urlWithBust}
            src={urlWithBust}
            muted
            loop
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onMouseEnter={(e) => (e.currentTarget as HTMLVideoElement).play().catch(() => {})}
            onMouseLeave={(e) => (e.currentTarget as HTMLVideoElement).pause()}
          />
        ) : (
          <div style={slotEmpty}>No video</div>
        )}
      </div>

      <label style={slotUploadBtn}>
        {uploading ? 'Uploading...' : exists ? 'Replace' : 'Upload'}
        <input
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          style={{ display: 'none' }}
          disabled={uploading || !companionId}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f);
            e.target.value = '';
          }}
        />
      </label>

      {err && <div style={slotError}>{err}</div>}
    </div>
  );
}

const slotBox: React.CSSProperties = {
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  padding: 10,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  background: 'rgba(255,255,255,0.02)',
};

const slotLabel: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  fontSize: '0.78rem',
  color: 'var(--text-primary)',
  fontWeight: 500,
};

const slotLevel: React.CSSProperties = {
  background: 'rgba(124,92,252,0.2)',
  color: '#a68fff',
  borderRadius: 4,
  padding: '1px 6px',
  fontSize: '0.65rem',
  fontWeight: 700,
};

const slotPreview: React.CSSProperties = {
  aspectRatio: '9/16',
  width: '100%',
  maxWidth: 90,
  background: '#000',
  borderRadius: 6,
  overflow: 'hidden',
  alignSelf: 'center',
};

const slotEmpty: React.CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--text-tertiary)',
  fontSize: '0.7rem',
  background: '#1a1a2e',
};

const slotUploadBtn: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 5,
  border: '1px solid rgba(124,92,252,0.4)',
  background: 'rgba(124,92,252,0.15)',
  color: 'var(--text-primary)',
  fontSize: '0.75rem',
  cursor: 'pointer',
  textAlign: 'center',
};

const slotError: React.CSSProperties = {
  color: '#ff8080',
  fontSize: '0.7rem',
  marginTop: 2,
};

type StatusV = 'draft' | 'published' | 'hidden' | 'archived';

const emptyCompanion: Companion = {
  id: '',
  name: '',
  age: 22,
  personality: 'playful',
  artStyle: 'realistic',
  tagline: '',
  description: '',
  avatarUrl: '',
  galleryUrls: [],
  systemPrompt: '',
  tags: [],
  isPremium: false,
  isNew: true,
  liveActions: [],
};

export default function CompanionEditor({ mode, companionId }: Props) {
  const router = useRouter();
  const [c, setC] = useState<Companion>(emptyCompanion);
  const [status, setStatus] = useState<StatusV>('draft');
  const [sortOrder, setSortOrder] = useState(999);
  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [tagsText, setTagsText] = useState('');
  const [cropSrc, setCropSrc] = useState<{ src: string; slot: 'avatar' | 'g1' | 'g2' | 'g3' | 'storyThumb' } | null>(null);

  // Stories state
  interface StoryRow { id: string; media_url: string; media_type: string; duration_seconds: number; caption: string | null; sort_order: number; base_likes: number; base_comments: number; }
  const [stories, setStories] = useState<StoryRow[]>([]);
  const [storiesLoading, setStoriesLoading] = useState(false);

  const loadStories = async (cid: string) => {
    setStoriesLoading(true);
    try {
      const res = await fetch(`/api/admin/companions/${cid}/stories`);
      const data = await res.json();
      setStories(data.stories ?? []);
    } catch {} finally { setStoriesLoading(false); }
  };

  useEffect(() => {
    if (mode === 'edit' && companionId) loadStories(companionId);
  }, [mode, companionId]);

  useEffect(() => {
    if (mode !== 'edit' || !companionId) return;
    (async () => {
      try {
        const res = await fetch(`/api/admin/companions/${companionId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed');
        setC(data.companion);
        setStatus(data.status);
        setSortOrder(data.sort_order);
        setTagsText((data.companion.tags ?? []).join(', '));
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, [mode, companionId]);

  const set = <K extends keyof Companion>(k: K, v: Companion[K]) => {
    setC((prev) => ({ ...prev, [k]: v }));
  };

  const setProfile = <K extends keyof NonNullable<Companion['profile']>>(
    k: K, v: string,
  ) => {
    setC((prev) => ({
      ...prev,
      profile: {
        ...(prev.profile ?? {
          hometown: '', occupation: '', favoriteFood: '', hatedFood: '',
          music: '', movies: '', hobbies: '', catchphrase: '',
        }),
        [k]: v,
      },
    }));
  };

  /** Auto-crop an image to a 400x400 square (center-x, top-y for portrait) */
  const autoSquareCrop = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const SIZE = 400;
        const canvas = document.createElement('canvas');
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext('2d')!;

        const side = Math.min(img.width, img.height);
        // Horizontal: center crop. Vertical: top crop (face is usually at top)
        const sx = (img.width - side) / 2;
        const sy = img.height > img.width ? 0 : (img.height - side) / 2;

        ctx.drawImage(img, sx, sy, side, side, 0, 0, SIZE, SIZE);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Canvas toBlob failed'));
        }, 'image/jpeg', 0.92);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  /** Upload a blob as companion image */
  const uploadBlob = async (blob: Blob, companionId: string): Promise<string> => {
    const f = new File([blob], `cropped-${Date.now()}.webp`, { type: 'image/webp' });
    const fd = new FormData();
    fd.append('file', f);
    fd.append('companionId', companionId);
    const res = await fetch('/api/admin/upload-companion-image', { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data.url;
  };

  // Step 1: user picks file → show crop modal
  const handleFileSelect = (file: File, slot: 'avatar' | 'g1' | 'g2' | 'g3' | 'storyThumb') => {
    const url = URL.createObjectURL(file);
    setCropSrc({ src: url, slot });
  };

  // Step 2: after crop → upload the cropped blob
  const handleCroppedUpload = async (blob: Blob, slot: 'avatar' | 'g1' | 'g2' | 'g3' | 'storyThumb') => {
    setCropSrc(null);
    setUploading(true);
    try {
      const file = new File([blob], `cropped-${Date.now()}.webp`, { type: 'image/webp' });
      const fd = new FormData();
      fd.append('file', file);
      fd.append('companionId', c.id || 'new');
      const res = await fetch('/api/admin/upload-companion-image', {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      if (slot === 'storyThumb') {
        set('storyThumbnailUrl', data.url);
      } else if (slot === 'avatar') {
        set('avatarUrl', data.url);
      } else {
        const idx = slot === 'g1' ? 0 : slot === 'g2' ? 1 : 2;
        const next = [...(c.galleryUrls ?? [])];
        next[idx] = data.url;
        set('galleryUrls', next);
      }
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // Stories upload — supports both images and videos
  const handleStoryUpload = async (file: File) => {
    if (!companionId) return;
    setUploading(true);
    try {
      const isVideo = file.type.startsWith('video/');
      const fd = new FormData();

      let uploadUrl: string;
      if (isVideo) {
        fd.append('video', file);
        fd.append('companionId', companionId);
        fd.append('actionId', 'story');
        fd.append('variant', `${Date.now()}`);
        uploadUrl = '/api/admin/upload-companion-video';
      } else {
        fd.append('file', file);
        fd.append('companionId', companionId);
        uploadUrl = '/api/admin/upload-companion-image';
      }

      const res = await fetch(uploadUrl, { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      // For videos, get actual duration
      let duration = 5;
      if (isVideo) {
        duration = await new Promise<number>((resolve) => {
          const video = document.createElement('video');
          video.preload = 'metadata';
          video.onloadedmetadata = () => { resolve(Math.round(video.duration) || 5); URL.revokeObjectURL(video.src); };
          video.onerror = () => resolve(5);
          video.src = URL.createObjectURL(file);
        });
      }

      await fetch(`/api/admin/companions/${companionId}/stories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ media_url: data.url, media_type: isVideo ? 'video' : 'image', duration_seconds: duration }),
      });
      loadStories(companionId);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteStory = async (storyId: string) => {
    if (!confirm('このStoryを削除しますか？')) return;
    await fetch(`/api/admin/stories/${storyId}`, { method: 'DELETE' });
    if (companionId) loadStories(companionId);
  };

  const handleUpdateStory = async (storyId: string, updates: Record<string, unknown>) => {
    await fetch(`/api/admin/stories/${storyId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (companionId) loadStories(companionId);
  };

  const handleSave = async () => {
    setSaving(true);
    setErr(null);
    try {
      // Commit tag text
      const tags = tagsText.split(',').map((t) => t.trim()).filter(Boolean);
      const payload: Companion = { ...c, tags };
      if (!payload.id) throw new Error('ID is required');
      if (!payload.name) throw new Error('Name is required');

      const url = mode === 'new' ? '/api/admin/companions' : `/api/admin/companions/${companionId}`;
      const method = mode === 'new' ? 'POST' : 'PUT';
      const body = JSON.stringify({ companion: payload, status, sortOrder });

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      router.push('/admin/companions');
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <div style={{ maxWidth: 780 }}>
      <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: 20 }}>
        {mode === 'new' ? '新規キャラクター' : `編集: ${c.name || c.id}`}
      </h1>

      {err && <div style={{ background: '#5a1a1a', color: '#fff', padding: 12, borderRadius: 8, marginBottom: 16 }}>{err}</div>}

      <FormRow label="ID (a-z, 0-9, -)"><input style={input} value={c.id} disabled={mode === 'edit'} onChange={(e) => set('id', e.target.value.replace(/[^a-z0-9-]/g, ''))} placeholder="luna" /></FormRow>
      <FormRow label="名前"><input style={input} value={c.name} onChange={(e) => set('name', e.target.value)} /></FormRow>
      <FormRow label="年齢"><input type="number" style={input} value={c.age} onChange={(e) => set('age', parseInt(e.target.value) || 0)} /></FormRow>
      <FormRow label="性格">
        <select style={input} value={c.personality} onChange={(e) => set('personality', e.target.value as Companion['personality'])}>
          <option value="playful">Playful</option>
          <option value="shy">Shy</option>
          <option value="dominant">Dominant</option>
          <option value="caring">Caring</option>
          <option value="mysterious">Mysterious</option>
        </select>
      </FormRow>
      <FormRow label="アートスタイル">
        <select style={input} value={c.artStyle || 'realistic'} onChange={(e) => set('artStyle', e.target.value)}>
          <option value="realistic">📷 Realistic（実写風）</option>
          <option value="anime">🎨 Anime（アニメ風）</option>
        </select>
      </FormRow>
      <FormRow label="Tagline (ホームカード)">
        <input style={input} value={c.tagline} onChange={(e) => set('tagline', e.target.value)} placeholder="Your college classmate who..." />
      </FormRow>
      <FormRow label="Description (プロフィール)">
        <textarea style={{ ...input, minHeight: 80 }} value={c.description} onChange={(e) => set('description', e.target.value)} />
      </FormRow>
      <FormRow label="Relationship (英語・性格の文脈)">
        <input style={input} value={c.relationship ?? ''} onChange={(e) => set('relationship', e.target.value)} />
      </FormRow>
      <FormRow label="Personality Description">
        <textarea style={{ ...input, minHeight: 60 }} value={c.personalityDescription ?? ''} onChange={(e) => set('personalityDescription', e.target.value)} />
      </FormRow>
      <FormRow label="First Message (フォールバック用)">
        <textarea style={{ ...input, minHeight: 40, fontSize: '0.8rem' }} value={c.firstMessage ?? ''} onChange={(e) => set('firstMessage', e.target.value)} placeholder="グリーティングシーケンス未設定時に使用" />
      </FormRow>

      {/* LINE-style Greeting Sequence Builder */}
      <fieldset style={{ ...fieldset, borderColor: 'rgba(255,77,141,0.2)' }}>
        <legend style={{ ...legend, color: '#ff4d8d' }}>💬 グリーティングシーケンス（LINE風）</legend>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 0, marginBottom: 12 }}>
          初めてチャットを開いた時に順番に表示されるメッセージ。テキスト・画像・動画を自由に組み合わせ可能。
        </p>
        <GreetingSequenceBuilder
          sequence={c.greetingSequence ?? []}
          onChange={(seq) => set('greetingSequence', seq.length > 0 ? seq : undefined)}
        />
      </fieldset>
      <FormRow label="System Prompt (AI人格の核)">
        <textarea style={{ ...input, minHeight: 140, fontFamily: 'monospace', fontSize: '0.82rem' }} value={c.systemPrompt} onChange={(e) => set('systemPrompt', e.target.value)} />
      </FormRow>

      <fieldset style={fieldset}>
        <legend style={legend}>詳細プロフィール</legend>
        <FormRow label="出身地"><input style={input} value={c.profile?.hometown ?? ''} onChange={(e) => setProfile('hometown', e.target.value)} /></FormRow>
        <FormRow label="職業"><input style={input} value={c.profile?.occupation ?? ''} onChange={(e) => setProfile('occupation', e.target.value)} /></FormRow>
        <FormRow label="好きな食べ物"><input style={input} value={c.profile?.favoriteFood ?? ''} onChange={(e) => setProfile('favoriteFood', e.target.value)} /></FormRow>
        <FormRow label="嫌いなもの"><input style={input} value={c.profile?.hatedFood ?? ''} onChange={(e) => setProfile('hatedFood', e.target.value)} /></FormRow>
        <FormRow label="音楽"><input style={input} value={c.profile?.music ?? ''} onChange={(e) => setProfile('music', e.target.value)} /></FormRow>
        <FormRow label="映画"><input style={input} value={c.profile?.movies ?? ''} onChange={(e) => setProfile('movies', e.target.value)} /></FormRow>
        <FormRow label="趣味"><input style={input} value={c.profile?.hobbies ?? ''} onChange={(e) => setProfile('hobbies', e.target.value)} /></FormRow>
        <FormRow label="口癖"><input style={input} value={c.profile?.catchphrase ?? ''} onChange={(e) => setProfile('catchphrase', e.target.value)} /></FormRow>
      </fieldset>

      <fieldset style={fieldset}>
        <legend style={legend}>外見 (画像生成用)</legend>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: 12, marginTop: 0 }}>
          これらの属性はAI画像生成のプロンプトに使用されます。変更すると次の画像から反映されます。
        </p>
        <FormRow label="体型 (例: slim, athletic, curvy, petite)"><input style={input} value={c.profile?.bodyType ?? ''} onChange={(e) => setProfile('bodyType', e.target.value)} /></FormRow>
        <FormRow label="バスト (例: small, medium, large, extra large)"><input style={input} value={c.profile?.breastSize ?? ''} onChange={(e) => setProfile('breastSize', e.target.value)} /></FormRow>
        <FormRow label="髪色 (例: blonde, brunette, black, pink)"><input style={input} value={c.profile?.hairColor ?? ''} onChange={(e) => setProfile('hairColor', e.target.value)} /></FormRow>
        <FormRow label="髪型 (例: long straight, short bob, twin tails)"><input style={input} value={c.profile?.hairStyle ?? ''} onChange={(e) => setProfile('hairStyle', e.target.value)} /></FormRow>
        <FormRow label="肌色 (例: fair, olive, tan, dark)"><input style={input} value={c.profile?.skinTone ?? ''} onChange={(e) => setProfile('skinTone', e.target.value)} /></FormRow>
        <FormRow label="身長 (例: 162cm)"><input style={input} value={c.profile?.height ?? ''} onChange={(e) => setProfile('height', e.target.value)} /></FormRow>
        <FormRow label="特徴 (例: mole under eye, freckles)"><input style={input} value={c.profile?.specialFeatures ?? ''} onChange={(e) => setProfile('specialFeatures', e.target.value)} /></FormRow>
      </fieldset>

      <fieldset style={fieldset}>
        <legend style={legend}>画像</legend>
        <FormRow label="アバターURL">
          <div style={{ display: 'flex', gap: 8 }}>
            <input style={{ ...input, flex: 1 }} value={c.avatarUrl} onChange={(e) => set('avatarUrl', e.target.value)} />
            <label style={uploadBtn}>
              アップロード
              <input type="file" accept="image/*" style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  e.target.value = '';
                  setUploading(true);
                  const fd = new FormData();
                  fd.append('file', file);
                  fd.append('companionId', c.id || 'new');
                  fetch('/api/admin/upload-companion-image', { method: 'POST', body: fd })
                    .then(r => r.json())
                    .then(data => { if (data.url) set('avatarUrl', data.url); })
                    .catch(err => alert(err instanceof Error ? err.message : 'Upload failed'))
                    .finally(() => setUploading(false));
                }} />
            </label>
          </div>
        </FormRow>
        {c.avatarUrl && <img src={c.avatarUrl} alt="avatar" style={{ width: 80, height: 142, objectFit: 'contain', borderRadius: 4, marginBottom: 12, background: '#000' }} />}

        {([0, 1, 2] as const).map((i) => (
          <FormRow key={i} label={`Gallery ${i + 1}`}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input style={{ ...input, flex: 1 }}
                value={c.galleryUrls?.[i] ?? ''}
                onChange={(e) => {
                  const next = [...(c.galleryUrls ?? [])];
                  next[i] = e.target.value;
                  set('galleryUrls', next);
                }}
              />
              <label style={uploadBtn}>
                アップロード
                <input type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    e.target.value = '';
                    setUploading(true);
                    const fd = new FormData();
                    fd.append('file', file);
                    fd.append('companionId', c.id || 'new');
                    fetch('/api/admin/upload-companion-image', { method: 'POST', body: fd })
                      .then(r => r.json())
                      .then(data => {
                        if (data.url) {
                          const next = [...(c.galleryUrls ?? [])];
                          next[i] = data.url;
                          set('galleryUrls', next);
                        }
                      })
                      .catch(err => alert(err instanceof Error ? err.message : 'Upload failed'))
                      .finally(() => setUploading(false));
                  }} />
              </label>
            </div>
          </FormRow>
        ))}
      </fieldset>

      {!c.isAssistant && mode === 'edit' && companionId && (
        <VideoManager companionId={companionId} />
      )}
      {!c.isAssistant && mode === 'new' && (
        <fieldset style={fieldset}>
          <legend style={legend}>動画管理</legend>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
            基本情報を保存してから、動画をアップロードできます。
          </p>
        </fieldset>
      )}

      <fieldset style={fieldset}>
        <legend style={legend}>タグ & メタ</legend>
        <FormRow label="タグ（カンマ区切り）">
          <input style={input} value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="gamer, college, playful" />
        </FormRow>
        <FormRow label="表示順 (sort_order)">
          <input type="number" style={input} value={sortOrder} onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)} />
        </FormRow>
        <FormRow label="状態">
          <select style={input} value={status} onChange={(e) => setStatus(e.target.value as StatusV)}>
            <option value="draft">📝 draft</option>
            <option value="published">✅ published</option>
            <option value="hidden">🙈 hidden</option>
            <option value="archived">📦 archived</option>
          </select>
        </FormRow>
        <FormRow label="Newバッジ">
          <label><input type="checkbox" checked={c.isNew} onChange={(e) => set('isNew', e.target.checked)} /> 表示する</label>
        </FormRow>
        <FormRow label="Premium">
          <label><input type="checkbox" checked={c.isPremium} onChange={(e) => set('isPremium', e.target.checked)} /> 有料ユーザーのみ</label>
        </FormRow>
        <FormRow label="Live Action機能">
          <label>
            <input
              type="checkbox"
              checked={c.liveActionEnabled !== false}
              onChange={(e) => set('liveActionEnabled', e.target.checked)}
            />{' '}
            有効にする（OFFにするとこのキャラではLive Actionが表示されなくなる）
          </label>
        </FormRow>
      </fieldset>

      {/* Stories Section */}
      {mode === 'edit' && !c.isAssistant && (
        <fieldset style={fieldset}>
          <legend style={legend}>📸 Stories（インスタ風）</legend>

          <FormRow label="アイコンリング用サムネイル画像">
            <p style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginBottom: 6, marginTop: 0 }}>
              この画像が設定されている場合のみ、ホーム画面のアイコンにピンクリングが表示されます。
            </p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input style={{ ...input, flex: 1 }} value={c.storyThumbnailUrl ?? ''} onChange={(e) => set('storyThumbnailUrl', e.target.value || undefined)} placeholder="未設定 = リング非表示" />
              <label style={uploadBtn}>
                アップロード
                <input type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    e.target.value = '';
                    setCropSrc({ src: URL.createObjectURL(file), slot: 'storyThumb' });
                  }} />
              </label>
              {c.storyThumbnailUrl && (
                <button onClick={() => set('storyThumbnailUrl', undefined)} style={{ ...slotUploadBtn, background: 'rgba(255,50,50,0.15)', borderColor: 'rgba(255,50,50,0.4)', fontSize: '0.7rem', padding: '4px 8px' }}>
                  クリア
                </button>
              )}
            </div>
            {c.storyThumbnailUrl && <img src={c.storyThumbnailUrl} alt="story thumb" style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover', marginTop: 8 }} />}
          </FormRow>

          <p style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginBottom: 12 }}>
            画像 or 動画をアップロード。ホーム画面のアイコンをタップで全画面表示されます。
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
            {storiesLoading ? (
              <span style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>読み込み中...</span>
            ) : (
              <>
                {stories.map((s) => (
                  <div key={s.id} style={{ ...slotBox, minWidth: 180 }}>
                    <div style={{ ...slotPreview, maxWidth: 80 }}>
                      {s.media_type === 'video' ? (
                        <video src={s.media_url} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onMouseEnter={(e) => (e.currentTarget as HTMLVideoElement).play().catch(() => {})}
                          onMouseLeave={(e) => (e.currentTarget as HTMLVideoElement).pause()} />
                      ) : (
                        <img src={s.media_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      )}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textAlign: 'center' }}>
                      {s.media_type === 'video' ? '🎬' : '🖼'} {s.duration_seconds}秒
                    </div>
                    <input
                      placeholder="キャプション (任意)"
                      defaultValue={s.caption ?? ''}
                      maxLength={150}
                      onBlur={(e) => { if (e.target.value !== (s.caption ?? '')) handleUpdateStory(s.id, { caption: e.target.value || null }); }}
                      style={{ ...input, fontSize: '0.72rem', padding: '4px 6px' }}
                    />
                    <div style={{ display: 'flex', gap: 4 }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '0.62rem', color: 'var(--text-tertiary)' }}>❤️ 初期いいね</label>
                        <input type="number" defaultValue={s.base_likes ?? 0} min={0}
                          onBlur={(e) => handleUpdateStory(s.id, { base_likes: parseInt(e.target.value) || 0 })}
                          style={{ ...input, fontSize: '0.72rem', padding: '3px 5px' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '0.62rem', color: 'var(--text-tertiary)' }}>💬 初期コメ</label>
                        <input type="number" defaultValue={s.base_comments ?? 0} min={0}
                          onBlur={(e) => handleUpdateStory(s.id, { base_comments: parseInt(e.target.value) || 0 })}
                          style={{ ...input, fontSize: '0.72rem', padding: '3px 5px' }} />
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteStory(s.id)}
                      style={{ ...slotUploadBtn, background: 'rgba(255,50,50,0.15)', borderColor: 'rgba(255,50,50,0.4)', fontSize: '0.7rem', padding: '4px 8px' }}
                    >
                      削除
                    </button>
                  </div>
                ))}
                {/* File upload */}
                <label style={{
                  ...slotBox, alignItems: 'center', justifyContent: 'center', minWidth: 100, minHeight: 120,
                  cursor: 'pointer', border: '2px dashed rgba(255,255,255,0.15)',
                }}>
                  <span style={{ fontSize: '1.5rem', color: 'var(--text-tertiary)' }}>＋</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>ファイル追加</span>
                  <input type="file" accept="image/*,video/mp4,video/webm" style={{ display: 'none' }}
                    onChange={(e) => { if (e.target.files?.[0]) handleStoryUpload(e.target.files[0]); e.target.value = ''; }} />
                </label>
                {/* URL direct input */}
                <div style={{
                  ...slotBox, alignItems: 'center', justifyContent: 'center', minWidth: 100, minHeight: 120,
                  border: '2px dashed rgba(124,92,252,0.3)',
                }}>
                  <span style={{ fontSize: '1.2rem', color: 'var(--text-tertiary)' }}>🔗</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginBottom: 4 }}>URL追加</span>
                  <button
                    style={{ ...slotUploadBtn, fontSize: '0.68rem', padding: '4px 8px' }}
                    onClick={async () => {
                      const url = prompt('動画 or 画像のURLを入力\n（R2 URLなど）');
                      if (!url?.trim()) return;
                      const isVideo = /\.(mp4|webm|mov)(\?|$)/i.test(url);
                      const duration = isVideo ? (parseInt(prompt('動画の秒数 (デフォルト: 5)') || '') || 5) : 5;
                      try {
                        await fetch(`/api/admin/companions/${companionId}/stories`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            media_url: url.trim(),
                            media_type: isVideo ? 'video' : 'image',
                            duration_seconds: duration,
                          }),
                        });
                        if (companionId) loadStories(companionId);
                      } catch (e: unknown) {
                        alert(e instanceof Error ? e.message : 'Failed');
                      }
                    }}
                  >
                    追加
                  </button>
                </div>
              </>
            )}
          </div>
        </fieldset>
      )}

      {mode === 'edit' && !c.isAssistant && (
        <fieldset style={{ ...fieldset, borderColor: 'rgba(255,80,80,0.2)' }}>
          <legend style={{ ...legend, color: '#ff6b6b' }}>危険ゾーン</legend>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginBottom: 12, marginTop: 0 }}>
            キャラ設定を大幅に変更した場合、全ユーザーの関係をリセットすると旧設定の影響を完全に排除できます。
          </p>
          <button
            className="admin-btn-secondary"
            style={{ background: 'rgba(255,50,50,0.15)', borderColor: 'rgba(255,50,50,0.4)', color: '#ff8080' }}
            onClick={async () => {
              if (!confirm(`${c.name}の全ユーザーとの関係をリセットしますか？\nチャット履歴・好感度が全て初期化されます。この操作は取り消せません。`)) return;
              if (!confirm('本当にリセットしますか？（最終確認）')) return;
              try {
                const res = await fetch(`/api/admin/companions/${companionId}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'reset_all_relationships' }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed');
                alert(`リセット完了: ${data.deleted}件の関係データを削除しました`);
              } catch (e: unknown) {
                alert(e instanceof Error ? e.message : 'リセットに失敗しました');
              }
            }}
          >
            全ユーザーの関係をリセット
          </button>
        </fieldset>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
        <button onClick={handleSave} disabled={saving || uploading} className="admin-btn-primary">
          {saving ? '保存中...' : uploading ? 'アップロード中...' : '保存する'}
        </button>
        <button onClick={() => router.push('/admin/companions')} className="admin-btn-secondary">キャンセル</button>
      </div>

      {/* Crop Modal */}
      {cropSrc && (
        <AvatarCropModal
          imageSrc={cropSrc.src}
          aspect={cropSrc.slot === 'avatar' ? 3 / 4 : 4 / 5}
          onComplete={(blob) => handleCroppedUpload(blob, cropSrc.slot)}
          onClose={() => { URL.revokeObjectURL(cropSrc.src); setCropSrc(null); }}
        />
      )}
    </div>
  );
}

// ── LINE-style Greeting Sequence Builder ──
type GreetingBlock = { type: 'text' | 'image' | 'video'; content: string };

function GreetingSequenceBuilder({ sequence, onChange }: { sequence: GreetingBlock[]; onChange: (s: GreetingBlock[]) => void }) {
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);

  const add = (type: GreetingBlock['type']) => {
    onChange([...sequence, { type, content: '' }]);
  };
  const update = (idx: number, content: string) => {
    const next = [...sequence];
    next[idx] = { ...next[idx], content };
    onChange(next);
  };
  const remove = (idx: number) => {
    onChange(sequence.filter((_, i) => i !== idx));
  };
  const move = (idx: number, dir: -1 | 1) => {
    const next = [...sequence];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  };

  // Upload file to R2 and set URL
  const handleFileUpload = async (idx: number, file: File, blockType: 'image' | 'video') => {
    setUploadingIdx(idx);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('videoType', blockType === 'video' ? 'emotion' : 'hover');
      fd.append('characterId', 'greeting');
      if (blockType === 'image') {
        // Use image upload endpoint
        fd.delete('videoType');
        fd.delete('characterId');
        fd.append('companionId', 'greeting');
        const res = await fetch('/api/admin/upload-companion-image', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');
        update(idx, data.url);
      } else {
        const res = await fetch('/api/admin/videos/upload', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || data.details?.join(', ') || 'Upload failed');
        update(idx, data.videoUrl);
      }
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploadingIdx(null);
    }
  };

  const typeEmoji = { text: '💬', image: '🖼️', video: '🎬' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {sequence.map((block, idx) => (
        <div key={idx} style={{
          display: 'flex', gap: 6, alignItems: 'flex-start',
          background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 8,
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          {/* Order & Type badge */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center', minWidth: 32 }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>#{idx + 1}</span>
            <span style={{ fontSize: '1.1rem' }}>{typeEmoji[block.type]}</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginTop: 2 }}>
              <button onClick={() => move(idx, -1)} style={miniBtn} disabled={idx === 0}>▲</button>
              <button onClick={() => move(idx, 1)} style={miniBtn} disabled={idx === sequence.length - 1}>▼</button>
            </div>
          </div>
          {/* Content */}
          <div style={{ flex: 1 }}>
            {block.type === 'text' ? (
              <textarea
                style={{ ...seqInput, minHeight: 50 }}
                value={block.content}
                onChange={(e) => update(idx, e.target.value)}
                placeholder="メッセージを入力..."
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  <input
                    style={{ ...seqInput, flex: 1 }}
                    value={block.content}
                    onChange={(e) => update(idx, e.target.value)}
                    placeholder={block.type === 'image' ? '画像URL or アップロード →' : '動画URL or アップロード →'}
                  />
                  <label style={{ ...addBtn, display: 'flex', alignItems: 'center', gap: 3, margin: 0, whiteSpace: 'nowrap', fontSize: '0.7rem', padding: '4px 8px' }}>
                    {uploadingIdx === idx ? '...' : '📁'}
                    <input
                      type="file"
                      accept={block.type === 'image' ? 'image/*' : 'video/mp4'}
                      style={{ display: 'none' }}
                      disabled={uploadingIdx !== null}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFileUpload(idx, f, block.type as 'image' | 'video');
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
                {/* Preview */}
                {block.content && block.type === 'image' && (
                  <img src={block.content} alt="" style={{ maxWidth: 100, borderRadius: 6 }} />
                )}
                {block.content && block.type === 'video' && (
                  <video src={block.content} muted playsInline style={{ maxWidth: 100, borderRadius: 6 }}
                    onMouseEnter={(e) => (e.currentTarget as HTMLVideoElement).play().catch(() => {})}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLVideoElement).pause(); e.currentTarget.currentTime = 0; }}
                  />
                )}
              </div>
            )}
          </div>
          {/* Delete */}
          <button onClick={() => remove(idx)} style={{ ...miniBtn, color: '#ff6b6b', fontSize: '0.9rem' }}>×</button>
        </div>
      ))}
      {/* Add buttons */}
      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
        <button onClick={() => add('text')} style={addBtn}>💬 テキスト</button>
        <button onClick={() => add('image')} style={addBtn}>🖼️ 画像</button>
        <button onClick={() => add('video')} style={addBtn}>🎬 動画</button>
      </div>
      {sequence.length === 0 && (
        <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', margin: '4px 0 0', fontStyle: 'italic' }}>
          未設定 → First Messageのテキストが使用されます
        </p>
      )}
    </div>
  );
}

const miniBtn: React.CSSProperties = {
  padding: '1px 4px', border: 'none', borderRadius: 3, cursor: 'pointer',
  background: 'rgba(255,255,255,0.06)', color: 'var(--text-tertiary)', fontSize: '0.6rem',
};
const addBtn: React.CSSProperties = {
  padding: '6px 12px', borderRadius: 6, border: '1px dashed rgba(255,77,141,0.4)',
  background: 'rgba(255,77,141,0.08)', color: '#ff4d8d', fontSize: '0.78rem',
  cursor: 'pointer', fontWeight: 500,
};
const seqInput: React.CSSProperties = {
  width: '100%', padding: '6px 8px', borderRadius: 5,
  border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.2)',
  color: 'var(--text-primary)', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box',
};

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}

const input: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 6,
  border: '1px solid rgba(255,255,255,0.15)',
  background: 'var(--bg-secondary, #1a1a2e)',
  color: 'var(--text-primary)',
  fontSize: '0.9rem',
  outline: 'none',
  boxSizing: 'border-box',
};

const fieldset: React.CSSProperties = {
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 8,
  padding: 16,
  marginTop: 20,
};

const legend: React.CSSProperties = {
  padding: '0 8px',
  fontSize: '0.9rem',
  color: 'var(--companion-pink, #ff4d8d)',
  fontWeight: 600,
};

const uploadBtn: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 6,
  border: '1px solid rgba(255,255,255,0.2)',
  background: 'rgba(124,92,252,0.15)',
  color: 'var(--text-primary)',
  fontSize: '0.8rem',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};
