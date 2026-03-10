'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import Footer from './Footer';
import AgeGate from '@/components/ui/AgeGate';
import FirstGenModal from '@/components/ui/FirstGenModal';
import { useAppStore } from '@/lib/store';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    const { theme, toggleSidebar, toggleSettingsPanel, isAuthenticated, settingsPanelVisible, user } = useAppStore();
    const [mounted, setMounted] = useState(false);
    const pathname = usePathname();

    // Pages that don't use the sidebar layout
    const isAuthPage = pathname === '/login' || pathname === '/register';
    const isPublicPage = pathname === '/terms' || pathname === '/privacy' || pathname === '/content-policy' || pathname === '/dmca' || pathname === '/2257' || pathname === '/help';
    const isHomePage = pathname === '/';
    const isLandingPage = pathname === '/undress-ai' || pathname === '/face-swap' || pathname === '/blog' || pathname?.startsWith('/blog/');
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
                    // use setUser to trigger the chat loading logic
                    useAppStore.getState().setUser(data.user);
                    // Ensure termsAgreedAt persists in store
                    const currentUser = useAppStore.getState().user;
                    if (currentUser && data.user.termsAgreedAt && !currentUser.termsAgreedAt) {
                        useAppStore.setState({ user: { ...currentUser, termsAgreedAt: data.user.termsAgreedAt } });
                    }
                    useAppStore.setState({ ageVerified: true });
                } else {
                    // Invalid token -> clean up securely using the store logout
                    useAppStore.getState().logout();
                }
            } catch (err) {
                console.error('Session restore failed:', err);
            }
        };

        restoreSession();

    }, []);

    // Handle mobile initial state (only if no persisted value exists)
    useEffect(() => {
        if (!mounted) return;
        if (window.innerWidth <= 768) {
            const stored = localStorage.getItem('videogen-storage-v3');
            if (!stored) {
                useAppStore.setState({ sidebarCollapsed: true, settingsPanelVisible: false });
            }
        }
    }, [mounted]);

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
        return (
            <>
                {children}
            </>
        );
    }

    // Public pages render without sidebar but with simple styling
    if (isPublicPage) {
        return (
            <div className="public-page-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                <main style={{ flex: 1 }}>
                    {children}
                </main>
                <Footer />
            </div>
        );
    }

    // Homepage renders standalone (has its own full design)
    if (isHomePage) {
        return (
            <div style={{ minHeight: '100vh', overflowY: 'auto' }}>
                {children}
            </div>
        );
    }

    // Landing pages and blog pages render standalone (no sidebar, scrollable)
    if (isLandingPage) {
        return (
            <div style={{ minHeight: '100vh', overflowY: 'auto' }}>
                {children}
            </div>
        );
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
            {/* FirstGenModal disabled - terms now handled at registration */}

            <div className="mobile-header">
                <button className="mobile-menu-btn" onClick={toggleSidebar}>
                    ☰
                </button>
                <div className="mobile-logo">
                    <img src="/logo-dark.png" alt="Image Nude" className="app-logo logo-dark" style={{ maxHeight: '28px' }} />
                    <img src="/logo-light.png" alt="Image Nude" className="app-logo logo-light" style={{ maxHeight: '28px' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                    {user && (
                        <span className={`mobile-credit-badge ${user.credits <= 10 ? 'low' : ''}`}>
                            ✨ {user.credits}
                        </span>
                    )}
                    <button className="mobile-settings-btn" onClick={toggleSettingsPanel}>
                        ⚙️
                    </button>
                </div>
            </div>

            {/* Settings bottom sheet overlay (mobile only) */}
            <div
                className={`settings-overlay ${settingsPanelVisible ? 'visible' : ''}`}
                onClick={toggleSettingsPanel}
            />

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
