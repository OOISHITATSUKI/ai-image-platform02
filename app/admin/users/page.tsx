'use client';

import { useCallback, useEffect, useState } from 'react';

interface AdminUser {
    id: string;
    email: string;
    username: string;
    status: string;
    plan: string;
    termsAgreedAt?: string | null;
    credits: number;
    country?: string;
    createdAt: number;
    lastLoginAt?: number;
    emailVerified: boolean;
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        const token = localStorage.getItem('auth_token');
        const headers: Record<string, string> = { Authorization: token ?? '' };
        const res = await fetch('/api/admin/users', { headers });
        const data = await res.json();
        setUsers(data.users ?? []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const doAction = async (userId: string, action: string, value?: number, strValue?: string) => {
        const token = localStorage.getItem('auth_token');
        const headers: Record<string, string> = { 'Content-Type': 'application/json', Authorization: token ?? '' };
        await fetch('/api/admin/users', {
            method: 'POST',
            headers,
            body: JSON.stringify({ userId, action, value, strValue }),
        });
        fetchUsers();
    };

    const filteredUsers = users.filter(u => {
        if (!search) return true;
        const q = search.toLowerCase();
        return u.email.toLowerCase().includes(q) || u.username?.toLowerCase().includes(q) || u.id.includes(q);
    });

    const statusColor = (s: string) => ({ active: '#10b981', banned: '#ef4444', suspended: '#f59e0b', age_restricted: '#a78bfa' }[s] ?? '#aaa');
    const inputStyle: React.CSSProperties = { padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem' };
    const btnStyle = (color: string): React.CSSProperties => ({ padding: '4px 10px', background: `${color}20`, border: `1px solid ${color}50`, color, borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', whiteSpace: 'nowrap' });

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>👤 ユーザー管理</h1>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>総ユーザー: {users.length}</span>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                <input style={{ ...inputStyle, minWidth: '300px' }} placeholder="メール / ユーザー名 / ID で検索" value={search} onChange={e => setSearch(e.target.value)} />
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', alignSelf: 'center' }}>{filteredUsers.length} 件</span>
            </div>

            {loading ? <div style={{ color: 'var(--text-secondary)' }}>Loading...</div> : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)' }}>
                                {['ユーザー名', 'Email', 'ステータス', 'プラン', 'クレジット', '国', '同意', '登録日', 'アクション'].map(h => (
                                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.08)', whiteSpace: 'nowrap' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map(u => (
                                <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '9px 14px' }}>{u.username || '-'}</td>
                                    <td style={{ padding: '9px 14px', color: '#60a5fa' }}>{u.email}</td>
                                    <td style={{ padding: '9px 14px' }}>
                                        <span style={{ padding: '2px 8px', borderRadius: '4px', background: `${statusColor(u.status)}20`, color: statusColor(u.status), fontSize: '0.8rem' }}>{u.status}</span>
                                    </td>
                                    <td style={{ padding: '9px 14px', color: '#a78bfa' }}>{u.plan}</td>
                                    <td style={{ padding: '9px 14px', color: '#f59e0b' }}>{u.credits}</td>
                                    <td style={{ padding: '9px 14px', color: 'var(--text-secondary)' }}>{u.country || '-'}</td>
                                    <td style={{ padding: '9px 14px' }}>{u.termsAgreedAt ? <span style={{ color: '#10b981' }}>✅</span> : <span style={{ color: '#ef4444' }}>❌</span>}</td>
                                    <td style={{ padding: '9px 14px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{new Date(u.createdAt).toLocaleDateString('ja-JP')}</td>
                                    <td style={{ padding: '9px 14px' }}>
                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                            {u.status !== 'banned'
                                                ? <button onClick={() => doAction(u.id, 'ban')} style={btnStyle('#ef4444')}>BAN</button>
                                                : <button onClick={() => doAction(u.id, 'unban')} style={btnStyle('#10b981')}>解除</button>}
                                            <button onClick={async () => {
                                                const c = prompt('新しいクレジット数:', String(u.credits));
                                                if (c !== null) doAction(u.id, 'set_credits', Number(c));
                                            }} style={btnStyle('#60a5fa')}>💰 Credits</button>
                                            <button onClick={() => { const p = prompt('プランを入力 (free / paid):', u.plan); if (p !== null) doAction(u.id, 'set_plan', undefined, p); }} style={btnStyle('#a78bfa')}>👑 Plan</button>
                                            <button onClick={() => { if (confirm('Delete this user? This cannot be undone.')) doAction(u.id, 'delete'); }} style={btnStyle('#991b1b')}>🗑 Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredUsers.length === 0 && (
                                <tr><td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>ユーザーが見つかりません</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
