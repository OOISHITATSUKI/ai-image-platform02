'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import Footer from './Footer';
import AgeGate from '@/components/ui/AgeGate';
import WelcomeModal from '@/components/ui/WelcomeModal';
import UnlockNotification from '@/components/guest/UnlockNotification';
import { useAppStore } from '@/lib/store';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    const { theme, toggleSidebar, toggleSettingsPanel, isAuthenticated, settingsPanelVisible, user } = useAppStore();
    const [mounted, setMounted] = useState(false);
    const pathname = usePathname();

    // Pages that don't use the sidebar layout
    const isAuthPage = pathname === '/login' || pathname === '/register';
    const isPublicPage = pathname === '/terms' || pathname === '/privacy' || pathname === '/content-policy' || pathname === '/dmca' || pathname === '/2257' || pathname === '/help';
    const isHomePage = false; // Homepage is now the editor — rendered with sidebar
    const isAboutPage = pathname === '/about';
    const isLandingPage = pathname === '/undress-ai' || pathname === '/face-swap' || pathname === '/blog' || pathname?.startsWith('/blog/') || isAboutPage;
    const isAdminPage = pathname?.startsWith('/admin');

    // Prevent hydration mismatch and handle mobile initial state
    useEffect(() => {
        setMounted(true);

        // ── Auto-detect browser language (runs synchronously before async session restore) ──
        // Priority: 1) manually chosen (localStorage) 2) browser lang 3) 'en'
        try {
            const { localeManuallySet } = useAppStore.getState();
            if (!localeManuallySet) {
                const supported = ['en', 'ja', 'es', 'zh', 'ko', 'pt'];
                const browserLang = (navigator.language || '').split('-')[0].toLowerCase();
                const detected = supported.includes(browserLang) ? browserLang : 'en';
                useAppStore.setState({ locale: detected as ReturnType<typeof useAppStore.getState>['locale'] });
            }
        } catch (e) {
            console.error('Locale detection failed:', e);
        }

        // ── Restore session: invoke /api/auth/me if auth_token exists ──
        const restoreSession = async () => {
            const token = localStorage.getItem('auth_token');

            if (token) {
                try {
                    const res = await fetch('/api/auth/me', {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    if (res.ok) {
                        const data = await res.json();
                        // use setUser to trigger the chat loading logic
                        // await so localeManuallySet is set before browser detection runs
                        await useAppStore.getState().setUser(data.user);
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
            }
        };

        restoreSession();

    }, []);

    // Handle responsive sidebar state
    useEffect(() => {
        if (!mounted) return;
        if (window.innerWidth <= 768) {
            const stored = localStorage.getItem('videogen-storage-v3');
            if (!stored) {
                useAppStore.setState({ sidebarCollapsed: true, settingsPanelVisible: false });
            }
        } else {
            // On desktop, always expand sidebar
            useAppStore.setState({ sidebarCollapsed: false });
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

    // Landing pages, about page, and blog pages render standalone (no sidebar, scrollable)
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

            {/* Welcome modal — shows 20 credits gift for new users */}
            {isAuthenticated && <WelcomeModal />}

            {/* Post-registration unlock notification */}
            {isAuthenticated && <UnlockNotification />}

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
