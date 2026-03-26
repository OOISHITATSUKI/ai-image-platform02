'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/useTranslation';

interface GuestPromoBannerProps {
    genCount: number;
    lastResult?: { watermarked?: string; blurred?: string } | null;
}

export default function GuestPromoBanner({ genCount, lastResult }: GuestPromoBannerProps) {
    const { t } = useTranslation();
    const [fullscreenDismissed, setFullscreenDismissed] = useState(false);
    const [bannerDismissed, setBannerDismissed] = useState(false);

    // 5th generation: show fullscreen CTA (once)
    if (genCount === 5 && !fullscreenDismissed) {
        return (
            <div className="guest-fullscreen-cta" onClick={() => setFullscreenDismissed(true)}>
                <div className="guest-fullscreen-cta-card" onClick={e => e.stopPropagation()}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>✨</div>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff', marginBottom: 8 }}>
                        {t('guest.fullscreenCtaTitle') || 'Enjoying Image Nude?'}
                    </h2>
                    <p style={{ fontSize: '0.95rem', color: '#8b8ba7', marginBottom: 24, lineHeight: 1.6 }}>
                        {t('guest.fullscreenCtaDesc') || 'Unlock all your images and get 20 free credits.'}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <a
                            href="/api/auth/google"
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                gap: '10px', padding: '14px 24px',
                                background: '#fff', border: '1px solid #dadce0',
                                borderRadius: 12, color: '#3c4043',
                                fontWeight: 700, fontSize: '1rem',
                                textDecoration: 'none',
                            }}
                        >
                            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                                <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                            </svg>
                            {t('guest.unlockWithGoogle') || 'Unlock with Google — 1 click'}
                        </a>
                        <Link
                            href="/register"
                            style={{
                                display: 'block', padding: '14px 24px',
                                background: 'linear-gradient(135deg, #7c5cfc, #6366f1)',
                                color: '#fff', borderRadius: 12, fontWeight: 700,
                                fontSize: '1rem', textDecoration: 'none',
                                boxShadow: '0 4px 20px rgba(124,92,252,0.4)',
                                textAlign: 'center',
                            }}
                        >
                            {t('guest.unlockWithEmail') || 'Unlock with Email — 10 seconds'}
                        </Link>
                        <button
                            onClick={() => setFullscreenDismissed(true)}
                            style={{
                                padding: '12px', background: 'transparent',
                                color: '#666', border: 'none', cursor: 'pointer',
                                fontSize: '0.85rem',
                            }}
                        >
                            Continue generating
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (bannerDismissed && genCount < 6) return null;

    // Determine banner size based on gen count
    const isLarge = genCount >= 3;

    return (
        <div className={`guest-promo-banner ${isLarge ? 'large' : ''}`}>
            <div style={{
                maxWidth: 800, margin: '0 auto',
                display: 'flex', alignItems: 'center', gap: 20,
                flexWrap: 'wrap',
            }}>
                {/* Blur preview of clean version */}
                {lastResult?.watermarked && isLarge && (
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <div style={{ width: 80, height: 80, borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
                            <img src={lastResult.watermarked} alt="Result" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <div className="guest-blur-preview" style={{ width: 80, height: 80, flexShrink: 0 }}>
                            <img src={lastResult.watermarked} alt="Full quality" />
                            <div className="guest-blur-preview-overlay">
                                <span style={{ fontSize: '1.2rem' }}>🔓</span>
                            </div>
                        </div>
                    </div>
                )}

                <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontWeight: 700, color: '#fff', fontSize: isLarge ? '1rem' : '0.9rem', marginBottom: 4 }}>
                        {t('guest.bannerTitle') || 'Like the result?'}
                    </div>
                    {isLarge && (
                        <div style={{ fontSize: '0.8rem', color: '#8b8ba7', lineHeight: 1.5 }}>
                            ✅ {t('guest.bannerBenefitUnlock') || 'No watermark'}
                            {' · '}✅ {t('guest.bannerBenefitDownload') || 'Download HD'}
                            {' · '}✅ {t('guest.bannerBenefitCredits') || '20 free credits'}
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <a
                        href="/api/auth/google"
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: isLarge ? '10px 16px' : '8px 14px',
                            background: '#fff', border: '1px solid #dadce0',
                            borderRadius: 10, color: '#3c4043', fontWeight: 700,
                            fontSize: isLarge ? '0.9rem' : '0.82rem',
                            textDecoration: 'none', whiteSpace: 'nowrap',
                        }}
                    >
                        <svg width="16" height="16" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                            <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                        </svg>
                        Google
                    </a>
                    <Link
                        href="/register"
                        style={{
                            padding: isLarge ? '10px 16px' : '8px 14px',
                            background: 'linear-gradient(135deg, #7c5cfc, #6366f1)',
                            color: '#fff', borderRadius: 10, fontWeight: 700,
                            fontSize: isLarge ? '0.9rem' : '0.82rem',
                            textDecoration: 'none', whiteSpace: 'nowrap',
                            boxShadow: '0 2px 12px rgba(124,92,252,0.3)',
                        }}
                    >
                        🔓 {t('guest.unlockImage') || 'Unlock — Free, 10s'}
                    </Link>
                    {genCount < 6 && (
                        <button
                            onClick={() => setBannerDismissed(true)}
                            style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '1rem' }}
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
