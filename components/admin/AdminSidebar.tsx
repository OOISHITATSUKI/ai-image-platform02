"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminSidebar() {
    const pathname = usePathname();

    const navItems = [
        { path: '/admin', label: '📊 ダッシュボード (Dashboard)' },
        { path: '/admin/users', label: '👤 ユーザー管理 (Users)' },
        { path: '/admin/blocks', label: '🚫 ブロックログ (Blocks)' },
        { path: '/admin/payments', label: '💰 決済管理 (Payments)' },
        { path: '/admin/filters', label: '🔧 フィルター管理 (Filters)' },
        { path: '/admin/content', label: '🖼️ コンテンツ管理 (Content)' },
        { path: '/admin/terms', label: '📄 規約管理 (Terms)' },
    ];

    return (
        <div style={{
            width: '260px',
            backgroundColor: 'var(--bg-secondary)',
            borderRight: '1px solid rgba(255,255,255,0.1)',
            padding: '24px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '32px'
        }}>
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
                        color: '#ff4d4f',
                        textDecoration: 'none',
                        fontSize: '0.95rem',
                        fontWeight: 500,
                        transition: 'all 0.2s',
                        marginTop: 'auto'
                    }}
                >
                    🚪 ログアウト (Exit Admin)
                </Link>
            </nav>
        </div>
    );
}
