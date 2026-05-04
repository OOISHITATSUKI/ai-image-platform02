'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/useTranslation';
import type { ThemeMode, Locale } from '@/lib/types';

export default function SettingsPage() {
    const { theme, setTheme, locale, setLocale, user } = useAppStore();
    const { t } = useTranslation();

    const languages: { value: Locale; label: string }[] = [
        { value: 'en', label: 'English' },
        { value: 'ja', label: '日本語' },
        { value: 'es', label: 'Español' },
        { value: 'zh', label: '中文' },
        { value: 'ko', label: '한국어' },
        { value: 'pt', label: 'Português' },
        { value: 'hi', label: 'हिन्दी' },
    ];

    return (
        <div className="settings-view">
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 700, marginBottom: 32 }}>
                {t('settings.title')}
            </h1>

            {/* Profile */}
            <div className="settings-section">
                <h3>{t('settings.profile')}</h3>
                <div className="settings-row">
                    <span className="settings-row-label">{t('settings.username')}</span>
                    <span className="settings-row-value">{user?.username ?? t('auth.guest')}</span>
                </div>
                <div className="settings-row">
                    <span className="settings-row-label">{t('settings.email')}</span>
                    <span className="settings-row-value">{user?.email ?? 'Not logged in'}</span>
                </div>
                <div className="settings-row">
                    <span className="settings-row-label">{t('settings.avatar')}</span>
                    <div className="user-avatar" style={{ width: 40, height: 40 }}>
                        {user?.username?.[0]?.toUpperCase() ?? 'G'}
                    </div>
                </div>
            </div>

            {/* Appearance */}
            <div className="settings-section">
                <h3>{t('settings.appearance')}</h3>
                <div className="settings-row">
                    <span className="settings-row-label">{t('settings.theme')}</span>
                    <div className="pill-grid">
                        <button
                            className={`pill ${theme === 'dark' ? 'active' : ''}`}
                            onClick={() => setTheme('dark')}
                        >
                            🌙 {t('settings.dark')}
                        </button>
                        <button
                            className={`pill ${theme === 'light' ? 'active' : ''}`}
                            onClick={() => setTheme('light')}
                        >
                            ☀️ {t('settings.light')}
                        </button>
                    </div>
                </div>
                <div className="settings-row">
                    <span className="settings-row-label">{t('settings.language')}</span>
                    <select
                        className="custom-select"
                        style={{ width: 'auto', minWidth: 160 }}
                        value={locale}
                        onChange={(e) => setLocale(e.target.value as Locale)}
                    >
                        {languages.map((lang) => (
                            <option key={lang.value} value={lang.value}>
                                {lang.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Fanvue Integration */}
            <FanvueSection />

            {/* Subscription */}
            <div className="settings-section">
                <h3>{t('settings.subscription')}</h3>
                <div className="settings-row">
                    <span className="settings-row-label">{t('settings.currentPlan')}</span>
                    <span className="settings-row-value" style={{ color: 'var(--primary)', fontWeight: 600 }}>
                        {user?.plan ?? 'Free'}
                    </span>
                </div>
                <div className="settings-row">
                    <span className="settings-row-label">{t('credits.label')}</span>
                    <span className="settings-row-value">{user?.credits ?? 10}</span>
                </div>
                <div style={{ marginTop: 16 }}>
                    <button className="upgrade-btn" style={{ maxWidth: 200 }}>
                        {t('settings.managePlan')}
                    </button>
                </div>
            </div>
        </div>
    );
}

function FanvueSection() {
    const [handle, setHandle] = useState('');
    const [connected, setConnected] = useState(false);
    const [currentHandle, setCurrentHandle] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        const token = localStorage.getItem('auth_token');
        if (!token) return;
        fetch('/api/user/connect-fanvue', {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(r => r.json())
            .then(data => {
                if (data.connected) {
                    setConnected(true);
                    setCurrentHandle(data.handle);
                    setHandle(data.handle || '');
                }
            })
            .catch(() => {});
    }, []);

    const handleConnect = async () => {
        if (!handle.trim()) return;
        setLoading(true);
        setMessage(null);
        try {
            const token = localStorage.getItem('auth_token');
            const res = await fetch('/api/user/connect-fanvue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ fanvue_handle: handle.trim() }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setConnected(true);
            setCurrentHandle(handle.trim().toLowerCase());
            const pendingMsg = data.pendingCreditsGranted > 0
                ? ` +${data.pendingCreditsGranted} credits granted from ${data.pendingTransactions} pending transactions!`
                : '';
            setMessage({ type: 'success', text: `Connected to @${handle.trim()}!${pendingMsg}` });
        } catch (err) {
            setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to connect' });
        } finally {
            setLoading(false);
        }
    };

    const handleDisconnect = async () => {
        if (!confirm('Disconnect your Fanvue account?')) return;
        setLoading(true);
        try {
            const token = localStorage.getItem('auth_token');
            await fetch('/api/user/connect-fanvue', {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            setConnected(false);
            setCurrentHandle(null);
            setHandle('');
            setMessage({ type: 'success', text: 'Disconnected' });
        } catch {
            setMessage({ type: 'error', text: 'Failed to disconnect' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="settings-section">
            <h3>🔗 Fanvue</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.5 }}>
                Connect your Fanvue account to earn ImageNude credits when you subscribe, tip, or purchase content.
            </p>
            {message && (
                <div style={{
                    padding: '8px 12px', borderRadius: 8, marginBottom: 12, fontSize: '0.82rem',
                    background: message.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                    border: `1px solid ${message.type === 'success' ? '#22c55e' : '#ef4444'}`,
                    color: message.type === 'success' ? '#4ade80' : '#f87171',
                }}>
                    {message.text}
                </div>
            )}
            {connected ? (
                <div>
                    <div className="settings-row">
                        <span className="settings-row-label">Fanvue Handle</span>
                        <span className="settings-row-value" style={{ color: '#a78bfa', fontWeight: 600 }}>@{currentHandle}</span>
                    </div>
                    <button
                        onClick={handleDisconnect}
                        disabled={loading}
                        style={{
                            marginTop: 8, padding: '6px 16px', borderRadius: 8,
                            border: '1px solid rgba(239,68,68,0.3)', background: 'transparent',
                            color: '#f87171', fontSize: '0.78rem', cursor: 'pointer',
                        }}
                    >
                        {loading ? '...' : 'Disconnect'}
                    </button>
                </div>
            ) : (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                        type="text"
                        value={handle}
                        onChange={(e) => setHandle(e.target.value)}
                        placeholder="Your Fanvue username"
                        maxLength={30}
                        style={{
                            flex: 1, padding: '8px 12px', borderRadius: 8,
                            border: '1px solid var(--border-color, #333)',
                            background: 'var(--bg-secondary, #1a1a2e)',
                            color: 'var(--text-primary)', fontSize: '0.85rem',
                        }}
                    />
                    <button
                        onClick={handleConnect}
                        disabled={loading || !handle.trim()}
                        style={{
                            padding: '8px 20px', borderRadius: 8, fontWeight: 600, fontSize: '0.85rem',
                            background: 'linear-gradient(135deg, #a78bfa, #f472b6)',
                            color: '#fff', border: 'none', cursor: 'pointer',
                            opacity: loading || !handle.trim() ? 0.5 : 1,
                        }}
                    >
                        {loading ? '...' : 'Connect'}
                    </button>
                </div>
            )}
        </div>
    );
}
