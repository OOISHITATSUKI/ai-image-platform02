'use client';

import { useEffect, useState } from 'react';

interface Transaction {
    id: string;
    userId: string;
    nowpaymentsId?: string;
    packType: string;
    creditsGranted: number;
    amountUsd: number;
    currency: string;
    status: string;
    createdAt: number;
    completedAt?: number;
}

interface Summary {
    currentMonthTotal: number;
    currentMonthCount: number;
    totalAllTime: number;
}

const statusInfo = (status: string) => {
    const map: Record<string, { label: string; color: string }> = {
        completed: { label: '✅ 完了', color: '#10b981' },
        pending: { label: '⏳ 待機', color: '#f59e0b' },
        confirming: { label: '🔄 確認中', color: '#60a5fa' },
        failed: { label: '❌ 失敗', color: '#ef4444' },
        expired: { label: '⌛ 期限切れ', color: '#6b7280' },
    };
    return map[status] ?? { label: status, color: '#aaa' };
};

const packLabel = (pack: string) => ({ starter: 'お試し', light: 'ライト', standard: 'スタンダード', premium: 'プレミアム' }[pack] ?? pack);

export default function AdminPaymentsPage() {
    const [payments, setPayments] = useState<Transaction[]>([]);
    const [summary, setSummary] = useState<Summary>({ currentMonthTotal: 0, currentMonthCount: 0, totalAllTime: 0 });
    const [filtered, setFiltered] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    useEffect(() => {
        const token = localStorage.getItem('auth_token');
        fetch('/api/admin/payments', { headers: { Authorization: token ?? '' } })
            .then(r => r.json())
            .then(data => {
                setPayments(data.payments ?? []);
                setSummary(data.summary ?? { currentMonthTotal: 0, currentMonthCount: 0, totalAllTime: 0 });
                setLoading(false);
            });
    }, []);

    useEffect(() => {
        let f = [...payments];
        if (search) f = f.filter(p => p.userId.includes(search) || p.nowpaymentsId?.includes(search) || p.id.includes(search));
        if (filterStatus !== 'all') f = f.filter(p => p.status === filterStatus);
        setFiltered(f);
    }, [payments, search, filterStatus]);

    const inputStyle: React.CSSProperties = { padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem' };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>💰 決済管理</h1>
                <div style={{ display: 'flex', gap: '16px', fontSize: '0.9rem' }}>
                    <div style={{ padding: '10px 16px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px', color: '#10b981' }}>
                        今月: <strong>${summary.currentMonthTotal.toFixed(2)}</strong> / {summary.currentMonthCount}件
                    </div>
                    <div style={{ padding: '10px 16px', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: '8px', color: '#a78bfa' }}>
                        累計: <strong>${summary.totalAllTime.toFixed(2)}</strong>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <input style={inputStyle} placeholder="ユーザーID / TxID で検索" value={search} onChange={e => setSearch(e.target.value)} />
                <select style={inputStyle} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="all">ステータス: すべて</option>
                    <option value="completed">完了</option>
                    <option value="pending">待機</option>
                    <option value="confirming">確認中</option>
                    <option value="failed">失敗</option>
                    <option value="expired">期限切れ</option>
                </select>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', alignSelf: 'center' }}>{filtered.length}件</span>
            </div>

            {loading ? <div style={{ color: 'var(--text-secondary)' }}>Loading...</div> : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)' }}>
                                {['日時', 'ユーザーID', 'パック', 'クレジット', '金額', '通貨', 'ステータス'].map(h => (
                                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.08)', whiteSpace: 'nowrap' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(p => {
                                const st = statusInfo(p.status);
                                return (
                                    <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '9px 14px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{new Date(p.createdAt).toLocaleString('ja-JP')}</td>
                                        <td style={{ padding: '9px 14px', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.userId}</td>
                                        <td style={{ padding: '9px 14px', color: '#a78bfa' }}>{packLabel(p.packType)}</td>
                                        <td style={{ padding: '9px 14px', color: '#34d399' }}>+{p.creditsGranted}</td>
                                        <td style={{ padding: '9px 14px', color: '#10b981', fontWeight: 600 }}>${p.amountUsd}</td>
                                        <td style={{ padding: '9px 14px', color: 'var(--text-secondary)' }}>{p.currency}</td>
                                        <td style={{ padding: '9px 14px' }}><span style={{ color: st.color }}>{st.label}</span></td>
                                    </tr>
                                );
                            })}
                            {filtered.length === 0 && (
                                <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>取引履歴はありません</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
