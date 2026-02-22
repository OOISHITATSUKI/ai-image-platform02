'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/useTranslation';
import Link from 'next/link';

export default function ProfilePage() {
    const { user, setUser, theme, setTheme, locale, setLocale } = useAppStore();
    const { t } = useTranslation();
    const [editing, setEditing] = useState(false);
    const [newUsername, setNewUsername] = useState(user?.username ?? '');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    const handleSaveUsername = async () => {
        if (!newUsername.trim() || newUsername === user?.username) return;
        setSaving(true);
        setMessage('');
        try {
            const token = localStorage.getItem('auth_token');
            const res = await fetch('/api/auth/me', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ username: newUsername.trim() }),
            });
            const data = await res.json();
            if (res.ok) {
                setUser({ ...user!, username: newUsername.trim() });
                setMessage('保存しました');
                setEditing(false);
            } else {
                setMessage(data.error || 'エラーが発生しました');
            }
        } catch {
            setMessage('接続エラー');
        } finally {
            setSaving(false);
        }
    };

    if (!user) {
        return (
            <div style={{ padding: 40, textAlign: 'center' }}>
                <p>ログインしてください</p>
                <Link href="/login">ログインページへ</Link>
            </div>
        );
    }

    return (
        <div className="settings-view">
            <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '24px' }}>プロフィール設定</h1>

            {/* プロフィール情報 */}
            <div className="settings-section">
                <h3>アカウント情報</h3>
                <div className="settings-row">
                    <span className="settings-row-label">メールアドレス</span>
                    <span className="settings-row-value">{user.email}</span>
                </div>
                <div className="settings-row">
                    <span className="settings-row-label">ユーザー名</span>
                    {editing ? (
                        <div style={{ display: 'flex', gap: 8, flex: 1 }}>
                            <input
                                className="auth-input"
                                style={{ flex: 1 }}
                                value={newUsername}
                                onChange={e => setNewUsername(e.target.value)}
                            />
                            <button className="base-button primary-button" onClick={handleSaveUsername} disabled={saving}>保存</button>
                            <button className="base-button secondary-button" onClick={() => setEditing(false)}>キャンセル</button>
                        </div>
                    ) : (
                        <span className="settings-row-value" onClick={() => setEditing(true)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {user.username} <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>✏️</span>
                        </span>
                    )}
                </div>
                <div className="settings-row">
                    <span className="settings-row-label">プラン</span>
                    <span className="settings-row-value" style={{ textTransform: 'capitalize' }}>{user.plan}</span>
                </div>
                <div className="settings-row">
                    <span className="settings-row-label">クレジット残高</span>
                    <span className="settings-row-value" style={{ color: '#fbbf24', fontWeight: 'bold' }}>{user.credits}</span>
                </div>
                {message && <p style={{ color: message.includes('エラー') ? '#ef4444' : '#10b981', fontSize: '0.9rem', marginTop: '12px' }}>{message}</p>}
            </div>

            {/* テーマ・言語（既存の settings と統合） */}
            <div className="settings-section">
                <h3>表示設定</h3>
                <div className="settings-row">
                    <span className="settings-row-label">テーマ</span>
                    <div className="pill-grid">
                        <button className={`pill ${theme === 'dark' ? 'active' : ''}`} onClick={() => setTheme('dark')}>
                            🌙 ダーク
                        </button>
                        <button className={`pill ${theme === 'light' ? 'active' : ''}`} onClick={() => setTheme('light')}>
                            ☀️ ライト
                        </button>
                    </div>
                </div>
                <div className="settings-row">
                    <span className="settings-row-label">言語</span>
                    <div className="pill-grid">
                        <button className={`pill ${locale === 'ja' ? 'active' : ''}`} onClick={() => setLocale('ja')}>日本語</button>
                        <button className={`pill ${locale === 'en' ? 'active' : ''}`} onClick={() => setLocale('en')}>English</button>
                        <button className={`pill ${locale === 'zh' ? 'active' : ''}`} onClick={() => setLocale('zh')}>中文</button>
                        <button className={`pill ${locale === 'ko' ? 'active' : ''}`} onClick={() => setLocale('ko')}>한국어</button>
                        <button className={`pill ${locale === 'es' ? 'active' : ''}`} onClick={() => setLocale('es')}>Español</button>
                        <button className={`pill ${locale === 'pt' ? 'active' : ''}`} onClick={() => setLocale('pt')}>Português</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
