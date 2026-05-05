'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/useTranslation';
import type { GenerationType, Locale } from '@/lib/types';
import HowToUseModal from '@/components/companions/HowToUseModal';

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
        isAuthenticated,
        logout,
        sidebarCollapsed,
        locale,
        setLocale,
        theme,
        setTheme,
    } = useAppStore();

    const { t } = useTranslation();
    const [editingChatId, setEditingChatId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [chatHistoryOpen, setChatHistoryOpen] = useState(false);
    const [girlfriendsOpen, setGirlfriendsOpen] = useState(true);
    const [createOpen, setCreateOpen] = useState(false);
    const editInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();
    const pathname = usePathname();

    // / is now a redirect to /companions, so the image editor lives only at /editor.
    const editorHref = '/editor';

    const closeSidebarOnMobile = () => {
        if (typeof window !== 'undefined' && window.innerWidth <= 768) {
            useAppStore.setState({ sidebarCollapsed: true });
        }
    };

    const handleNewChat = () => {
        createChat();
        closeSidebarOnMobile();
        if (!isOnEditor) router.push(editorHref);
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
        closeSidebarOnMobile();
        if (!isOnEditor) router.push(editorHref);
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

    // / is a redirect now; the editor page is /editor only.
    const isOnEditor = pathname === '/editor';

    const handleGenTypeClick = (type: GenerationType, e?: React.MouseEvent) => {
        setGenerationType(type);
        if (chats.length === 0) {
            createChat();
        }
        closeSidebarOnMobile();
        // If already on an editor page, prevent navigation — just switch mode
        if (isOnEditor && e) {
            e.preventDefault();
        }
    };

    const isPremiumUser = !!user && user.plan !== 'free';

    type GirlfriendNav = {
        icon: string;
        label: string;
        href: string;
        isPremium?: boolean;
        isActive: (p: string | null) => boolean;
    };

    const girlfriendNavItems: GirlfriendNav[] = [
        {
            icon: '🏠',
            label: t('companions.sidebarHome'),
            href: '/companions',
            isActive: (p) => p === '/companions',
        },
        {
            icon: '🔴',
            label: t('companions.sidebarLiveAction'),
            href: '/companions#live-action',
            isActive: (p) => !!p && p.endsWith('/live'),
        },
        {
            icon: '✨',
            label: t('companions.sidebarNudeAssistant'),
            href: '/companions/assistant',
            isActive: (p) => p === '/companions/assistant',
        },
    ];

    const createNavItems: { icon: string; label: string; type: GenerationType }[] = [
        { icon: '🖼️', label: 'Image',     type: 'txt2img' },
        { icon: '👤', label: 'Face Swap', type: 'face_swap' },
        { icon: '✂️', label: 'Undress',   type: 'inpaint' },
        { icon: '🎬', label: 'Video',     type: 'img2vid' },
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
    const [unlockedNewCount, setUnlockedNewCount] = useState(0);
    const [showHowToUse, setShowHowToUse] = useState(false);

    const isCompanionsPage = !!pathname && pathname.startsWith('/companions');

    const handleAssistantClick = () => {
        // Always navigate to /companions/assistant; the page shows a teaser + CTA
        // for free users instead of blocking with a modal.
        closeSidebarOnMobile();
    };

    const handleHowToUseClick = () => {
        if (isCompanionsPage) {
            setShowHowToUse(true);
            return;
        }
        const w = window as unknown as Record<string, unknown>;
        const key = settings.generationType === 'inpaint'
            ? '__openInpaintTutorial'
            : settings.generationType === 'face_swap'
                ? '__openFaceSwapTutorial'
                : '__openQAModal';
        const fn = w[key];
        if (typeof fn === 'function') (fn as () => void)();
    };

    // Check for newly unlocked guest images badge
    React.useEffect(() => {
        if (typeof window === 'undefined') return;
        const count = parseInt(localStorage.getItem('guest_unlocked_new') || '0', 10);
        if (count > 0) setUnlockedNewCount(count);
    }, [isAuthenticated]);

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
            {/* Logo — compact */}
            <div className="sidebar-header" style={{ padding: sidebarCollapsed ? '12px 8px' : '10px 16px' }}>
                <Link href="/companions" className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', overflow: 'hidden' }}>
                    {!sidebarCollapsed ? (
                        <>
                            <img src="/logo-dark.png" alt="Image Nude" className="app-logo logo-dark" style={{ maxHeight: 28 }} />
                            <img src="/logo-light.png" alt="Image Nude" className="app-logo logo-light" style={{ maxHeight: 28 }} />
                        </>
                    ) : (
                        <div className="logo-icon">⚡</div>
                    )}
                </Link>
            </div>

            {/* Scrollable area: nav sections + chat history */}
            <div className="sidebar-scroll-area">

                {/* 💕 GIRLFRIENDS — collapsible */}
                <div className="nav-section nav-section-girlfriends">
                    {!sidebarCollapsed ? (
                        <div
                            className="nav-section-label"
                            onClick={() => setGirlfriendsOpen(v => !v)}
                            style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', userSelect: 'none' }}
                        >
                            <span>💕 GIRLFRIENDS</span>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', transition: 'transform 0.2s', transform: girlfriendsOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}>▾</span>
                        </div>
                    ) : (
                        <div className="nav-section-label">💕</div>
                    )}
                    {(girlfriendsOpen || sidebarCollapsed) && girlfriendNavItems.map((item) => {
                        const active = item.isActive(pathname);
                        const locked = !!item.isPremium && !isPremiumUser;
                        return (
                            <Link
                                key={item.label}
                                href={item.href}
                                className={`nav-item ${active ? 'active' : ''}`}
                                onClick={() => {
                                    if (item.isPremium) {
                                        handleAssistantClick();
                                    } else {
                                        closeSidebarOnMobile();
                                    }
                                }}
                            >
                                <span className="nav-icon">{item.icon}</span>
                                {!sidebarCollapsed && (
                                    <span className="nav-label-text">
                                        {item.label}
                                        {locked && <span className="nav-lock-badge">🔒</span>}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </div>

                {/* 🎨 CREATE — collapsible */}
                <div className="nav-section nav-section-create">
                    {!sidebarCollapsed ? (
                        <div
                            className="nav-section-label"
                            onClick={() => setCreateOpen(v => !v)}
                            style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', userSelect: 'none' }}
                        >
                            <span>🎨 CREATE</span>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', transition: 'transform 0.2s', transform: createOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}>▾</span>
                        </div>
                    ) : (
                        <div className="nav-section-label">🎨</div>
                    )}
                    {(createOpen || sidebarCollapsed) && createNavItems.map((item) => {
                        const isActive = item.type === 'img2vid'
                            ? ['txt2vid', 'img2vid', 'ref2vid', 'vid2vid'].includes(settings.generationType)
                            : settings.generationType === item.type;
                        return (
                            <Link
                                key={item.type}
                                href={editorHref}
                                className={`nav-item ${isActive ? 'active' : ''}`}
                                onClick={(e) => handleGenTypeClick(item.type, e)}
                            >
                                <span className="nav-icon">{item.icon}</span>
                                {!sidebarCollapsed && <span>{item.label}</span>}
                            </Link>
                        );
                    })}
                </div>

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

                {/* Library — below chat history */}
                {!sidebarCollapsed && (
                    <Link
                        href="/library"
                        className="nav-item"
                        style={{ margin: '4px 12px 8px', borderRadius: 8 }}
                        onClick={() => {
                            closeSidebarOnMobile();
                            if (unlockedNewCount > 0) {
                                localStorage.removeItem('guest_unlocked_new');
                                setUnlockedNewCount(0);
                            }
                        }}
                    >
                        <span className="nav-icon">📁</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                            {t('nav.library')}
                            {unlockedNewCount > 0 && (
                                <span style={{
                                    background: '#ef4444', color: '#fff', fontSize: '0.6rem',
                                    fontWeight: 700, borderRadius: 10, padding: '1px 6px',
                                    minWidth: 18, textAlign: 'center', lineHeight: '16px',
                                }}>{unlockedNewCount}</span>
                            )}
                        </span>
                    </Link>
                )}

            </div>{/* end sidebar-scroll-area */}

            {/* Footer */}
            <div className="sidebar-footer">
                {/* Account Menu Popup */}
                {showAccountMenu && (
                    <div className="account-menu-overlay" ref={accountMenuRef}>
                        <div className="account-menu-header" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '1.2rem' }}>👤</span>
                            <span style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>{user?.username ?? t('auth.guest')}</span>
                        </div>

                        <div className="account-menu-section">
                            <Link href="/profile" className="account-menu-item" onClick={() => setShowAccountMenu(false)}>
                                <span className="account-menu-item-icon">👤</span>
                                <span className="account-menu-item-label">{t('account.profileSettings')}</span>
                            </Link>
                            <Link href="/pricing" className="account-menu-item" onClick={() => setShowAccountMenu(false)}>
                                <span className="account-menu-item-icon">💰</span>
                                <span className="account-menu-item-label">{t('account.creditsCharge')}</span>
                            </Link>
                            <Link href="/history/generation" className="account-menu-item" onClick={() => setShowAccountMenu(false)}>
                                <span className="account-menu-item-icon">🖼️</span>
                                <span className="account-menu-item-label">{t('account.generationHistory')}</span>
                            </Link>
                            <Link href="/history/billing" className="account-menu-item" onClick={() => setShowAccountMenu(false)}>
                                <span className="account-menu-item-icon">💳</span>
                                <span className="account-menu-item-label">{t('account.purchaseHistory')}</span>
                            </Link>
                            <Link href="/settings" className="account-menu-item" onClick={() => setShowAccountMenu(false)}>
                                <span className="account-menu-item-icon">⚙️</span>
                                <span className="account-menu-item-label">{t('account.settings')}</span>
                            </Link>
                        </div>

                        <div className="account-menu-footer">
                            <button className="account-menu-item logout-item" onClick={() => { logout(); router.push('/login'); }}>
                                <span className="account-menu-item-icon">🚪</span>
                                <span className="account-menu-item-label">{t('account.logout')}</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Terms Warning */}
                {!sidebarCollapsed && user && !user.termsAgreedAt && (
                    <div style={{margin:'0 12px 8px',padding:'8px 12px',background:'#3a2a1a',border:'1px solid #f59e0b44',borderRadius:8,fontSize:'0.75rem',color:'#fbbf24',display:'flex',alignItems:'center',gap:6}}>
                        <span>⚠</span><span>Terms not yet accepted</span>
                    </div>
                )}
                {/* Library link removed from here — now below chat history */}

                {/* Credits Panel - Hidden when collapsed */}
                {!sidebarCollapsed && (
                    <div className="credits-panel" style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                                ✨ {t('credits.label')}
                            </span>
                            <span style={{
                                fontSize: '1.1rem', fontWeight: 700,
                                background: 'linear-gradient(135deg, #a78bfa, #f472b6)',
                                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                            }}>
                                {user?.credits ?? 0}
                            </span>
                        </div>
                        <div className="credits-bar" style={{ marginBottom: 10 }}>
                            <div
                                className="credits-bar-fill"
                                style={{ width: `${Math.min(((user?.credits ?? 0) / 100) * 100, 100)}%` }}
                            />
                        </div>
                        {(user?.credits ?? 0) <= 10 && (
                            <div style={{
                                fontSize: '0.72rem', color: '#f87171', fontWeight: 600,
                                textAlign: 'center', marginBottom: 8, animation: 'pulseDot 1.5s ease-in-out infinite',
                            }}>
                                ⚠️ {t('credits.lowWarning') || 'Credits running low!'}
                            </div>
                        )}
                        <Link href="/pricing" className="upgrade-btn" style={{
                            textAlign: 'center', display: 'block',
                            background: 'linear-gradient(135deg, #a78bfa, #f472b6)',
                            color: '#fff', border: 'none', fontWeight: 700,
                        }}>
                            💎 {t('credits.buyCredits')}
                        </Link>
                    </div>
                )}


                {/* User Profile Bar */}
                {isAuthenticated ? (
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
                ) : (
                    <div className="sidebar-auth-buttons">
                        <Link href="/login" className="sidebar-login-btn">
                            {t('auth.login')}
                        </Link>
                        <Link href="/register" className="sidebar-register-btn">
                            Create Account
                        </Link>
                    </div>
                )}

                {/* How to use + Discord (compact) */}
                {!sidebarCollapsed && (
                    <div style={{ padding: '0 12px', marginBottom: 4, display: 'flex', gap: 6 }}>
                        <button
                            onClick={handleHowToUseClick}
                            style={{
                                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                                padding: '6px 0', borderRadius: 8,
                                border: '1px solid rgba(255,255,255,0.08)', background: 'transparent',
                                color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', cursor: 'pointer',
                            }}
                        >
                            ？ {t('qa.howToUse')}
                        </button>
                        <a
                            href="https://discord.gg/wDVMxfrXkM"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                                padding: '6px 12px', borderRadius: 8,
                                border: '1px solid rgba(88,101,242,0.3)', background: 'transparent',
                                color: 'rgba(88,101,242,0.6)', fontSize: '0.72rem', fontWeight: 600,
                                textDecoration: 'none', cursor: 'pointer',
                            }}
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                        </a>
                    </div>
                )}

                {/* Condensed Legal Footer */}
                {!sidebarCollapsed && (
                    <div style={{ borderTop: '1px solid var(--border-color, #2a2a3e)', marginTop: 4, padding: '8px 16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
                            <Link href="/blog" onClick={() => setShowAccountMenu(false)} style={{ fontSize: '12px', color: 'var(--text-secondary)', opacity: 0.5, textDecoration: 'none' }}>Blog</Link>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 8px', justifyContent: 'center' }}>
                            <Link href="/terms" onClick={() => setShowAccountMenu(false)} style={{ fontSize: '11px', color: 'var(--text-secondary)', opacity: 0.5, textDecoration: 'none' }}>Terms</Link>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', opacity: 0.3 }}>{' · '}</span>
                            <Link href="/privacy" onClick={() => setShowAccountMenu(false)} style={{ fontSize: '11px', color: 'var(--text-secondary)', opacity: 0.5, textDecoration: 'none' }}>Privacy</Link>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', opacity: 0.3 }}>{' · '}</span>
                            <Link href="/content-policy" onClick={() => setShowAccountMenu(false)} style={{ fontSize: '11px', color: 'var(--text-secondary)', opacity: 0.5, textDecoration: 'none' }}>Content</Link>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', opacity: 0.3 }}>{' · '}</span>
                            <Link href="/dmca" onClick={() => setShowAccountMenu(false)} style={{ fontSize: '11px', color: 'var(--text-secondary)', opacity: 0.5, textDecoration: 'none' }}>DMCA</Link>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', opacity: 0.3 }}>{' · '}</span>
                            <Link href="/2257" onClick={() => setShowAccountMenu(false)} style={{ fontSize: '11px', color: 'var(--text-secondary)', opacity: 0.5, textDecoration: 'none' }}>2257</Link>
                        </div>
                    </div>
                )}
            </div>

            {/* How to use modal (Companions version or legacy trigger) */}
            {showHowToUse && (
                <HowToUseModal onClose={() => setShowHowToUse(false)} />
            )}

        </nav>
    );
}
