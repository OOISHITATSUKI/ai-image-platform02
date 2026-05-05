'use client';

import React, { useEffect, useState } from 'react';

interface FeedbackRow {
  id: string;
  type: 'companion_request' | 'complaint' | 'feature_request' | 'other';
  summary: string;
  user_message: string;
  assistant_reply: string | null;
  user_id: string | null;
  user_email: string | null;
  locale: string;
  status: 'new' | 'reviewed' | 'resolved' | 'dismissed';
  admin_note: string | null;
  created_at: string;
}

interface GroupedFeedback {
  key: string;
  label: string;
  items: FeedbackRow[];
}

type Filter = 'all' | 'new' | 'reviewed' | 'resolved' | 'dismissed';
type TypeFilter = 'all' | 'companion_request' | 'complaint' | 'feature_request' | 'other';

const TYPE_LABELS: Record<FeedbackRow['type'], string> = {
  companion_request: '💬 キャラリクエスト',
  complaint: '⚠️ クレーム',
  feature_request: '💡 機能リクエスト',
  other: '📝 その他',
};

const STATUS_LABELS: Record<FeedbackRow['status'], string> = {
  new: '🆕 新規',
  reviewed: '👀 確認済み',
  resolved: '✅ 対応済み',
  dismissed: '🗑️ 却下',
};

function groupByUser(rows: FeedbackRow[]): GroupedFeedback[] {
  const map = new Map<string, FeedbackRow[]>();
  for (const r of rows) {
    const key = r.user_email || r.user_id || `anon-${r.id}`;
    const existing = map.get(key);
    if (existing) existing.push(r);
    else map.set(key, [r]);
  }
  const groups: GroupedFeedback[] = [];
  for (const [key, items] of map) {
    // Sort items within group by newest first
    items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    groups.push({
      key,
      label: items[0].user_email || '匿名ユーザー',
      items,
    });
  }
  // Sort groups by latest feedback
  groups.sort((a, b) => new Date(b.items[0].created_at).getTime() - new Date(a.items[0].created_at).getTime());
  return groups;
}

