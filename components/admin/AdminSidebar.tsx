"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function AdminSidebar() {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);

    // Close sidebar on route change (mobile)
    useEffect(() => {
        setOpen(false);
    }, [pathname]);

    // Prevent body scroll when sidebar is open on mobile
    useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [open]);

    const navItems = [
        { path: '/admin', label: '📊 ダッシュボード' },
        { path: '/admin/users', label: '👤 ユーザー管理' },
        { path: '/admin/companions', label: '🧑‍🤝‍🧑 キャラクター管理' },
        { path: '/admin/blocks', label: '🚫 ブロックログ' },
        { path: '/admin/payments', label: '💰 決済管理' },
        { path: '/admin/email', label: '✉️ メール管理' },
        { path: '/admin/emails', label: '📧 メール履歴' },
        { path: '/admin/filters', label: '🔧 フィルター管理' },
        { path: '/admin/content', label: '🖼️ コンテンツ管理' },
        { path: '/admin/terms', label: '📄 規約管理' },
        { path: '/admin/feedback', label: '📩 フィードバック' },
        { path: '/admin/features', label: '⚙️ 機能管理' },
    ];

    return (
        <>
            {/* Hamburger button (mobile only, controlled by CSS) */}
            <button
                className="admin-hamburger"
                onClick={() => setOpen(v => !v)}
                aria-label="メニュー"
            >
                {open ? '✕' : '☰'}
            </button>

            {/* Overlay (mobile only) */}
            <div
                className={`admin-sidebar-overlay${open ? ' open' : ''}`}
                onClick={() => setOpen(false)}
            />

            {/* Sidebar */}
            <div className={`admin-sidebar${open ? ' open' : ''}`}>
                <div style={{ padding: '0 8px' }}>
                    <h2 style={{
                        color: 'var(--primary)',
                        fontSize: '1.25rem',
                        fontWeight: 700,
                        margin: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        🔒 Admin
                    </h2>
                </div>

                <nav style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                }}>
                    <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '0 0 8px 0' }} />

                    {navItems.map(item => {
                        const isActive = pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '12px 16px',
                                    borderRadius: '8px',
                                    color: isActive ? '#ffffff' : 'var(--text-secondary)',
                                    backgroundColor: isActive ? 'var(--primary-dark)' : 'transparent',
                                    textDecoration: 'none',
                                    fontSize: '0.95rem',
                                    fontWeight: isActive ? 600 : 500,
                                    transition: 'all 0.2s',
                                }}
                            >
                                {item.label}
                            </Link>
                        );
                    })}

                    <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '8px 0' }} />

                    <Link
                        href="/"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '12px 16px',
                            borderRadius: '8px',
                            color: 'var(--text-secondary)',
                            textDecoration: 'none',
                            fontSize: '0.95rem',
                            fontWeight: 500,
                            transition: 'all 0.2s',
                        }}
                    >
                        🏠 ホームに戻る
                    </Link>

                    <Link
                        href="/"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '12px 16px',
                            borderRadius: '8px',
                            color: '#ff4d4f',
                            textDecoration: 'none',
                            fontSize: '0.95rem',
                            fontWeight: 500,
                            transition: 'all 0.2s',
                            marginTop: 'auto'
                        }}
                    >
                        🚪 ログアウト
                    </Link>
                </nav>
            </div>
        </>
    );
}
