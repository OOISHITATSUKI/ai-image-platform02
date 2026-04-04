'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

interface EmailLog {
    id: string;
    user_id: string | null;
    email_to: string;
    email_type: string;
    subject: string;
    status: string;
    error_message: string | null;
    sent_at: string;
    users: { email: string; name: string | null } | null;
}

const EMAIL_TYPE_LABELS: Record<string, string> = {
    welcome: 'ウェルカム',
    verify: '認証',
    reset_password: 'パスワードリセット',
    step_email: 'ステップメール',
    manual: '手動',
};

const inputStyle: React.CSSProperties = {
    padding: '8px 12px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '8px',
    color: 'var(--text-primary)',
    fontSize: '0.85rem',
};

export default function AdminEmailLogsPage() {
    const [logs, setLogs] = useState<EmailLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    // Filters
    const [filterType, setFilterType] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [search, setSearch] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set('page', String(page));
            if (filterType) params.set('type', filterType);
            if (filterStatus) params.set('status', filterStatus);
            if (search) params.set('search', search);
            if (dateFrom) params.set('dateFrom', dateFrom);
            if (dateTo) params.set('dateTo', dateTo);

            const res = await fetch(`/api/admin/email-logs?${params.toString()}`);
            const data = await res.json();
            setLogs(data.logs ?? []);
            setTotalPages(data.totalPages ?? 1);
            setTotal(data.total ?? 0);
        } catch {
            /* ignore */
        }
        setLoading(false);
    }, [page, filterType, filterStatus, search, dateFrom, dateTo]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const handleSearch = () => {
        setPage(1);
        fetchLogs();
    };

    const formatDate = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>メール送信履歴</h1>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    合計 {total} 件
                </span>
            </div>

            {/* Filters */}
            <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px',
                padding: '16px 20px',
                marginBottom: '20px',
                display: 'flex',
                gap: '12px',
                flexWrap: 'wrap',
                alignItems: 'flex-end',
            }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.75rem', color: '#9999ae' }}>メールアドレス</label>
                    <input
                        style={{ ...inputStyle, minWidth: '200px' }}
                        placeholder="検索..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.75rem', color: '#9999ae' }}>種別</label>
                    <select
                        style={{ ...inputStyle, minWidth: '140px' }}
                        value={filterType}
                        onChange={e => { setFilterType(e.target.value); setPage(1); }}
                    >
                        <option value="">すべて</option>
                        <option value="welcome">ウェルカム</option>
                        <option value="verify">認証</option>
                        <option value="reset_password">パスワードリセット</option>
                        <option value="step_email">ステップメール</option>
                        <option value="manual">手動</option>
                    </select>
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.75rem', color: '#9999ae' }}>ステータス</label>
                    <select
                        style={{ ...inputStyle, minWidth: '120px' }}
                        value={filterStatus}
                        onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
                    >
                        <option value="">すべて</option>
                        <option value="sent">送信済み</option>
                        <option value="failed">失敗</option>
                    </select>
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.75rem', color: '#9999ae' }}>開始日</label>
                    <input
                        type="date"
                        style={inputStyle}
                        value={dateFrom}
                        onChange={e => { setDateFrom(e.target.value); setPage(1); }}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.75rem', color: '#9999ae' }}>終了日</label>
                    <input
                        type="date"
                        style={inputStyle}
                        value={dateTo}
                        onChange={e => { setDateTo(e.target.value); setPage(1); }}
                    />
                </div>
                <button
                    onClick={handleSearch}
                    style={{
                        padding: '8px 16px',
                        background: '#7c5cfc',
                        border: 'none',
                        color: '#fff',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        height: '38px',
                    }}
                >
                    検索
                </button>
            </div>

            {/* Table */}
            <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px',
                overflow: 'hidden',
            }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)' }}>
                                {['送信日時', '宛先', '種別', '件名', 'ステータス', 'ユーザー'].map(h => (
                                    <th key={h} style={{
                                        padding: '12px 14px',
                                        textAlign: 'left',
                                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                                        whiteSpace: 'nowrap',
                                        fontSize: '0.8rem',
                                    }}>
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                        読み込み中...
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                        メールログがありません
                                    </td>
                                </tr>
                            ) : (
                                logs.map(log => (
                                    <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', color: '#9999ae' }}>
                                            {formatDate(log.sent_at)}
                                        </td>
                                        <td style={{ padding: '10px 14px', color: '#e0e0ee', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {log.email_to}
                                        </td>
                                        <td style={{ padding: '10px 14px' }}>
                                            <span style={{
                                                padding: '2px 8px',
                                                borderRadius: '4px',
                                                fontSize: '0.78rem',
                                                background: 'rgba(124,92,252,0.15)',
                                                color: '#a78bfa',
                                            }}>
                                                {EMAIL_TYPE_LABELS[log.email_type] || log.email_type}
                                            </span>
                                        </td>
                                        <td style={{ padding: '10px 14px', color: '#b0b0c8', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                            title={log.error_message ? `Error: ${log.error_message}` : undefined}
                                        >
                                            {log.subject}
                                        </td>
                                        <td style={{ padding: '10px 14px' }}>
                                            {log.status === 'sent' ? (
                                                <span style={{ color: '#10b981', fontSize: '0.82rem' }}>✓ 送信済み</span>
                                            ) : (
                                                <span style={{ color: '#ef4444', fontSize: '0.82rem' }} title={log.error_message || undefined}>
                                                    ✗ 失敗
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ padding: '10px 14px' }}>
                                            {log.user_id ? (
                                                <Link
                                                    href={`/admin/users?search=${encodeURIComponent(log.users?.email || log.email_to)}`}
                                                    style={{ color: '#60a5fa', textDecoration: 'none', fontSize: '0.82rem' }}
                                                >
                                                    {log.users?.name || log.users?.email || '—'}
                                                </Link>
                                            ) : (
                                                <span style={{ color: '#6b6b85', fontSize: '0.82rem' }}>—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '16px',
                        borderTop: '1px solid rgba(255,255,255,0.06)',
                    }}>
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page <= 1}
                            style={{
                                padding: '6px 12px',
                                background: page <= 1 ? 'transparent' : 'rgba(255,255,255,0.08)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: page <= 1 ? '#555' : '#e0e0ee',
                                borderRadius: '6px',
                                cursor: page <= 1 ? 'not-allowed' : 'pointer',
                                fontSize: '0.82rem',
                            }}
                        >
                            前へ
                        </button>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                            {page} / {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages}
                            style={{
                                padding: '6px 12px',
                                background: page >= totalPages ? 'transparent' : 'rgba(255,255,255,0.08)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: page >= totalPages ? '#555' : '#e0e0ee',
                                borderRadius: '6px',
                                cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                                fontSize: '0.82rem',
                            }}
                        >
                            次へ
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
