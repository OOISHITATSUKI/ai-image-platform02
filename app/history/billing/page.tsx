'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/useTranslation';

// ─── Types ────────────────────────────────────────────────────
interface Transaction {
    id: string;
    packType: string;
    creditsGranted: number;
    amountUsd: number;
    currency: string;
    status: string;
    createdAt: number;
    completedAt?: number;
}

interface CreditLog {
    id: string;
    changeType: 'charge' | 'use' | 'refund' | 'admin';
    delta: number;
    balanceAfter: number;
    relatedId?: string;
    note?: string;
    createdAt: number;
}

type Tab = 'transactions' | 'credits';

// ─── Component ────────────────────────────────────────────────
export default function BillingHistoryPage() {
    const router = useRouter();
    const { user, isAuthenticated } = useAppStore();
    const { t } = useTranslation();

    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [creditLogs, setCreditLogs] = useState<CreditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<Tab>('transactions');

    const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

    const fetchBillingData = useCallback(async () => {
        const token = getToken();
        if (!token) return;
        setLoading(true);
        try {
            const res = await fetch('/api/billing?type=all', {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (res.ok) {
                setTransactions(data.transactions ?? []);
                setCreditLogs(data.creditLog ?? []);
            } else {
                setError(data.error || 'Failed to load');
            }
        } catch {
            setError('接続エラー');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBillingData();
    }, [fetchBillingData]);

    const formatDate = (ts: number) => {
        const d = new Date(ts);
        return d.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });
    };

    const formatTime = (ts: number) => {
        const d = new Date(ts);
        return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    };

    const getStatusLabel = (status: string) => {
        const map: Record<string, string> = {
            pending: '待機中',
            confirming: '確認中',
            completed: '完了',
            failed: '失敗',
            expired: '期限切れ',
        };
        return map[status] || status;
    };

    const getChangeTypeLabel = (type: string) => {
        const map: Record<string, string> = {
            charge: '購入',
            use: '使用',
            refund: '返金',
            admin: '調整',
        };
        return map[type] || type;
    };

    if (!isAuthenticated && typeof window !== 'undefined' && !getToken()) {
        return (
            <div style={styles.emptyContainer}>
                <div style={{ fontSize: '3rem', marginBottom: 16 }}>🔒</div>
                <h2 style={styles.emptyTitle}>ログインが必要です</h2>
                <p style={styles.emptyDesc}>履歴を見るにはログインしてください。</p>
                <Link href="/login" style={styles.ctaButton}>ログイン</Link>
            </div>
        );
    }

    return (
        <div style={styles.page}>
            <div style={styles.header}>
                <div style={styles.headerLeft}>
                    <button onClick={() => router.push('/editor')} style={styles.backBtn}>← 戻る</button>
                    <h1 style={styles.title}>お支払い / クレジット履歴</h1>
                </div>
            </div>

            <div style={styles.tabBar}>
                <button
                    onClick={() => setActiveTab('transactions')}
                    style={{ ...styles.tab, ...(activeTab === 'transactions' ? styles.tabActive : {}) }}
                >
                    購入履歴
                </button>
                <button
                    onClick={() => setActiveTab('credits')}
                    style={{ ...styles.tab, ...(activeTab === 'credits' ? styles.tabActive : {}) }}
                >
                    クレジット履歴
                </button>
            </div>

            {loading ? (
                <div style={styles.emptyContainer}>
                    <div style={styles.spinner} />
                    <p style={styles.emptyDesc}>読み込み中...</p>
                </div>
            ) : error ? (
                <div style={styles.emptyContainer}>
                    <div style={{ fontSize: '3rem', marginBottom: 16 }}>⚠️</div>
                    <p style={styles.emptyDesc}>{error}</p>
                    <button onClick={fetchBillingData} style={styles.ctaButton}>再試行</button>
                </div>
            ) : activeTab === 'transactions' ? (
                <div style={styles.content}>
                    {transactions.length === 0 ? (
                        <div style={styles.emptyContainer}>
                            <p style={styles.emptyDesc}>購入履歴はありません</p>
                        </div>
                    ) : (
                        <div style={styles.tableWrapper}>
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        <th style={styles.th}>日時</th>
                                        <th style={styles.th}>パック</th>
                                        <th style={styles.th}>クレジット</th>
                                        <th style={styles.th}>金額</th>
                                        <th style={styles.th}>ステータス</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.map(tx => (
                                        <tr key={tx.id} style={styles.tr}>
                                            <td style={styles.td}>{formatDate(tx.createdAt)} {formatTime(tx.createdAt)}</td>
                                            <td style={styles.td}>{tx.packType}</td>
                                            <td style={styles.td}>{tx.creditsGranted}</td>
                                            <td style={styles.td}>{tx.amountUsd} {tx.currency}</td>
                                            <td style={styles.td}>
                                                <span style={{
                                                    ...styles.statusBadge,
                                                    background: tx.status === 'completed' ? 'rgba(34,197,94,0.1)' : 'rgba(234,179,8,0.1)',
                                                    color: tx.status === 'completed' ? '#22c55e' : '#eab308'
                                                }}>
                                                    {getStatusLabel(tx.status)}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            ) : (
                <div style={styles.content}>
                    {creditLogs.length === 0 ? (
                        <div style={styles.emptyContainer}>
                            <p style={styles.emptyDesc}>履歴はありません</p>
                        </div>
                    ) : (
                        <div style={styles.tableWrapper}>
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        <th style={styles.th}>日時</th>
                                        <th style={styles.th}>種別</th>
                                        <th style={styles.th}>変動</th>
                                        <th style={styles.th}>残高</th>
                                        <th style={styles.th}>備考</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {creditLogs.map(log => (
                                        <tr key={log.id} style={styles.tr}>
                                            <td style={styles.td}>{formatDate(log.createdAt)} {formatTime(log.createdAt)}</td>
                                            <td style={styles.td}>{getChangeTypeLabel(log.changeType)}</td>
                                            <td style={{ ...styles.td, color: log.delta > 0 ? '#22c55e' : 'var(--text-primary)' }}>
                                                {log.delta > 0 ? `+${log.delta}` : log.delta}
                                            </td>
                                            <td style={styles.td}>{log.balanceAfter}</td>
                                            <td style={styles.td}>{log.note || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    page: {
        height: '100vh',
        overflowY: 'auto',
        background: 'var(--bg-base)',
        color: 'var(--text-primary)',
        padding: '24px 32px 100px',
        maxWidth: 1200,
        margin: '0 auto',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 32,
    },
    headerLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: 16,
    },
    backBtn: {
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '8px 16px',
        color: 'var(--text-secondary)',
        cursor: 'pointer',
        fontSize: '0.85rem',
    },
    title: {
        fontSize: '1.5rem',
        fontWeight: 700,
    },
    tabBar: {
        display: 'flex',
        gap: 12,
        marginBottom: 24,
        borderBottom: '1px solid var(--border)',
        paddingBottom: 12,
    },
    tab: {
        background: 'none',
        border: 'none',
        color: 'var(--text-tertiary)',
        fontSize: '1rem',
        fontWeight: 600,
        cursor: 'pointer',
        padding: '8px 4px',
        position: 'relative' as const,
    },
    tabActive: {
        color: 'var(--primary)',
    },
    content: {
        background: 'var(--bg-card)',
        borderRadius: 12,
        border: '1px solid var(--border)',
        overflow: 'hidden',
    },
    tableWrapper: {
        overflowX: 'auto',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        textAlign: 'left' as const,
    },
    th: {
        padding: '16px',
        fontSize: '0.75rem',
        textTransform: 'uppercase' as const,
        color: 'var(--text-tertiary)',
        borderBottom: '1px solid var(--border)',
        fontWeight: 600,
    },
    td: {
        padding: '16px',
        fontSize: '0.9rem',
        borderBottom: '1px solid var(--border)',
    },
    tr: {
        transition: 'background 0.2s',
    },
    statusBadge: {
        padding: '4px 10px',
        borderRadius: 20,
        fontSize: '0.75rem',
        fontWeight: 600,
    },
    emptyContainer: {
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 300,
        textAlign: 'center' as const,
    },
    emptyTitle: {
        fontSize: '1.2rem',
        marginBottom: 8,
    },
    emptyDesc: {
        color: 'var(--text-secondary)',
    },
    ctaButton: {
        padding: '10px 24px',
        borderRadius: 10,
        background: 'var(--primary)',
        color: '#fff',
        textDecoration: 'none',
        marginTop: 16,
    },
    spinner: {
        width: 32,
        height: 32,
        border: '3px solid var(--border)',
        borderTop: '3px solid var(--primary)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        marginBottom: 16,
    },
};
