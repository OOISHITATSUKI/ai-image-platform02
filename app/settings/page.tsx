'use client';

import React from 'react';
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
