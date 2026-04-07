'use client';

import { useEffect, useState } from 'react';

interface GuestActivityData {
    total: number;
    recent: {
        id: string;
        guestId: string;
        guestLabel: string;
        guestTotalGens: number;
        generationType: string;
        prompt: string;
        tags: Record<string, unknown>;
        locale: string;
        registered: boolean;
        createdAt: number;
    }[];
    typeBreakdown: Record<string, { count: number; pct: number }>;
    tagRankings: {
        ethnicity: { key: string; count: number; pct: number }[];
        situation: { key: string; count: number; pct: number }[];
    };
    localeBreakdown: { key: string; count: number; pct: number }[];
    topKeywords: { word: string; count: number }[];
}

interface Stats {
    totalUsers: number;
    newUsersToday: number;
    bannedUsers: number;
    usersThisWeek: number;
    googleUsers: number;
    emailUsers: number;
    totalBlocks: number;
    todayBlocks: number;
    todayGenerations: number;
    totalRevenue: number;
    totalDemoTrials: number;
    todayDemoTrials: number;
    uniqueDemoUsers: number;
    todayUniqueDemoUsers: number;
    guestGenTotal: number;
    guestGenToday: number;
    guestUniqueTotal: number;
    guestUniqueToday: number;
    guestConversionRate: number;
    guestAvgGensBeforeRegister: number;
    guestGenByType: { txt2img: number; faceswap: number; inpaint: number };
    guestUnlockClicks: number;
    guestUnlockedTotal: number;
    guestDailyLimitHitsToday: number;
}

const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    padding: '24px 28px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
};

const labelStyle: React.CSSProperties = {
    fontSize: '0.78rem',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
};

const valueStyle = (color: string): React.CSSProperties => ({
    fontSize: '2rem',
    fontWeight: 700,
    color,
});

