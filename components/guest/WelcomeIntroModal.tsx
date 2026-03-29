'use client';

import React, { useState } from 'react';
import { useTranslation } from '@/lib/useTranslation';
import { useAppStore } from '@/lib/store';

export default function WelcomeIntroModal() {
    const isAuthenticated = useAppStore((s) => s.isAuthenticated);
    const [show, setShow] = useState(true);
    const { t } = useTranslation();

    // ログイン済みユーザーには表示しない
    if (isAuthenticated || !show) return null;

    const handleClose = () => {
        setShow(false);
    };

    return (
        <div className="welcome-intro-overlay" onClick={handleClose}>
            <div className="welcome-intro-card" onClick={e => e.stopPropagation()}>
                {/* Close button */}
                <button
                    onClick={handleClose}
                    style={{
                        position: 'absolute', top: 16, right: 16,
                        background: 'none', border: 'none', color: '#888',
                        fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1,
                    }}
                    aria-label="Close"
                >
                    &times;
                </button>

                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', marginBottom: 4 }}>
                    {t('home.welcomeTitle') || 'Welcome to Image Nude'}
                </h2>
                <p style={{ fontSize: '0.9rem', color: '#8b8ba7', marginBottom: 16 }}>
                    AI-powered image generation. Free to try, no sign up needed.
                </p>

                {/* Demo video placeholder */}
                <div style={{
                    background: '#111',
                    borderRadius: 12,
                    aspectRatio: '16/9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '16px 0',
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.08)',
                }}>
                    <video
                        autoPlay
                        muted
                        loop
                        playsInline
                        style={{ width: '100%', borderRadius: 12 }}
                        poster="/videos/demo-intro-poster.jpg"
                    >
                        <source src="/videos/demo-intro.webm" type="video/webm" />
                        <source src="/videos/demo-intro.mp4" type="video/mp4" />
                        {/* Fallback if no video file exists yet */}
                    </video>
                </div>

                <button className="welcome-intro-cta" onClick={handleClose}>
                    {t('home.startCreating') || 'Start Creating'} →
                </button>

                <p style={{ fontSize: '0.75rem', color: '#555', marginTop: 12 }}>
                    {t('home.ageNotice') || '18+ only. All content AI-generated.'}
                </p>
            </div>
        </div>
    );
}
