'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import AgeGate from '@/components/ui/AgeGate';
import { useAppStore } from '@/lib/store';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    const { theme } = useAppStore();
    const [mounted, setMounted] = useState(false);

    // Prevent hydration mismatch
    useEffect(() => {
        setMounted(true);
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
            <div className="app-shell">
                <Sidebar />
                <main className="main-content">
                    {children}
                </main>
            </div>
        </>
    );
}
