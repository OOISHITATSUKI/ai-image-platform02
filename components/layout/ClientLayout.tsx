'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import AgeGate from '@/components/ui/AgeGate';
import { useAppStore } from '@/lib/store';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    const { theme, toggleSidebar, toggleSettingsPanel } = useAppStore();
    const [mounted, setMounted] = useState(false);

    // Prevent hydration mismatch and handle mobile initial state
    useEffect(() => {
        setMounted(true);
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

    return (
        <>
            <AgeGate />
            <div className="mobile-header">
                <button className="mobile-menu-btn" onClick={toggleSidebar}>
                    ☰
                </button>
                <div className="mobile-logo">
                    <span style={{ fontSize: '1.2rem' }}>⚡</span>
                    <span>VideoGen</span>
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
