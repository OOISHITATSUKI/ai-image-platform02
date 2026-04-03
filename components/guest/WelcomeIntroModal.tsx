'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useTranslation } from '@/lib/useTranslation';
import { useAppStore } from '@/lib/store';

const DEMO_VIDEOS = [
    { src: '/videos/demo-intro-1.webm', poster: '/images/welcome-thumb-1.jpg' },
    { src: '/videos/demo-intro-2.webm', poster: '/images/welcome-thumb-2.jpg' },
    { src: '/videos/demo-intro-3.webm', poster: '/images/welcome-thumb-3.jpg' },
];

export default function WelcomeIntroModal() {
    const isAuthenticated = useAppStore((s) => s.isAuthenticated);
    const [show, setShow] = useState(true);
    const { t } = useTranslation();
    const videoRef = useRef<HTMLVideoElement>(null);

    const randomEntry = useMemo(
        () => DEMO_VIDEOS[Math.floor(Math.random() * DEMO_VIDEOS.length)],
        []
    );

    // Start playing only when modal is shown
    useEffect(() => {
        if (show && !isAuthenticated && videoRef.current) {
            videoRef.current.src = randomEntry.src;
            videoRef.current.load();
            videoRef.current.play().catch(() => {});
        }
    }, [show, isAuthenticated, randomEntry]);

    // ログイン済みユーザーには表示しない
    if (isAuthenticated || !show) return null;

    const handleClose = () => {
        if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.removeAttribute('src');
            videoRef.current.load();
        }
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

                {/* Demo video — lazy loaded */}
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
                        ref={videoRef}
                        muted
                        loop
                        playsInline
                        preload="none"
                        poster={randomEntry.poster}
                        style={{ width: '100%', borderRadius: 12 }}
                    />
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
