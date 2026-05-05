'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import type { Companion } from '@/lib/companions';

type Row = Companion & {
  _status: 'draft' | 'published' | 'hidden' | 'archived';
  _sort_order: number;
  _updated_at?: string;
};

type Filter = 'all' | 'published' | 'draft' | 'hidden' | 'archived';

const STATUS_LABELS: Record<Row['_status'], string> = {
  published: '✅ 公開中',
  draft: '📝 下書き',
  hidden: '🙈 非表示',
  archived: '📦 アーカイブ',
};

const FILTER_LABELS: Record<Filter, string> = {
  all: 'すべて',
  published: '公開中',
  draft: '下書き',
  hidden: '非表示',
  archived: 'アーカイブ',
};

export default function AdminCompanionsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const dragRef = useRef<number | null>(null);

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
    if (!confirm(`「${id}」を本当に削除しますか？この操作は元に戻せません。`)) return;
    const res = await fetch(`/api/admin/companions/${id}`, { method: 'DELETE' });
    if (res.ok) load();
  };

  // ── Drag & Drop ──
  const handleDragStart = useCallback((e: React.DragEvent, idx: number) => {
    dragRef.current = idx;
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    // Make drag image semi-transparent
    if (e.currentTarget instanceof HTMLElement) {
      e.dataTransfer.setDragImage(e.currentTarget, 0, 0);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setOverIdx(idx);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragIdx(null);
    setOverIdx(null);
    dragRef.current = null;
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, dropIdx: number) => {
    e.preventDefault();
    const fromIdx = dragRef.current;
    if (fromIdx === null || fromIdx === dropIdx) {
      handleDragEnd();
      return;
    }

    // Reorder the filtered list
    const reordered = [...filtered];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(dropIdx, 0, moved);

    // Build new order: array of { id, sort_order }
    const updates = reordered.map((r, i) => ({ id: r.id, sort_order: i }));

    // Optimistic UI update
    const newRows = rows.map((r) => {
      const u = updates.find((u) => u.id === r.id);
      return u ? { ...r, _sort_order: u.sort_order } : r;
    });
    newRows.sort((a, b) => a._sort_order - b._sort_order);
    setRows(newRows);

    handleDragEnd();

    // Persist to server
    await fetch('/api/admin/companions/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orders: updates }),
    });
  }, [filtered, rows, handleDragEnd]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: 24 }}>
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
            {FILTER_LABELS[f]} ({counts[f]})
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-tertiary)' }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-tertiary)' }}>
          データベースにキャラクターがありません。マイグレーション＆シードスクリプトを実行してください。
        </div>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead style={{ background: 'rgba(255,255,255,0.03)' }}>
              <tr>
                <th style={{ ...th, width: 32 }}></th>
                <th style={th}>画像</th>
                <th style={th}>ID</th>
                <th style={th}>名前</th>
                <th style={th}>年齢</th>
                <th style={th}>性格</th>
                <th style={th}>動画URL</th>
                <th style={th}>状態</th>
                <th style={th}>順番</th>
                <th style={{ ...th, textAlign: 'right', paddingRight: 12 }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, idx) => (
                <tr
                  key={c.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                  onDrop={(e) => handleDrop(e, idx)}
                  style={{
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    opacity: dragIdx === idx ? 0.4 : 1,
                    background: overIdx === idx && dragIdx !== idx
                      ? 'rgba(124, 92, 252, 0.15)'
                      : 'transparent',
                    cursor: 'grab',
                    transition: 'background 0.15s',
                  }}
                >
                  <td style={{ ...td, cursor: 'grab', color: 'var(--text-tertiary)', fontSize: '1rem', textAlign: 'center' }}>
                    ⠿
                  </td>
                  <td style={td}>
                    <img src={c.avatarUrl} alt={c.name} style={{ width: 40, height: 56, objectFit: 'cover', borderRadius: 4 }} />
                  </td>
                  <td style={{ ...td, fontFamily: 'monospace', color: 'var(--text-tertiary)' }}>{c.id}</td>
                  <td style={td}>
                    {c.name}{c.isAssistant && <span style={{ marginLeft: 6, fontSize: '0.7rem', color: 'var(--companion-pink, #ff4d8d)' }}>Assistant</span>}
                  </td>
                  <td style={td}>{c.age || '-'}</td>
                  <td style={{ ...td, textTransform: 'capitalize' }}>{c.personality}</td>
                  <td style={{ ...td, fontSize: '0.72rem', maxWidth: 200 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {c.hoverVideoUrl && (
                        <span style={{ color: 'var(--text-tertiary)' }}>
                          <strong>Hover:</strong> <a href={c.hoverVideoUrl} target="_blank" rel="noopener" style={{ color: '#7c9cfc', wordBreak: 'break-all' }}>{c.hoverVideoUrl.split('/').pop()}</a>
                        </span>
                      )}
                      {c.greetingVideoUrl && (
                        <span style={{ color: 'var(--text-tertiary)' }}>
                          <strong>Greeting:</strong> <a href={c.greetingVideoUrl} target="_blank" rel="noopener" style={{ color: '#7c9cfc', wordBreak: 'break-all' }}>{c.greetingVideoUrl.split('/').pop()}</a>
                        </span>
                      )}
                      {c.liveActions && c.liveActions.filter(a => a.videoUrl).length > 0 && (
                        <details style={{ marginTop: 2 }}>
                          <summary style={{ color: 'var(--text-tertiary)', cursor: 'pointer' }}>LiveAction ({c.liveActions.filter(a => a.videoUrl).length})</summary>
                          <div style={{ marginTop: 2, paddingLeft: 4 }}>
                            {c.liveActions.filter(a => a.videoUrl).map(a => (
                              <div key={a.id} style={{ color: 'var(--text-tertiary)' }}>
                                {a.label}: <a href={a.videoUrl} target="_blank" rel="noopener" style={{ color: '#7c9cfc', wordBreak: 'break-all' }}>{a.videoUrl!.split('/').pop()}</a>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                      {!c.hoverVideoUrl && !c.greetingVideoUrl && (!c.liveActions || c.liveActions.filter(a => a.videoUrl).length === 0) && <span style={{ color: 'var(--text-tertiary)' }}>-</span>}
                    </div>
                  </td>
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
                      {(Object.keys(STATUS_LABELS) as Row['_status'][]).map((s) => (
                        <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ ...td, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                    {idx + 1}
                  </td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <Link href={`/admin/companions/${c.id}`} className="admin-btn-small">編集</Link>
                      <Link href={`/admin/companions/${c.id}#videos`} className="admin-btn-small">動画</Link>
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
