'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/useTranslation';

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

export default function BillingHistoryPage() {
    const router = useRouter();
    const { isAuthenticated } = useAppStore();
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

    useEffect(() => { fetchBillingData(); }, [fetchBillingData]);

    const formatDate = (ts: number) => new Date(ts).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });
    const formatTime = (ts: number) => new Date(ts).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });

    const packLabel: Record<string, string> = {
        basic: 'Basic', unlimited: 'Unlimited',
        starter: 'お試し', light: 'ライト', standard: 'スタンダード', premium: 'プレミアム',
    };

    const statusLabel = (s: string) => ({
        pending: t('pricing.history.statusPending'),
        confirming: t('pricing.history.statusConfirming'),
        completed: t('pricing.history.statusCompleted'),
        failed: t('pricing.history.statusFailed'),
        expired: t('pricing.history.statusExpired'),
    }[s] ?? s);

    const changeTypeLabel = (type: string) => ({
        charge: t('pricing.history.typeCharge'),
        use: t('pricing.history.typeUse'),
        refund: t('pricing.history.typeRefund'),
        admin: t('pricing.history.typeAdmin'),
    }[type] ?? type);

    if (!isAuthenticated && typeof window !== 'undefined' && !getToken()) {
        return (
            <div style={styles.emptyContainer}>
                <div style={{ fontSize: '3rem', marginBottom: 16 }}>🔒</div>
                <h2 style={styles.emptyTitle}>ログインが必要です</h2>
                <Link href="/login" style={styles.ctaButton}>ログイン</Link>
            </div>
        );
    }

    return (
        <div style={styles.page}>
            <div style={styles.header}>
                <div style={styles.headerLeft}>
                    <button onClick={() => router.push('/editor')} style={styles.backBtn}>← 戻る</button>
                    <h1 style={styles.title}>{t('pricing.history.title')}</h1>
                </div>
            </div>

            <div style={styles.tabBar}>
                <button onClick={() => setActiveTab('transactions')} style={{ ...styles.tab, ...(activeTab === 'transactions' ? styles.tabActive : {}) }}>
                    {t('pricing.history.purchaseHistory')}
                </button>
                <button onClick={() => setActiveTab('credits')} style={{ ...styles.tab, ...(activeTab === 'credits' ? styles.tabActive : {}) }}>
                    {t('pricing.history.creditHistory')}
                </button>
            </div>

            {loading ? (
                <div style={styles.emptyContainer}>
                    <div style={styles.spinner} />
                    <p style={styles.emptyDesc}>読み込み中...</p>
                </div>
            ) : error ? (
                <div style={styles.emptyContainer}>
                    <p style={styles.emptyDesc}>{error}</p>
                    <button onClick={fetchBillingData} style={styles.ctaButton}>再試行</button>
                </div>
            ) : activeTab === 'transactions' ? (
                <div style={styles.content}>
                    {transactions.length === 0 ? (
                        <div style={styles.emptyContainer}>
                            <p style={styles.emptyDesc}>{t('pricing.history.noPurchases')}</p>
                        </div>
                    ) : (
                        <div style={styles.tableWrapper}>
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        {[t('pricing.history.date'), t('pricing.history.pack'), t('pricing.history.credits'), t('pricing.history.amount'), t('pricing.history.status')].map(h => (
                                            <th key={h} style={styles.th}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.map(tx => (
                                        <tr key={tx.id} style={styles.tr}>
                                            <td style={styles.td}>{formatDate(tx.createdAt)} {formatTime(tx.createdAt)}</td>
                                            <td style={styles.td}>{packLabel[tx.packType] ?? tx.packType}</td>
                                            <td style={styles.td}>{tx.creditsGranted}</td>
                                            <td style={styles.td}>{tx.amountUsd} {tx.currency}</td>
                                            <td style={styles.td}>
                                                <span style={{
                                                    ...styles.statusBadge,
                                                    background: tx.status === 'completed' ? 'rgba(34,197,94,0.1)' : 'rgba(234,179,8,0.1)',
                                                    color: tx.status === 'completed' ? '#22c55e' : '#eab308',
                                                }}>
                                                    {statusLabel(tx.status)}
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
                            <p style={styles.emptyDesc}>{t('pricing.history.noCredits')}</p>
                        </div>
                    ) : (
                        <div style={styles.tableWrapper}>
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        {[t('pricing.history.date'), t('pricing.history.type'), t('pricing.history.change'), t('pricing.history.balance'), t('pricing.history.note')].map(h => (
                                            <th key={h} style={styles.th}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {creditLogs.map(log => (
                                        <tr key={log.id} style={styles.tr}>
                                            <td style={styles.td}>{formatDate(log.createdAt)} {formatTime(log.createdAt)}</td>
                                            <td style={styles.td}>{changeTypeLabel(log.changeType)}</td>
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
    page: { height: '100vh', overflowY: 'auto', background: 'var(--bg-base)', color: 'var(--text-primary)', padding: '24px 32px 100px', maxWidth: 1200, margin: '0 auto' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
    headerLeft: { display: 'flex', alignItems: 'center', gap: 16 },
    backBtn: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 16px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem' },
    title: { fontSize: '1.5rem', fontWeight: 700 },
    tabBar: { display: 'flex', gap: 12, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 12 },
    tab: { background: 'none', border: 'none', color: 'var(--text-tertiary)', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', padding: '8px 4px' },
    tabActive: { color: 'var(--primary)' },
    content: { background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' },
    tableWrapper: { overflowX: 'auto' },
    table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
    th: { padding: '16px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border)', fontWeight: 600 },
    td: { padding: '16px', fontSize: '0.9rem', borderBottom: '1px solid var(--border)' },
    tr: { transition: 'background 0.2s' },
    statusBadge: { padding: '4px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600 },
    emptyContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, textAlign: 'center' },
    emptyTitle: { fontSize: '1.2rem', marginBottom: 8 },
    emptyDesc: { color: 'var(--text-secondary)' },
    ctaButton: { padding: '10px 24px', borderRadius: 10, background: 'var(--primary)', color: '#fff', textDecoration: 'none', marginTop: 16 },
    spinner: { width: 32, height: 32, border: '3px solid var(--border)', borderTop: '3px solid var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: 16 },
};
