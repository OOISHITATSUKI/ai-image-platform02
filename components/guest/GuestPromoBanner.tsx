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
                        <Link
                            href="/register"
                            style={{
                                display: 'block', padding: '16px 24px',
                                background: 'linear-gradient(135deg, #7c5cfc, #6366f1)',
                                color: '#fff', borderRadius: 12, fontWeight: 700,
                                fontSize: '1.05rem', textDecoration: 'none',
                                boxShadow: '0 4px 20px rgba(124,92,252,0.4)',
                            }}
                        >
                            {t('guest.fullscreenCtaCta') || 'Unlock for Free'} →
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

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Link
                        href="/register"
                        style={{
                            padding: isLarge ? '12px 24px' : '10px 20px',
                            background: 'linear-gradient(135deg, #7c5cfc, #6366f1)',
                            color: '#fff', borderRadius: 10, fontWeight: 700,
                            fontSize: isLarge ? '0.95rem' : '0.85rem',
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
