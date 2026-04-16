'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Companion } from '@/lib/companions';

type Row = Companion & {
  _status: 'draft' | 'published' | 'hidden' | 'archived';
  _sort_order: number;
  _updated_at?: string;
};

type Filter = 'all' | 'published' | 'draft' | 'hidden' | 'archived';

export default function AdminCompanionsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch('/api/admin/companions');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setRows(data.companions ?? []);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = rows.filter((r) => filter === 'all' || r._status === filter);

  const counts = {
    all: rows.length,
    published: rows.filter((r) => r._status === 'published').length,
    draft: rows.filter((r) => r._status === 'draft').length,
    hidden: rows.filter((r) => r._status === 'hidden').length,
    archived: rows.filter((r) => r._status === 'archived').length,
  };

  const handleStatusChange = async (id: string, status: Row['_status']) => {
    const res = await fetch(`/api/admin/companions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'status', value: status }),
    });
    if (res.ok) load();
  };

  const handleDuplicate = async (id: string) => {
    const res = await fetch(`/api/admin/companions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'duplicate' }),
    });
    if (res.ok) load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`Really delete "${id}"? This is permanent.`)) return;
    const res = await fetch(`/api/admin/companions/${id}`, { method: 'DELETE' });
    if (res.ok) load();
  };

  const moveSortOrder = async (id: string, currentOrder: number, direction: 'up' | 'down') => {
    const newOrder = direction === 'up' ? currentOrder - 1 : currentOrder + 1;
    await fetch(`/api/admin/companions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'sort_order', value: newOrder }),
    });
    load();
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, margin: 0 }}>キャラクター管理</h1>
        <Link href="/admin/companions/new" className="admin-btn-primary">＋ 新規追加</Link>
      </div>

      {err && <div style={{ background: '#5a1a1a', color: '#fff', padding: 12, borderRadius: 8, marginBottom: 16 }}>{err}</div>}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {(['all', 'published', 'draft', 'hidden', 'archived'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '6px 14px',
              borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.2)',
              background: filter === f ? 'var(--primary-dark, #7c5cfc)' : 'transparent',
              color: filter === f ? '#fff' : 'var(--text-secondary)',
              fontSize: '0.82rem',
              fontWeight: filter === f ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            {f} ({counts[f]})
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-tertiary)' }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-tertiary)' }}>
          No companions in the database yet. Run the migration + seed script.
        </div>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead style={{ background: 'rgba(255,255,255,0.03)' }}>
              <tr>
                <th style={th}>画像</th>
                <th style={th}>ID</th>
                <th style={th}>名前</th>
                <th style={th}>年</th>
                <th style={th}>性格</th>
                <th style={th}>状態</th>
                <th style={th}>Order</th>
                <th style={{ ...th, textAlign: 'right', paddingRight: 12 }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={td}>
                    <img src={c.avatarUrl} alt={c.name} style={{ width: 40, height: 56, objectFit: 'cover', borderRadius: 4 }} />
                  </td>
                  <td style={{ ...td, fontFamily: 'monospace', color: 'var(--text-tertiary)' }}>{c.id}</td>
                  <td style={td}>
                    {c.name}{c.isAssistant && <span style={{ marginLeft: 6, fontSize: '0.7rem', color: 'var(--companion-pink, #ff4d8d)' }}>Assistant</span>}
                  </td>
                  <td style={td}>{c.age || '-'}</td>
                  <td style={{ ...td, textTransform: 'capitalize' }}>{c.personality}</td>
                  <td style={td}>
                    <select
                      value={c._status}
                      onChange={(e) => handleStatusChange(c.id, e.target.value as Row['_status'])}
                      style={{
                        padding: '4px 8px', borderRadius: 4, fontSize: '0.8rem',
                        background: 'var(--bg-secondary)', color: 'var(--text-primary)',
                        border: '1px solid rgba(255,255,255,0.15)',
                      }}
                    >
                      <option value="published">✅ published</option>
                      <option value="draft">📝 draft</option>
                      <option value="hidden">🙈 hidden</option>
                      <option value="archived">📦 archived</option>
                    </select>
                  </td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      <button onClick={() => moveSortOrder(c.id, c._sort_order, 'up')} style={iconBtn} title="Up">↑</button>
                      <span style={{ minWidth: 24, textAlign: 'center' }}>{c._sort_order}</span>
                      <button onClick={() => moveSortOrder(c.id, c._sort_order, 'down')} style={iconBtn} title="Down">↓</button>
                    </div>
                  </td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <Link href={`/admin/companions/${c.id}`} className="admin-btn-small">編集</Link>
                      <button onClick={() => handleDuplicate(c.id)} className="admin-btn-small">複製</button>
                      <button onClick={() => handleDelete(c.id)} className="admin-btn-small admin-btn-danger">削除</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 12px',
  fontSize: '0.78rem',
  fontWeight: 600,
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const td: React.CSSProperties = {
  padding: '10px 12px',
  color: 'var(--text-primary)',
  verticalAlign: 'middle',
};

const iconBtn: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid rgba(255,255,255,0.15)',
  color: 'var(--text-secondary)',
  borderRadius: 4,
  padding: '2px 6px',
  cursor: 'pointer',
  fontSize: '0.75rem',
};
