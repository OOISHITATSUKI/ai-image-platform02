'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import AgeGate from '@/components/ui/AgeGate';
import FirstGenModal from '@/components/ui/FirstGenModal';
import { useAppStore } from '@/lib/store';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    const { theme, toggleSidebar, toggleSettingsPanel, isAuthenticated } = useAppStore();
    const [mounted, setMounted] = useState(false);
    const pathname = usePathname();

    // Pages that don't use the sidebar layout
    const isAuthPage = pathname === '/login' || pathname === '/register';
    const isPublicPage = pathname === '/terms' || pathname === '/privacy' || pathname === '/content-policy' || pathname === '/dmca' || pathname === '/2257' || pathname === '/help';
    const isAdminPage = pathname?.startsWith('/admin');

    // Prevent hydration mismatch and handle mobile initial state
    useEffect(() => {
        setMounted(true);

        // ── Restore session: invoke /api/auth/me if auth_token exists ──
        const restoreSession = async () => {
            const token = localStorage.getItem('auth_token');
            if (!token) return;

            try {
                const res = await fetch('/api/auth/me', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok) {
                    const data = await res.json();
                    useAppStore.setState({
                        user: data.user,
                        isAuthenticated: true,
                        ageVerified: true,
                    });
                } else {
                    // Invalid token -> clean up
                    localStorage.removeItem('auth_token');
                    useAppStore.setState({
                        user: null,
                        isAuthenticated: false,
                    });
                }
            } catch (err) {
                console.error('Session restore failed:', err);
            }
        };

        restoreSession();

        if (window.innerWidth <= 768) {
            // Force sidebar and settings collapsed on mobile mount
            useAppStore.setState({ sidebarCollapsed: true, settingsPanelVisible: false });
        }
    }, []);

    // Apply theme to document
    useEffect(() => {
        if (mounted) {
            document.documentElement.setAttribute('data-theme', theme);
        }
    }, [theme, mounted]);

    if (!mounted) {
        return (
            <div className="app-shell">
                <div style={{ width: 260, background: 'var(--bg-sidebar)' }} />
                <main className="main-content" />
            </div>
        );
    }

    // Auth pages (login/register) render without sidebar
    if (isAuthPage) {
        return <>{children}</>;
    }

    // Public pages render without sidebar but with simple styling
    if (isPublicPage) {
        return <>{children}</>;
    }

    // Admin pages have their own layout
    if (isAdminPage) {
        return <>{children}</>;
    }

    return (
        <>
            {/* AgeGate only for authenticated users (registration includes age confirmation) */}
            {isAuthenticated && <AgeGate />}

            {/* First generation confirmation modal */}
            {isAuthenticated && <FirstGenModal />}

            <div className="mobile-header">
                <button className="mobile-menu-btn" onClick={toggleSidebar}>
                    ☰
                </button>
                <div className="mobile-logo">
                    <img src="/logo-dark.png" alt="Image Nude" className="app-logo logo-dark" style={{ maxHeight: '36px' }} />
                    <img src="/logo-light.png" alt="Image Nude" className="app-logo logo-light" style={{ maxHeight: '36px' }} />
                </div>
                <button
                    className="mobile-settings-btn"
                    onClick={toggleSettingsPanel}
                    style={{ marginLeft: 'auto' }}
                >
                    ⚙️
                </button>
            </div>

            <div className="app-shell">
                <Sidebar />
                <div className="sidebar-overlay" onClick={toggleSidebar} />
                <main className="main-content">
                    {children}
                </main>
            </div>
        </>
    );
}
