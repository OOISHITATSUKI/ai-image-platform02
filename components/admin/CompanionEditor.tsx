'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Companion } from '@/lib/companions';

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

  const handleUpload = async (file: File, slot: 'avatar' | 'g1' | 'g2' | 'g3') => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('companionId', c.id || 'new');
      const res = await fetch('/api/admin/upload-companion-image', {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      if (slot === 'avatar') {
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
      <FormRow label="First Message (チャット開始時)">
        <textarea style={{ ...input, minHeight: 60 }} value={c.firstMessage ?? ''} onChange={(e) => set('firstMessage', e.target.value)} />
      </FormRow>
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
        <legend style={legend}>画像</legend>
        <FormRow label="アバターURL">
          <div style={{ display: 'flex', gap: 8 }}>
            <input style={{ ...input, flex: 1 }} value={c.avatarUrl} onChange={(e) => set('avatarUrl', e.target.value)} />
            <label style={uploadBtn}>
              アップロード
              <input type="file" accept="image/*" style={{ display: 'none' }}
                onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], 'avatar')} />
            </label>
          </div>
        </FormRow>
        {c.avatarUrl && <img src={c.avatarUrl} alt="avatar" style={{ width: 80, height: 112, objectFit: 'cover', borderRadius: 4, marginBottom: 12 }} />}

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
                  onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], (`g${i + 1}` as 'g1' | 'g2' | 'g3'))} />
              </label>
            </div>
          </FormRow>
        ))}
      </fieldset>

      {!c.isAssistant && (
        <fieldset style={fieldset}>
          <legend style={legend}>Live Action動画 ({LIVE_VIDEO_SLOTS.length}本)</legend>
          {mode === 'new' ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
              基本情報を保存してから、動画をアップロードできます。
            </p>
          ) : (
            <>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginBottom: 12 }}>
                mp4/webm 推奨、最大500MB/本。アップロード先：<code>/public/companions/videos/</code>。
                ホバーで再生プレビュー。
              </p>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
                gap: 12,
              }}>
                {LIVE_VIDEO_SLOTS.map((slot) => (
                  <LiveVideoSlot
                    key={`${slot.actionId}-${slot.variant}`}
                    companionId={companionId ?? c.id}
                    slot={slot}
                  />
                ))}
              </div>
            </>
          )}
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

      <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
        <button onClick={handleSave} disabled={saving || uploading} className="admin-btn-primary">
          {saving ? '保存中...' : uploading ? 'アップロード中...' : '保存する'}
        </button>
        <button onClick={() => router.push('/admin/companions')} className="admin-btn-secondary">キャンセル</button>
      </div>
    </div>
  );
}

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
