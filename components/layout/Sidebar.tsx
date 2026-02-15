'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/useTranslation';
import type { GenerationType, Locale } from '@/lib/types';

export default function Sidebar() {
    const {
        chats,
        activeChatId,
        createChat,
        setActiveChat,
        deleteChat,
        renameChat,
        settings,
        setGenerationType,
        user,
        sidebarCollapsed,
        locale,
        setLocale,
        theme,
        setTheme,
    } = useAppStore();

    const { t } = useTranslation();
    const [editingChatId, setEditingChatId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [chatHistoryOpen, setChatHistoryOpen] = useState(true);
    const editInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    const handleNewChat = () => {
        createChat();
        router.push('/editor');
    };

    const formatRelativeTime = (ts: number) => {
        const diff = Date.now() - ts;
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return 'just now';
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days === 1) return 'yesterday';
        if (days < 7) return `${days}d ago`;
        return new Date(ts).toLocaleDateString();
    };


    const handleSelectChat = (id: string) => {
        setActiveChat(id);
        router.push('/editor');
    };

    const handleStartRename = (id: string, currentName: string) => {
        setEditingChatId(id);
        setEditName(currentName);
        setTimeout(() => editInputRef.current?.focus(), 50);
    };

    const handleFinishRename = (id: string) => {
        if (editName.trim()) {
            renameChat(id, editName.trim());
        }
        setEditingChatId(null);
    };

    const handleGenTypeClick = (type: GenerationType) => {
        setGenerationType(type);
        if (chats.length === 0) {
            createChat();
        }
    };

    const navItems = [
        { icon: '🏠', labelKey: 'nav.home', href: '/' },
        { icon: '📂', labelKey: 'nav.library', href: '/library' },
    ];

    const imageGenItems: { icon: string; labelKey: string; type: GenerationType }[] = [
        { icon: '✏️', labelKey: 'create.txt2img', type: 'txt2img' },
        { icon: '🖼️', labelKey: 'create.img2img', type: 'img2img' },
        // { icon: '🎨', labelKey: 'create.imgEdit', type: 'img_edit' },  // Hidden: overlaps with img2img. Uncomment to restore.
    ];

    const videoGenItems: { icon: string; labelKey: string; type: GenerationType }[] = [
        { icon: '📝', labelKey: 'create.txt2vid', type: 'txt2vid' },
        { icon: '🎬', labelKey: 'create.img2vid', type: 'img2vid' },
        { icon: '👤', labelKey: 'create.ref2vid', type: 'ref2vid' },
        { icon: '📹', labelKey: 'create.vid2vid', type: 'vid2vid' },
    ];

    const languages: { value: Locale; label: string }[] = [
        { value: 'en', label: 'English' },
        { value: 'ja', label: '日本語' },
        { value: 'es', label: 'Español' },
        { value: 'zh', label: '中文' },
        { value: 'ko', label: '한국어' },
        { value: 'pt', label: 'Português' },
    ];

    const [showAccountMenu, setShowAccountMenu] = useState(false);
    const accountMenuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
                setShowAccountMenu(false);
            }
        };
        if (showAccountMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showAccountMenu]);

    return (
        <nav className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
            {/* Logo */}
            <div className="sidebar-header">
                <Link href="/" className="sidebar-logo">
                    <div className="logo-icon">⚡</div>
                    {!sidebarCollapsed && <span>VideoGen</span>}
                </Link>
            </div>

            {/* New Chat Button */}
            <button className="sidebar-new-chat" onClick={handleNewChat}>
                <span>＋</span>
                {!sidebarCollapsed && <span>{t('chat.newChat')}</span>}
            </button>

            {/* Scrollable area: nav sections + chat history */}
            <div className="sidebar-scroll-area">

                {/* Main Nav */}
                <div className="nav-section">
                    <div className="nav-label">{t('nav.home').toUpperCase() === t('nav.home') ? 'Main' : t('nav.home')}</div>
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="nav-item"
                        >
                            <span className="nav-icon">{item.icon}</span>
                            {!sidebarCollapsed && t(item.labelKey)}
                        </Link>
                    ))}
                </div>

                {/* Image Generation */}
                <div className="nav-section">
                    <div className="nav-label">{t('create.imageGen')}</div>
                    {imageGenItems.map((item) => (
                        <Link
                            key={item.type}
                            href="/editor"
                            className={`nav-item ${settings.generationType === item.type ? 'active' : ''}`}
                            onClick={() => handleGenTypeClick(item.type)}
                        >
                            <span className="nav-icon">{item.icon}</span>
                            {!sidebarCollapsed && t(item.labelKey)}
                        </Link>
                    ))}
                </div>

                {/* VIDEO GENERATION — Hidden for now. Uncomment to restore when video features are ready.
                <div className="nav-section">
                    <div className="nav-label">{t('create.videoGen')}</div>
                    {videoGenItems.map((item) => (
                        <Link
                            key={item.type}
                            href="/editor"
                            className={`nav-item ${settings.generationType === item.type ? 'active' : ''}`}
                            onClick={() => handleGenTypeClick(item.type)}
                        >
                            <span className="nav-icon">{item.icon}</span>
                            {!sidebarCollapsed && t(item.labelKey)}
                        </Link>
                    ))}
                </div>
                */}

                {/* Chat History */}
                <div className="chat-history-section">
                    <div
                        className="chat-history-header"
                        onClick={() => setChatHistoryOpen((v) => !v)}
                        style={{ cursor: 'pointer', userSelect: 'none' }}
                    >
                        <span>{t('chat.history')}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {chats.length > 0 && (
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>
                                    {chats.length}
                                </span>
                            )}
                            <span className={`chat-history-chevron ${chatHistoryOpen ? 'open' : ''}`}>▾</span>
                        </div>
                    </div>
                    {chatHistoryOpen && (
                        <div className="chat-history-list">
                            {chats.length === 0 && (
                                <div className="chat-empty-placeholder">
                                    <div style={{ fontSize: '1.6rem', marginBottom: 8, opacity: 0.4 }}>💬</div>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', textAlign: 'center', lineHeight: 1.5 }}>
                                        {t('chat.empty')}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textAlign: 'center', marginTop: 4, opacity: 0.6 }}>
                                        Click &quot;＋&quot; above to start
                                    </div>
                                </div>
                            )}
                            {chats.map((chat) => (
                                <div
                                    key={chat.id}
                                    className={`chat-history-item ${activeChatId === chat.id ? 'active' : ''}`}
                                    onClick={() => handleSelectChat(chat.id)}
                                    onDoubleClick={(e) => {
                                        e.stopPropagation();
                                        handleStartRename(chat.id, chat.name);
                                    }}
                                    onContextMenu={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        // Simple confirm-based context menu
                                        const action = window.prompt(
                                            `"${chat.name}"\n\n1 = リネーム\n2 = 削除\n\n番号を入力:`,
                                        );
                                        if (action === '1') handleStartRename(chat.id, chat.name);
                                        if (action === '2') {
                                            if (window.confirm(`"${chat.name}" を削除しますか？`)) {
                                                deleteChat(chat.id);
                                            }
                                        }
                                    }}
                                >
                                    <span className="nav-icon">💬</span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        {editingChatId === chat.id ? (
                                            <input
                                                ref={editInputRef}
                                                className="chat-name"
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                onBlur={() => handleFinishRename(chat.id)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleFinishRename(chat.id);
                                                    if (e.key === 'Escape') setEditingChatId(null);
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                                style={{
                                                    background: 'var(--bg-input)',
                                                    border: '1px solid var(--primary)',
                                                    borderRadius: '4px',
                                                    padding: '2px 6px',
                                                    fontSize: '0.82rem',
                                                    color: 'var(--text-primary)',
                                                    width: '100%',
                                                    outline: 'none',
                                                }}
                                            />
                                        ) : (
                                            <>
                                                <div className="chat-name">{chat.name}</div>
                                                <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', marginTop: 1 }}>
                                                    {chat.messages.length} msgs · {formatRelativeTime(chat.updatedAt)}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <div className="chat-actions">
                                        <button
                                            className="chat-action-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleStartRename(chat.id, chat.name);
                                            }}
                                            title={t('actions.rename')}
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            className="chat-action-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteChat(chat.id);
                                            }}
                                            title={t('actions.delete')}
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>{/* end sidebar-scroll-area */}

            {/* Footer */}
            <div className="sidebar-footer">
                {/* Account Menu Popup */}
                {showAccountMenu && (
                    <div className="account-menu-overlay" ref={accountMenuRef}>
                        <div className="account-menu-header">
                            <div className="account-menu-user">
                                <div className="user-avatar" style={{ width: 40, height: 40, fontSize: '1.2rem' }}>
                                    {user?.username?.[0]?.toUpperCase() ?? 'G'}
                                </div>
                                <div className="account-menu-user-info">
                                    <div className="account-menu-username">{user?.username ?? t('auth.guest')}</div>
                                    <div className="account-menu-email">{user?.email ?? 'guest@example.com'}</div>
                                </div>
                            </div>
                            <div className="account-menu-status">
                                <div className="status-item">
                                    <span>💎 {t('account.currentPlan')}</span>
                                    <span className="status-value">{user?.plan ?? 'Free'}</span>
                                </div>
                                <div className="status-item">
                                    <span>✨ {t('credits.label')}</span>
                                    <span className="status-value">{user?.credits ?? 0}</span>
                                </div>
                            </div>
                        </div>

                        <div className="account-menu-section">
                            <Link href="/pricing" className="account-menu-item" onClick={() => setShowAccountMenu(false)}>
                                <span className="account-menu-item-icon">🔄</span>
                                <span className="account-menu-item-label">{t('account.changePlan')}</span>
                            </Link>
                            <button className="account-menu-item" onClick={() => alert('Coming soon!')}>
                                <span className="account-menu-item-icon">💳</span>
                                <span className="account-menu-item-label">{t('account.payment')}</span>
                            </button>
                            <div className="account-menu-item">
                                <span className="account-menu-item-icon">{theme === 'dark' ? '🌙' : '☀️'}</span>
                                <span className="account-menu-item-label">{t('account.theme')}</span>
                                <div
                                    className={`toggle-switch-compact ${theme === 'dark' ? 'active' : ''}`}
                                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                                >
                                    <div className="toggle-dot-compact" />
                                </div>
                            </div>
                            <div className="account-menu-item">
                                <span className="account-menu-item-icon">🌍</span>
                                <span className="account-menu-item-label">{t('account.language')}</span>
                                <select
                                    className="lang-select-small"
                                    value={locale}
                                    onChange={(e) => setLocale(e.target.value as Locale)}
                                >
                                    {languages.map(l => (
                                        <option key={l.value} value={l.value}>{l.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="account-menu-section">
                            <Link href="/terms" className="account-menu-item" onClick={() => setShowAccountMenu(false)}>
                                <span className="account-menu-item-icon">📄</span>
                                <span className="account-menu-item-label">{t('account.terms')}</span>
                            </Link>
                            <Link href="/privacy" className="account-menu-item" onClick={() => setShowAccountMenu(false)}>
                                <span className="account-menu-item-icon">🔒</span>
                                <span className="account-menu-item-label">{t('account.privacy')}</span>
                            </Link>
                            <Link href="/help" className="account-menu-item" onClick={() => setShowAccountMenu(false)}>
                                <span className="account-menu-item-icon">❓</span>
                                <span className="account-menu-item-label">{t('account.help')}</span>
                            </Link>
                            <button className="account-menu-item" onClick={() => alert('Contact: support@example.com')}>
                                <span className="account-menu-item-icon">📧</span>
                                <span className="account-menu-item-label">{t('account.contact')}</span>
                            </button>
                        </div>

                        <div className="account-menu-footer">
                            <button className="account-menu-item logout-item" onClick={() => window.location.reload()}>
                                <span className="account-menu-item-icon">🚪</span>
                                <span className="account-menu-item-label">{t('account.logout')}</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Credits - Hidden when collapsed */}
                {!sidebarCollapsed && (
                    <div className="credits-panel" style={{ marginBottom: 12 }}>
                        <div className="credits-label">{t('credits.label')}</div>
                        <div className="credits-value">{user?.credits ?? 0}</div>
                        <div className="credits-bar">
                            <div
                                className="credits-bar-fill"
                                style={{ width: `${Math.min(((user?.credits ?? 0) / 100) * 100, 100)}%` }}
                            />
                        </div>
                        <Link href="/pricing" className="upgrade-btn" style={{ textAlign: 'center', display: 'block' }}>
                            {t('credits.upgrade')}
                        </Link>
                    </div>
                )}

                {/* User Profile Bar */}
                <div
                    className={`user-profile-bar ${showAccountMenu ? 'active' : ''}`}
                    onClick={() => setShowAccountMenu(!showAccountMenu)}
                >
                    <div className="user-avatar">
                        {user?.username?.[0]?.toUpperCase() ?? 'G'}
                    </div>
                    {!sidebarCollapsed && (
                        <div className="user-info">
                            <div className="user-name">{user?.username ?? t('auth.guest')}</div>
                            <div className="user-plan-badge">{user?.plan ?? 'Free'}</div>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}
