'use client';

import { useEffect, useState } from 'react';

interface Stats {
    totalUsers: number;
    newUsersToday: number;
    bannedUsers: number;
    totalBlocks: number;
    todayBlocks: number;
    todayGenerations: number;
    totalRevenue: number;
    totalDemoTrials: number;
    todayDemoTrials: number;
    uniqueDemoUsers: number;
    todayUniqueDemoUsers: number;
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

    useEffect(() => {
        const token = localStorage.getItem('auth_token');
        fetch('/api/admin/stats', {
            headers: { Authorization: token ?? '' },
        })
            .then(r => r.json())
            .then(data => {
                if (data.error) setError(data.error);
                else setStats(data);
                setLoading(false);
            })
            .catch(() => { setError('Failed to load stats'); setLoading(false); });
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
    ];

    const demoCards = [
        { label: 'デモ総生成数', value: stats.totalDemoTrials.toLocaleString(), color: '#f472b6' },
        { label: '本日のデモ生成', value: stats.todayDemoTrials.toLocaleString(), color: '#fb923c' },
        { label: 'デモ利用ユニークIP', value: stats.uniqueDemoUsers.toLocaleString(), color: '#a78bfa' },
        { label: '本日のユニークIP', value: stats.todayUniqueDemoUsers.toLocaleString(), color: '#38bdf8' },
    ];

    return (
        <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '28px' }}>
                📊 ダッシュボード
            </h1>

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '40px' }}>
                {cards.map(card => (
                    <div key={card.label} style={cardStyle}>
                        <div style={labelStyle}>{card.label}</div>
                        <div style={valueStyle(card.color)}>{card.value}</div>
                    </div>
                ))}
            </div>

            {/* Demo Stats */}
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px', color: 'var(--text-primary)' }}>
                🎯 お試しデモ（ホームページ）
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '40px' }}>
                {demoCards.map(card => (
                    <div key={card.label} style={cardStyle}>
                        <div style={labelStyle}>{card.label}</div>
                        <div style={valueStyle(card.color)}>{card.value}</div>
                    </div>
                ))}
            </div>

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