export default function AdminFeedbackPage() {
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [noteEdit, setNoteEdit] = useState<{ id: string; text: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/feedback');
      const data = await res.json();
      setRows(data.feedback ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: FeedbackRow['status']) => {
    await fetch('/api/admin/feedback', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    load();
  };

  const saveNote = async (id: string, admin_note: string) => {
    await fetch('/api/admin/feedback', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, admin_note }),
    });
    setNoteEdit(null);
    load();
  };

  const deleteOne = async (id: string) => {
    if (!confirm('このフィードバックを削除しますか？')) return;
    await fetch('/api/admin/feedback', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    load();
  };

  const deleteGroup = async (items: FeedbackRow[]) => {
    if (!confirm(`このユーザーのフィードバック${items.length}件をすべて削除しますか？`)) return;
    await fetch('/api/admin/feedback', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: items.map((i) => i.id) }),
    });
    setExpandedGroup(null);
    load();
  };

  const deleteResolved = async () => {
    const resolved = rows.filter((r) => r.status === 'resolved' || r.status === 'dismissed');
    if (resolved.length === 0) return;
    if (!confirm(`対応済み・却下のフィードバック${resolved.length}件をすべて削除しますか？`)) return;
    await fetch('/api/admin/feedback', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: resolved.map((r) => r.id) }),
    });
    load();
  };

  const filtered = rows
    .filter((r) => filter === 'all' || r.status === filter)
    .filter((r) => typeFilter === 'all' || r.type === typeFilter);

  const groups = groupByUser(filtered);

  const counts = {
    all: rows.length,
    new: rows.filter((r) => r.status === 'new').length,
    reviewed: rows.filter((r) => r.status === 'reviewed').length,
    resolved: rows.filter((r) => r.status === 'resolved').length,
    dismissed: rows.filter((r) => r.status === 'dismissed').length,
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, margin: 0 }}>
          📩 ユーザーフィードバック
        </h1>
        {(counts.resolved + counts.dismissed) > 0 && (
          <button
            onClick={deleteResolved}
            style={{
              padding: '8px 16px', borderRadius: 8, fontSize: '0.82rem',
              background: '#5a1a1a', color: '#ff9999', border: '1px solid #ff4444',
              cursor: 'pointer', fontWeight: 500,
            }}
          >
            🗑️ 対応済み・却下を一括削除 ({counts.resolved + counts.dismissed}件)
          </button>
        )}
      </div>

      {/* Status filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {(['all', 'new', 'reviewed', 'resolved', 'dismissed'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '6px 14px', borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.2)',
              background: filter === f ? 'var(--primary-dark, #7c5cfc)' : 'transparent',
              color: filter === f ? '#fff' : 'var(--text-secondary)',
              fontSize: '0.82rem', fontWeight: filter === f ? 600 : 400, cursor: 'pointer',
            }}
          >
            {f === 'all' ? 'すべて' : STATUS_LABELS[f as FeedbackRow['status']]} ({counts[f]})
          </button>
        ))}
      </div>

      {/* Type filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {(['all', 'companion_request', 'complaint', 'feature_request', 'other'] as TypeFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setTypeFilter(f)}
            style={{
              padding: '4px 10px', borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.15)',
              background: typeFilter === f ? 'rgba(124, 92, 252, 0.2)' : 'transparent',
              color: typeFilter === f ? '#fff' : 'var(--text-tertiary)',
              fontSize: '0.78rem', cursor: 'pointer',
            }}
          >
            {f === 'all' ? '全タイプ' : TYPE_LABELS[f as FeedbackRow['type']]}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-tertiary)' }}>Loading...</div>
      ) : groups.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-tertiary)' }}>
          フィードバックはまだありません。
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {groups.map((g) => {
            const isOpen = expandedGroup === g.key;
            const newCount = g.items.filter((i) => i.status === 'new').length;
            return (
              <div
                key={g.key}
                style={{
                  border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10,
                  background: 'rgba(255,255,255,0.02)', overflow: 'hidden',
                }}
              >
                {/* Group header */}
                <div
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                    cursor: 'pointer', background: isOpen ? 'rgba(255,255,255,0.03)' : 'transparent',
                  }}
                  onClick={() => setExpandedGroup(isOpen ? null : g.key)}
                >
                  <span style={{ fontSize: '1.1rem' }}>👤</span>
                  <span style={{ fontWeight: 600, flex: 1 }}>
                    {g.label}
                    <span style={{ marginLeft: 10, fontSize: '0.78rem', fontWeight: 400, color: 'var(--text-tertiary)' }}>
                      {g.items.length}件
                    </span>
                  </span>
                  {newCount > 0 && (
                    <span style={{
                      background: '#ff4d8d', color: '#fff', fontSize: '0.7rem', fontWeight: 700,
                      padding: '2px 8px', borderRadius: 10,
                    }}>
                      {newCount} 新規
                    </span>
                  )}
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                    最新: {new Date(g.items[0].created_at).toLocaleString('ja-JP')}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteGroup(g.items); }}
                    style={{
                      background: 'transparent', border: '1px solid rgba(255,100,100,0.3)',
                      color: '#ff6666', borderRadius: 4, padding: '3px 8px', fontSize: '0.72rem',
                      cursor: 'pointer',
                    }}
                    title="このユーザーのフィードバックをすべて削除"
                  >
                    全削除
                  </button>
                  <span style={{ fontSize: '0.9rem' }}>{isOpen ? '▲' : '▼'}</span>
                </div>

                {/* Group items */}
                {isOpen && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    {g.items.map((r) => {
                      const isItemOpen = expandedItem === r.id;
                      return (
                        <div key={r.id} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                          {/* Item header */}
                          <div
                            style={{
                              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px 10px 32px',
                              cursor: 'pointer',
                            }}
                            onClick={() => setExpandedItem(isItemOpen ? null : r.id)}
                          >
                            <span style={{ fontSize: '0.78rem' }}>{TYPE_LABELS[r.type]}</span>
                            <span style={{ flex: 1, fontSize: '0.88rem' }}>{r.summary}</span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                              {new Date(r.created_at).toLocaleString('ja-JP')}
                            </span>
                            <select
                              value={r.status}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => updateStatus(r.id, e.target.value as FeedbackRow['status'])}
                              style={{
                                padding: '3px 6px', borderRadius: 4, fontSize: '0.72rem',
                                background: 'var(--bg-secondary)', color: 'var(--text-primary)',
                                border: '1px solid rgba(255,255,255,0.15)',
                              }}
                            >
                              {(Object.keys(STATUS_LABELS) as FeedbackRow['status'][]).map((s) => (
                                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                              ))}
                            </select>
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteOne(r.id); }}
                              style={{
                                background: 'transparent', border: 'none',
                                color: '#ff6666', cursor: 'pointer', fontSize: '0.85rem', padding: '2px 4px',
                              }}
                              title="削除"
                            >
                              ✕
                            </button>
                            <span style={{ fontSize: '0.8rem' }}>{isItemOpen ? '▲' : '▼'}</span>
                          </div>

                          {/* Item detail */}
                          {isItemOpen && (
                            <div style={{ padding: '0 16px 14px 32px' }}>
                              <div style={{ marginTop: 8 }}>
                                <label style={labelStyle}>ユーザーメッセージ</label>
                                <div style={msgBox}>{r.user_message}</div>
                              </div>
                              {r.assistant_reply && (
                                <div style={{ marginTop: 8 }}>
                                  <label style={labelStyle}>アシスタント返答</label>
                                  <div style={{ ...msgBox, background: 'rgba(124,92,252,0.08)' }}>{r.assistant_reply}</div>
                                </div>
                              )}
                              <div style={{ marginTop: 8, display: 'flex', gap: 12, fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                <span>言語: {r.locale}</span>
                                {r.user_id && <span>User ID: {r.user_id}</span>}
                              </div>
                              <div style={{ marginTop: 10 }}>
                                <label style={labelStyle}>管理メモ</label>
                                {noteEdit?.id === r.id ? (
                                  <div style={{ display: 'flex', gap: 8 }}>
                                    <textarea
                                      value={noteEdit.text}
                                      onChange={(e) => setNoteEdit({ ...noteEdit, text: e.target.value })}
                                      style={{
                                        flex: 1, padding: 8, borderRadius: 6, fontSize: '0.85rem',
                                        background: 'var(--bg-secondary)', color: 'var(--text-primary)',
                                        border: '1px solid rgba(255,255,255,0.15)', resize: 'vertical', minHeight: 60,
                                      }}
                                    />
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                      <button onClick={() => saveNote(r.id, noteEdit.text)} className="admin-btn-small" style={{ fontSize: '0.72rem' }}>保存</button>
                                      <button onClick={() => setNoteEdit(null)} className="admin-btn-small" style={{ fontSize: '0.72rem' }}>取消</button>
                                    </div>
                                  </div>
                                ) : (
                                  <div
                                    onClick={() => setNoteEdit({ id: r.id, text: r.admin_note || '' })}
                                    style={{
                                      ...msgBox, cursor: 'pointer', minHeight: 32,
                                      color: r.admin_note ? 'var(--text-primary)' : 'var(--text-tertiary)',
                                    }}
                                  >
                                    {r.admin_note || 'クリックしてメモを追加...'}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)',
  textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4, display: 'block',
};

const msgBox: React.CSSProperties = {
  padding: '8px 12px', borderRadius: 6, fontSize: '0.85rem',
  background: 'rgba(255,255,255,0.04)', lineHeight: 1.5, whiteSpace: 'pre-wrap',
};