export default function AdminDashboardPage() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activity, setActivity] = useState<GuestActivityData | null>(null);
    const [sheetsExporting, setSheetsExporting] = useState(false);
    const [sheetsMessage, setSheetsMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const handleSheetsExport = async () => {
        setSheetsExporting(true);
        setSheetsMessage(null);
        try {
            const res = await fetch('/api/admin/export-to-sheets', {
                method: 'POST',
                headers: { Authorization: localStorage.getItem('auth_token') ?? '' },
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setSheetsMessage({ type: 'success', text: 'スプレッドシートに書き出しました' });
            } else {
                setSheetsMessage({ type: 'error', text: data.error || 'エクスポートに失敗しました' });
            }
        } catch {
            setSheetsMessage({ type: 'error', text: 'ネットワークエラーが発生しました' });
        } finally {
            setSheetsExporting(false);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('auth_token');
        const headers = { Authorization: token ?? '' };
        Promise.all([
            fetch('/api/admin/stats', { headers }).then(r => r.json()),
            fetch('/api/admin/guest-activity', { headers }).then(r => r.json()),
        ]).then(([statsData, activityData]) => {
            if (statsData.error) setError(statsData.error);
            else setStats(statsData);
            if (!activityData.error) setActivity(activityData);
            setLoading(false);
        }).catch(() => { setError('Failed to load stats'); setLoading(false); });
    }, []);

    if (loading) return <div style={{ color: 'var(--text-secondary)' }}>Loading dashboard...</div>;
    if (error) return <div style={{ color: '#ef4444' }}>{error}</div>;
    if (!stats) return null;

    const cards = [
        { label: '総ユーザー数', value: stats.totalUsers.toLocaleString(), color: '#a78bfa' },
        { label: '本日の生成数', value: stats.todayGenerations.toLocaleString(), color: '#34d399' },
        { label: '本日のブロック', value: stats.todayBlocks.toLocaleString(), color: '#f59e0b' },
        { label: '本日の新規登録', value: stats.newUsersToday.toLocaleString(), color: '#60a5fa' },
        { label: 'BAN済みユーザー', value: stats.bannedUsers.toLocaleString(), color: '#f87171' },
        { label: '総売上 (USD)', value: `$${stats.totalRevenue.toFixed(2)}`, color: '#10b981' },
        { label: '今週の新規登録', value: (stats.usersThisWeek ?? 0).toLocaleString(), color: '#38bdf8' },
    ];

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
                    📊 ダッシュボード
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {sheetsMessage && (
                        <span style={{
                            fontSize: '0.85rem',
                            color: sheetsMessage.type === 'success' ? '#34d399' : '#f87171',
                            fontWeight: 500,
                        }}>
                            {sheetsMessage.type === 'success' ? '✓ ' : ''}{sheetsMessage.text}
                        </span>
                    )}
                    <button
                        onClick={handleSheetsExport}
                        disabled={sheetsExporting}
                        style={{
                            background: sheetsExporting ? 'rgba(52,211,153,0.2)' : 'rgba(52,211,153,0.15)',
                            color: '#34d399',
                            border: '1px solid rgba(52,211,153,0.3)',
                            borderRadius: '8px',
                            padding: '8px 16px',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            cursor: sheetsExporting ? 'not-allowed' : 'pointer',
                            opacity: sheetsExporting ? 0.6 : 1,
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {sheetsExporting ? '書き出し中...' : 'Sheetsに今すぐ書き出す'}
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '40px' }}>
                {cards.map(card => (
                    <div key={card.label} style={cardStyle}>
                        <div style={labelStyle}>{card.label}</div>
                        <div style={valueStyle(card.color)}>{card.value}</div>
                    </div>
                ))}
            </div>

            {/* Auth Provider Breakdown */}
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px', color: 'var(--text-primary)' }}>
                🔐 登録方法別
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '40px' }}>
                <div style={cardStyle}>
                    <div style={labelStyle}>Google 登録</div>
                    <div style={valueStyle('#4285F4')}>{(stats.googleUsers ?? 0).toLocaleString()}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {stats.totalUsers > 0 ? Math.round(((stats.googleUsers ?? 0) / stats.totalUsers) * 100) : 0}%
                    </div>
                </div>
                <div style={cardStyle}>
                    <div style={labelStyle}>Email 登録</div>
                    <div style={valueStyle('#a78bfa')}>{(stats.emailUsers ?? 0).toLocaleString()}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {stats.totalUsers > 0 ? Math.round(((stats.emailUsers ?? 0) / stats.totalUsers) * 100) : 0}%
                    </div>
                </div>
            </div>

            {/* Guest Generation Stats */}
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px', color: 'var(--text-primary)' }}>
                🏠 ゲスト生成
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div style={cardStyle}>
                    <div style={labelStyle}>ゲスト生成（総数）</div>
                    <div style={valueStyle('#a78bfa')}>{stats.guestGenTotal?.toLocaleString() || 0}</div>
                </div>
                <div style={cardStyle}>
                    <div style={labelStyle}>本日のゲスト生成</div>
                    <div style={valueStyle('#34d399')}>{stats.guestGenToday?.toLocaleString() || 0}</div>
                </div>
                <div style={cardStyle}>
                    <div style={labelStyle}>ユニークゲスト（総数）</div>
                    <div style={valueStyle('#60a5fa')}>{stats.guestUniqueTotal?.toLocaleString() || 0}</div>
                </div>
                <div style={cardStyle}>
                    <div style={labelStyle}>本日のユニークゲスト</div>
                    <div style={valueStyle('#38bdf8')}>{stats.guestUniqueToday?.toLocaleString() || 0}</div>
                </div>
                <div style={cardStyle}>
                    <div style={labelStyle}>登録コンバージョン率</div>
                    <div style={valueStyle('#10b981')}>{stats.guestConversionRate || 0}%</div>
                </div>
                <div style={cardStyle}>
                    <div style={labelStyle}>アンロック済み画像</div>
                    <div style={valueStyle('#f472b6')}>{stats.guestUnlockedTotal?.toLocaleString() || 0}</div>
                </div>
                <div style={cardStyle}>
                    <div style={labelStyle}>Unlockクリック数</div>
                    <div style={valueStyle('#fb923c')}>{stats.guestUnlockClicks?.toLocaleString() || 0}</div>
                </div>
                <div style={cardStyle}>
                    <div style={labelStyle}>本日の上限到達数</div>
                    <div style={valueStyle('#f87171')}>{stats.guestDailyLimitHitsToday?.toLocaleString() || 0}</div>
                </div>
            </div>
            {stats.guestGenByType && (
                <div style={{ ...cardStyle, marginBottom: '40px' }}>
                    <div style={labelStyle}>機能別ゲスト生成</div>
                    <div style={{ display: 'flex', gap: 24, marginTop: 8 }}>
                        <span style={{ color: '#a78bfa' }}>txt2img: <strong>{stats.guestGenByType.txt2img}</strong></span>
                        <span style={{ color: '#f472b6' }}>Face Swap: <strong>{stats.guestGenByType.faceswap}</strong></span>
                        <span style={{ color: '#fb923c' }}>Inpaint: <strong>{stats.guestGenByType.inpaint}</strong></span>
                    </div>
                </div>
            )}

            {/* ── Guest Activity ── */}
            {activity && (
                <>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px', color: 'var(--text-primary)', marginTop: '16px' }}>
                        🕵️ Guest Activity（テキストデータ）
                    </h2>

                    {/* Type breakdown bar */}
                    <div style={{ ...cardStyle, marginBottom: '16px' }}>
                        <div style={labelStyle}>Generation Type 内訳（全 {activity.total} 件）</div>
                        <div style={{ display: 'flex', gap: 24, marginTop: 8, flexWrap: 'wrap' }}>
                            {Object.entries(activity.typeBreakdown).map(([type, d]) => (
                                <div key={type} style={{ flex: 1, minWidth: 100 }}>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                                        {type === 'txt2img' ? '🖼 txt2img' : type === 'faceswap' ? '🔄 Face Swap' : '🖌 Inpaint'}
                                    </div>
                                    <div style={{ background: 'var(--bg-secondary)', borderRadius: 4, height: 8, marginBottom: 4 }}>
                                        <div style={{ width: `${d.pct}%`, height: '100%', borderRadius: 4, background: type === 'txt2img' ? '#a78bfa' : type === 'faceswap' ? '#f472b6' : '#fb923c' }} />
                                    </div>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{d.count} <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>({d.pct}%)</span></div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Tag rankings + Locale */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                        {/* Ethnicity */}
                        <div style={cardStyle}>
                            <div style={labelStyle}>Ethnicity ランキング</div>
                            {activity.tagRankings.ethnicity.length === 0 && <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 8 }}>データなし</div>}
                            {activity.tagRankings.ethnicity.slice(0, 6).map(e => (
                                <div key={e.key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                                    <div style={{ flex: 1, fontSize: '0.85rem' }}>{e.key}</div>
                                    <div style={{ background: 'var(--bg-secondary)', borderRadius: 4, height: 6, width: 80 }}>
                                        <div style={{ width: `${e.pct}%`, height: '100%', borderRadius: 4, background: '#60a5fa' }} />
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', minWidth: 40, textAlign: 'right' }}>{e.count} ({e.pct}%)</div>
                                </div>
                            ))}
                        </div>

                        {/* Situation */}
                        <div style={cardStyle}>
                            <div style={labelStyle}>Situation ランキング</div>
                            {activity.tagRankings.situation.length === 0 && <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 8 }}>データなし</div>}
                            {activity.tagRankings.situation.slice(0, 6).map(e => (
                                <div key={e.key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                                    <div style={{ flex: 1, fontSize: '0.85rem' }}>{e.key}</div>
                                    <div style={{ background: 'var(--bg-secondary)', borderRadius: 4, height: 6, width: 80 }}>
                                        <div style={{ width: `${e.pct}%`, height: '100%', borderRadius: 4, background: '#34d399' }} />
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', minWidth: 40, textAlign: 'right' }}>{e.count} ({e.pct}%)</div>
                                </div>
                            ))}
                        </div>

                        {/* Locale */}
                        <div style={cardStyle}>
                            <div style={labelStyle}>言語 (Locale) 内訳</div>
                            {activity.localeBreakdown.slice(0, 6).map(e => (
                                <div key={e.key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                                    <div style={{ flex: 1, fontSize: '0.85rem' }}>{e.key}</div>
                                    <div style={{ background: 'var(--bg-secondary)', borderRadius: 4, height: 6, width: 80 }}>
                                        <div style={{ width: `${e.pct}%`, height: '100%', borderRadius: 4, background: '#f59e0b' }} />
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', minWidth: 40, textAlign: 'right' }}>{e.count} ({e.pct}%)</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Top keywords */}
                    {activity.topKeywords.length > 0 && (
                        <div style={{ ...cardStyle, marginBottom: '16px' }}>
                            <div style={labelStyle}>よく使われるキーワード（プロンプト）</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: 10 }}>
                                {activity.topKeywords.map(k => (
                                    <span key={k.word} style={{
                                        background: 'rgba(167,139,250,0.15)',
                                        border: '1px solid rgba(167,139,250,0.3)',
                                        borderRadius: 6,
                                        padding: '3px 10px',
                                        fontSize: `${Math.max(0.7, Math.min(1.1, 0.7 + k.count * 0.05))}rem`,
                                        color: '#a78bfa',
                                    }}>
                                        {k.word} <span style={{ opacity: 0.6, fontSize: '0.75em' }}>{k.count}</span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Recent activity table */}
                    <div style={{ ...cardStyle, marginBottom: '40px', padding: '20px 0', overflow: 'hidden' }}>
                        <div style={{ ...labelStyle, padding: '0 20px 12px' }}>
                            直近のゲスト生成（最大50件）
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                        {['日時', 'ゲスト', '回数', 'Type', 'Locale', 'Prompt', 'Tags', '登録'].map(h => (
                                            <th key={h} style={{ padding: '8px 16px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {activity.recent.length === 0 && (
                                        <tr><td colSpan={8} style={{ padding: '20px 16px', color: 'var(--text-secondary)', textAlign: 'center' }}>データなし</td></tr>
                                    )}
                                    {activity.recent.map(r => {
                                        // Consistent color per guest label
                                        const labelColors = ['#a78bfa', '#f472b6', '#34d399', '#60a5fa', '#f59e0b', '#fb923c', '#38bdf8', '#e879f9', '#4ade80', '#facc15', '#f87171', '#22d3ee'];
                                        const labelIndex = r.guestLabel.charCodeAt(r.guestLabel.length - 1) % labelColors.length;
                                        const guestColor = labelColors[labelIndex] || '#a78bfa';
                                        return (
                                        <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                            <td style={{ padding: '8px 16px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                                                {new Date(r.createdAt).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td style={{ padding: '8px 16px', whiteSpace: 'nowrap' }}>
                                                <span style={{
                                                    display: 'inline-block',
                                                    background: `${guestColor}22`,
                                                    border: `1px solid ${guestColor}55`,
                                                    borderRadius: 6,
                                                    padding: '2px 8px',
                                                    fontSize: '0.78rem',
                                                    fontWeight: 600,
                                                    color: guestColor,
                                                }}>
                                                    {r.guestLabel}
                                                </span>
                                                <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: 2 }}>{r.guestId}</div>
                                            </td>
                                            <td style={{ padding: '8px 16px', whiteSpace: 'nowrap', textAlign: 'center' }}>
                                                <span style={{
                                                    fontWeight: 700,
                                                    fontSize: '0.9rem',
                                                    color: r.guestTotalGens >= 3 ? '#f59e0b' : r.guestTotalGens >= 2 ? '#60a5fa' : 'var(--text-secondary)',
                                                }}>
                                                    {r.guestTotalGens}
                                                </span>
                                            </td>
                                            <td style={{ padding: '8px 16px', whiteSpace: 'nowrap' }}>
                                                <span style={{ color: r.generationType === 'txt2img' ? '#a78bfa' : r.generationType === 'faceswap' ? '#f472b6' : '#fb923c' }}>
                                                    {r.generationType}
                                                </span>
                                            </td>
                                            <td style={{ padding: '8px 16px', color: 'var(--text-secondary)' }}>{r.locale}</td>
                                            <td style={{ padding: '8px 16px', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {r.prompt || <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>（なし）</span>}
                                            </td>
                                            <td style={{ padding: '8px 16px', color: 'var(--text-secondary)', fontSize: '0.75rem', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {Object.entries(r.tags).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => `${k}:${v}`).join(', ') || '—'}
                                            </td>
                                            <td style={{ padding: '8px 16px' }}>
                                                {r.registered
                                                    ? <span style={{ color: '#34d399', fontWeight: 600 }}>✓</span>
                                                    : <span style={{ color: 'var(--text-secondary)' }}>—</span>}
                                            </td>
                                        </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* 7-Day Trend Note */}
            <div style={{ ...cardStyle, padding: '28px', marginBottom: '24px' }}>
                <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px', color: 'var(--text-primary)' }}>
                    📈 直近7日間の推移
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    データが蓄積されると、生成数・新規登録・ブロック数・売上のグラフがここに表示されます。
                </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ ...cardStyle, flex: 1, minWidth: 200 }}>
                    <div style={labelStyle}>累計ブロック</div>
                    <div style={valueStyle('#f59e0b')}>{stats.totalBlocks.toLocaleString()}</div>
                </div>
            </div>
        </div>
    );
}
