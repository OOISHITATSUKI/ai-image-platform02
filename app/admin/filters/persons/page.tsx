'use client';

import { useEffect, useState } from 'react';

type BlockedPerson = {
    id: number;
    name_en: string;
    name_ja: string;
    category: string;
};

export default function AdminPersonsPage() {
    const [persons, setPersons] = useState<BlockedPerson[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [newNameEn, setNewNameEn] = useState('');
    const [newNameJa, setNewNameJa] = useState('');
    const [newCategory, setNewCategory] = useState('international_celebrity');
    const [addLoading, setAddLoading] = useState(false);
    const [addMessage, setAddMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    const fetchPersons = async () => {
        setLoading(true);
        const token = localStorage.getItem('auth_token');
        try {
            const res = await fetch('/api/admin/persons', {
                headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
            });
            const data = await res.json();
            if (res.ok) {
                setPersons(data.blocked_persons || []);
            } else {
                setError(data.error || 'Failed to load');
            }
        } catch (e) {
            setError('Connection error');
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchPersons();
    }, []);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newNameEn.trim() || !newNameJa.trim() || !newCategory.trim()) return;

        setAddLoading(true);
        setAddMessage(null);
        const token = localStorage.getItem('auth_token');

        try {
            const res = await fetch('/api/admin/persons', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    name_en: newNameEn,
                    name_ja: newNameJa,
                    category: newCategory
                }),
            });

            const data = await res.json();

            if (res.ok) {
                setAddMessage({ text: '✅ 登録しました', type: 'success' });
                setNewNameEn('');
                setNewNameJa('');
                fetchPersons(); // Refresh list
            } else {
                setAddMessage({ text: `❌ ${data.error}`, type: 'error' });
            }
        } catch (e) {
            setAddMessage({ text: '❌ 通信エラーが発生しました', type: 'error' });
        }
        setAddLoading(false);
    };

    const inputStyle: React.CSSProperties = { padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.9rem', width: '100%' };
    const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' };

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
                <a href="/admin/filters" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '1.2rem' }}>←</a>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>👥 実在人物ブロックリスト管理</h1>
            </div>

            {/* Add New Person Form */}
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px', marginBottom: '32px' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>📝 新規登録</h2>
                <form onSubmit={handleAdd} style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
                    <div style={{ flex: '1 1 200px' }}>
                        <label style={labelStyle}>英語名 (例: Taylor Swift)</label>
                        <input style={inputStyle} value={newNameEn} onChange={e => setNewNameEn(e.target.value)} required />
                    </div>
                    <div style={{ flex: '1 1 200px' }}>
                        <label style={labelStyle}>日本語名 (例: テイラー・スウィフト)</label>
                        <input style={inputStyle} value={newNameJa} onChange={e => setNewNameJa(e.target.value)} required />
                    </div>
                    <div style={{ flex: '1 1 200px' }}>
                        <label style={labelStyle}>カテゴリ</label>
                        <select style={{ ...inputStyle, cursor: 'pointer' }} value={newCategory} onChange={e => setNewCategory(e.target.value)}>
                            <option value="international_celebrity">International Celebrity</option>
                            <option value="japanese_celebrity">Japanese Celebrity</option>
                            <option value="internet_personality">Internet Personality</option>
                            <option value="kpop">K-Pop</option>
                            <option value="politician">Politician</option>
                            <option value="public_figure">Public Figure</option>
                        </select>
                    </div>
                    <div>
                        <button type="submit" disabled={addLoading} style={{ padding: '8px 24px', background: 'var(--primary)', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer', fontSize: '0.9rem', height: '37px', whiteSpace: 'nowrap' }}>
                            {addLoading ? '登録中...' : '追加'}
                        </button>
                    </div>
                </form>
                {addMessage && (
                    <div style={{ marginTop: '16px', padding: '10px 14px', borderRadius: '6px', fontSize: '0.85rem', background: addMessage.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: addMessage.type === 'success' ? '#34d399' : '#f87171', border: `1px solid ${addMessage.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
                        {addMessage.text}
                    </div>
                )}
            </div>

            {/* List */}
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>登録一覧 ({persons.length}名)</h2>
                    <button onClick={fetchPersons} style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', fontSize: '0.9rem' }}>🔄 更新</button>
                </div>

                {loading ? (
                    <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>読み込み中...</div>
                ) : error ? (
                    <div style={{ padding: '32px', textAlign: 'center', color: '#f87171' }}>{error}</div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                                    <th style={{ padding: '12px 24px', fontWeight: 500 }}>ID</th>
                                    <th style={{ padding: '12px 24px', fontWeight: 500 }}>英語名 (English)</th>
                                    <th style={{ padding: '12px 24px', fontWeight: 500 }}>日本語名 (Japanese)</th>
                                    <th style={{ padding: '12px 24px', fontWeight: 500 }}>カテゴリ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {persons.map((p, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                        <td style={{ padding: '12px 24px', color: 'var(--text-secondary)' }}>#{p.id || i + 1}</td>
                                        <td style={{ padding: '12px 24px' }}>{p.name_en}</td>
                                        <td style={{ padding: '12px 24px' }}>{p.name_ja}</td>
                                        <td style={{ padding: '12px 24px' }}>
                                            <span style={{ padding: '2px 8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                {p.category}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
