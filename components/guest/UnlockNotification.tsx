'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/useTranslation';

export default function UnlockNotification() {
    const [show, setShow] = useState(false);
    const [unlockedCount, setUnlockedCount] = useState(0);
    const { user } = useAppStore();
    const { t } = useTranslation();

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const count = parseInt(localStorage.getItem('guest_unlocked_count') || '0', 10);
        if (count > 0) {
            setUnlockedCount(count);
            setShow(true);
            // Clear the flag so it only shows once
            localStorage.removeItem('guest_unlocked_count');
        }
    }, []);

    if (!show || unlockedCount === 0) return null;

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 10002,
            background: 'rgba(0,0,0,0.8)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(6px)',
            animation: 'fadeIn 0.3s ease-out',
        }}>
            <div style={{
                background: 'linear-gradient(135deg, #1a1a2e, #1e1430)',
                border: '1px solid rgba(124,92,252,0.3)',
                borderRadius: 20, padding: '40px 32px',
                maxWidth: 480, width: '92%', textAlign: 'center',
            }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff', marginBottom: 12 }}>
                    {t('unlock.successTitle') || 'Welcome! Your account is ready.'}
                </h2>

                <div style={{
                    background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
                    borderRadius: 12, padding: '16px', marginBottom: 16,
                }}>
                    <div style={{ fontSize: '0.95rem', color: '#34d399', marginBottom: 8 }}>
                        ✅ {unlockedCount} {t('unlock.imagesUnlocked') || 'images unlocked (watermark removed)'}
                    </div>
                    <div style={{ fontSize: '0.95rem', color: '#34d399' }}>
                        ✅ {t('unlock.creditsAdded') || '20 free credits added'}
                    </div>
                </div>

                {/* Credits progress bar */}
                <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: '0.85rem', color: '#8b8ba7', marginBottom: 6 }}>
                        {t('unlock.creditsRemaining')?.replace('{count}', String(user?.credits ?? 20)) || `You now have ${user?.credits ?? 20} credits remaining.`}
                    </div>
                    <div style={{
                        height: 8, borderRadius: 4,
                        background: 'rgba(255,255,255,0.1)',
                        overflow: 'hidden',
                    }}>
                        <div style={{
                            height: '100%', borderRadius: 4,
                            background: 'linear-gradient(90deg, #7c5cfc, #6366f1)',
                            width: `${Math.min(((user?.credits ?? 20) / 20) * 100, 100)}%`,
                            transition: 'width 0.5s',
                        }} />
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <button
                        onClick={() => setShow(false)}
                        style={{
                            padding: '14px 24px',
                            background: 'linear-gradient(135deg, #7c5cfc, #6366f1)',
                            color: '#fff', borderRadius: 12, fontWeight: 700,
                            fontSize: '1rem', border: 'none', cursor: 'pointer',
                            boxShadow: '0 4px 15px rgba(124,92,252,0.4)',
                        }}
                    >
                        Start Creating →
                    </button>
                    <Link
                        href="/library"
                        onClick={() => setShow(false)}
                        style={{
                            padding: '10px', color: '#8b8ba7',
                            fontSize: '0.9rem', textDecoration: 'none',
                        }}
                    >
                        {t('unlock.viewMyImages') || 'View My Images'} →
                    </Link>
                </div>
            </div>
        </div>
    );
}
