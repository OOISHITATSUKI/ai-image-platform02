'use client';

import React, { useEffect, useState } from 'react';

interface FeatureFlag {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
}

const FEATURE_DEFS: { key: string; label: string; description: string }[] = [
  { key: 'feature_image', label: '🖼️ Image生成', description: 'サイドバーのCREATE → Image を表示' },
  { key: 'feature_faceswap', label: '👤 Face Swap', description: 'サイドバーのCREATE → Face Swap を表示' },
  { key: 'feature_undress', label: '✂️ Undress', description: 'サイドバーのCREATE → Undress を表示' },
  { key: 'feature_video', label: '🎬 Video', description: 'サイドバーのCREATE → Video を表示' },
  { key: 'feature_library', label: '📁 ライブラリ', description: 'サイドバーのライブラリ（画像一覧）を表示' },
  { key: 'feature_chathistory', label: '💬 チャット履歴', description: 'サイドバーのチャット履歴を表示' },
];

export default function AdminFeaturesPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    loadFlags();
  }, []);

  async function loadFlags() {
    const res = await fetch('/api/feature-flags');
    const data = await res.json();
    setFlags(FEATURE_DEFS.map(d => ({
      ...d,
      enabled: data[d.key] ?? false,
    })));
    setLoading(false);
  }

  async function toggleFlag(key: string, value: boolean) {
    setSaving(key);
    await fetch('/api/admin/feature-flags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    });
    setFlags(prev => prev.map(f => f.key === key ? { ...f, enabled: value } : f));
    setSaving(null);
  }

  if (loading) return <div style={{ padding: 40, color: 'var(--text-tertiary)' }}>Loading...</div>;

  return (
    <div>
      <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: 8 }}>⚙️ 機能管理</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 24 }}>
        各機能の表示/非表示を切り替えます。OFFにするとユーザーに表示されません。
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {flags.map(flag => (
          <div
            key={flag.key}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.08)',
              background: flag.enabled ? 'rgba(80,200,120,0.05)' : 'rgba(255,255,255,0.02)',
            }}
          >
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {flag.label}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
                {flag.description}
              </div>
            </div>
            <button
              onClick={() => toggleFlag(flag.key, !flag.enabled)}
              disabled={saving === flag.key}
              style={{
                padding: '8px 20px',
                borderRadius: 8,
                border: 'none',
                fontWeight: 600,
                fontSize: '0.82rem',
                cursor: 'pointer',
                background: flag.enabled ? '#50c878' : 'rgba(255,255,255,0.1)',
                color: flag.enabled ? '#fff' : 'var(--text-tertiary)',
                minWidth: 70,
                transition: 'all 0.15s',
              }}
            >
              {saving === flag.key ? '...' : flag.enabled ? 'ON' : 'OFF'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
