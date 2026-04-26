'use client';

import React, { useState } from 'react';
import { useTranslation } from '@/lib/useTranslation';
import { useAppStore } from '@/lib/store';

export default function PricingPage() {
    const { t } = useTranslation();
    const { user } = useAppStore();
    const isPaid = !!user && user.plan !== 'free';

    const [loadingPack, setLoadingPack] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showVerifyModal, setShowVerifyModal] = useState(false);
    const [verifyStep, setVerifyStep] = useState<'send' | 'verify'>('send');
    const [verifyCode, setVerifyCode] = useState('');
    const [verifyLoading, setVerifyLoading] = useState(false);
    const [verifyError, setVerifyError] = useState('');
    const [verifySuccess, setVerifySuccess] = useState('');
    const [pendingPackType, setPendingPackType] = useState<string | null>(null);
    const [devOtp, setDevOtp] = useState('');

    const getToken = () => localStorage.getItem('auth_token');

    const handleSendVerification = async () => {
        setVerifyError(''); setVerifySuccess(''); setVerifyLoading(true);
        try {
            const res = await fetch('/api/auth/verify-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
                body: JSON.stringify({ action: 'send' }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            if (data.devOtp) setDevOtp(data.devOtp);
            setVerifyStep('verify');
            setVerifySuccess('Verification code sent to your email');
        } catch (err) {
            setVerifyError(err instanceof Error ? err.message : 'Failed to send code');
        } finally { setVerifyLoading(false); }
    };

    const handleVerifyCode = async () => {
        setVerifyError(''); setVerifySuccess(''); setVerifyLoading(true);
        try {
            const res = await fetch('/api/auth/verify-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
                body: JSON.stringify({ action: 'verify', code: verifyCode }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setShowVerifyModal(false); setVerifyStep('send'); setVerifyCode('');
            if (pendingPackType) handleCheckout(pendingPackType);
        } catch (err) {
            setVerifyError(err instanceof Error ? err.message : 'Verification failed');
        } finally { setVerifyLoading(false); }
    };

    const handleCheckout = async (packType: string) => {
        setError(null); setLoadingPack(packType);
        try {
            const token = getToken();
            if (!token) { setError(t('pricing.loginRequired')); setLoadingPack(null); return; }
            const res = await fetch('/api/billing/create-invoice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ packType }),
            });
            const data = await res.json();
            if (data.requiresVerification) { setPendingPackType(packType); setShowVerifyModal(true); setLoadingPack(null); return; }
            if (res.ok && data.invoice_url) { window.location.href = data.invoice_url; }
            else { setError(data.error || t('pricing.paymentError')); setLoadingPack(null); }
        } catch { setError(t('pricing.networkError')); setLoadingPack(null); }
    };

    const FANVUE_PROFILE_URL = 'https://www.fanvue.com/tat05';

    // Styles
    const containerStyle: React.CSSProperties = { maxWidth: 720, margin: '0 auto' };
    const sectionStyle: React.CSSProperties = { marginBottom: 36 };
    const sectionTitleStyle: React.CSSProperties = { fontSize: '1.1rem', fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 };
    const sectionDescStyle: React.CSSProperties = { fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 };
    const gridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 };
    const cardBase: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 8 };
    const featuredCard: React.CSSProperties = { ...cardBase, border: '2px solid #a78bfa', background: 'linear-gradient(135deg, rgba(167,139,250,0.08), rgba(244,114,182,0.08))', position: 'relative' };
    const priceGradient: React.CSSProperties = { fontSize: '2rem', fontWeight: 800, background: 'linear-gradient(135deg, #a78bfa, #f472b6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' };
    const feat: React.CSSProperties = { fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '3px 0', display: 'flex', alignItems: 'center', gap: 7 };
    const ctaPrimary: React.CSSProperties = { padding: '11px 20px', borderRadius: 10, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', border: 'none', marginTop: 'auto', background: 'linear-gradient(135deg, #a78bfa, #f472b6)', color: '#fff', textAlign: 'center' };
    const ctaSecondary: React.CSSProperties = { ...ctaPrimary, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' };
    const badge: React.CSSProperties = { position: 'absolute', top: -10, right: 16, background: 'linear-gradient(135deg, #f472b6, #a78bfa)', color: '#fff', fontSize: '0.68rem', fontWeight: 700, padding: '3px 12px', borderRadius: 16 };
    const ok = <span style={{ color: '#34d399' }}>✓</span>;
    const no = <span style={{ color: '#f87171' }}>✗</span>;

    return (
        <div className="pricing-view">
            <div style={containerStyle}>
                <h1 className="pricing-title">{t('pricing.title')}</h1>
                <p className="pricing-subtitle" style={{ marginBottom: 8 }}>{t('pricing.subtitle')}</p>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', textAlign: 'center', maxWidth: 480, margin: '0 auto 28px', lineHeight: 1.5 }}>
                    {t('pricing.introDesc') || 'Credits are for AI image generation. Companion chat is free — paid plans unlock NSFW photos and unlimited chat.'}
                </p>

                {error && (
                    <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', color: '#f87171', padding: 12, borderRadius: 8, marginBottom: 20, textAlign: 'center' }}>
                        {error}
                    </div>
                )}

                {/* ── Image Generation Credits ── */}
                <div style={sectionStyle}>
                    <div style={sectionTitleStyle}>🎨 {t('pricing.sectionCredits') || 'Image Generation Credits'}</div>
                    <p style={sectionDescStyle}>
                        {t('pricing.sectionCreditsDesc') || 'Purchase credits to generate AI images, face swaps, nude mode edits, and videos. Credits never expire.'}
                    </p>
                    <div style={gridStyle}>
                        <div style={cardBase}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                {t('pricing.standard')}
                            </div>
                            <div style={priceGradient}>$14.99</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginBottom: 6 }}>200 {t('pricing.credits') || 'credits'}</div>
                            <div style={feat}>{ok} {t('pricing.feat.credits200')}</div>
                            <div style={feat}>{ok} {t('pricing.feat.allModes')}</div>
                            <div style={feat}>{ok} {t('pricing.feat.faceSwapInpaint')}</div>
                            <div style={feat}>{ok} {t('pricing.feat.standardRes')}</div>
                            <button style={ctaSecondary} disabled={loadingPack !== null} onClick={() => handleCheckout('standard')}>
                                {loadingPack === 'standard' ? t('pricing.processing') : `${t('pricing.buyWithCrypto')} — $14.99`}
                            </button>
                        </div>
                        <div style={featuredCard}>
                            <div style={badge}>BEST VALUE</div>
                            <div style={{ fontSize: '0.75rem', color: '#a78bfa', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                {t('pricing.premium')}
                            </div>
                            <div style={priceGradient}>$29.99</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginBottom: 6 }}>600 {t('pricing.credits') || 'credits'} — {t('pricing.save33') || 'Save 33%'}</div>
                            <div style={feat}>{ok} {t('pricing.feat.credits600')}</div>
                            <div style={feat}>{ok} {t('pricing.feat.allModes')}</div>
                            <div style={feat}>{ok} {t('pricing.feat.faceSwapUnlimited')}</div>
                            <div style={feat}>{ok} {t('pricing.feat.hdRes')}</div>
                            <div style={feat}><span style={{ color: '#f472b6' }}>★</span> {t('pricing.feat.priority')}</div>
                            <button style={ctaPrimary} disabled={loadingPack !== null} onClick={() => handleCheckout('premium')}>
                                {loadingPack === 'premium' ? t('pricing.processing') : `${t('pricing.buyWithCrypto')} — $29.99`}
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── AI Girlfriend Experience ── */}
                <div style={sectionStyle}>
                    <div style={sectionTitleStyle}>💕 {t('pricing.sectionGf') || 'AI Girlfriend Experience'}</div>
                    <p style={sectionDescStyle}>
                        {t('pricing.sectionGfDesc') || 'Chat with AI girlfriends for free! Paid users unlock NSFW photos, explicit chat, unlimited messages, and deeper relationships.'}
                    </p>

                    {/* What you get */}
                    <div style={{ ...cardBase, marginBottom: 16, background: 'rgba(167,139,250,0.05)', border: '1px solid rgba(167,139,250,0.15)' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#a78bfa', marginBottom: 4 }}>{t('pricing.gf.whatsIncluded') || 'What coins unlock:'}</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '4px 20px' }}>
                            <div style={feat}>{ok} {t('pricing.gf.unlimited') || 'Unlimited daily messages'}</div>
                            <div style={feat}>{ok} {t('pricing.gf.nsfwUnlock') || 'NSFW & nude photos'}</div>
                            <div style={feat}>{ok} {t('pricing.gf.explicit') || 'Explicit chat & intimate scenes'}</div>
                            <div style={feat}>{ok} {t('pricing.gf.lingerie') || 'Lingerie & bedroom selfies'}</div>
                            <div style={feat}>{ok} {t('pricing.gf.allLive') || 'All Live Action levels'}</div>
                            <div style={feat}>{ok} {t('pricing.gf.assistant') || 'Nude Assistant full access'}</div>
                        </div>
                    </div>

                    {/* Fanvue subscription button */}
                    <div style={{ ...featuredCard, textAlign: 'center', padding: '28px 24px' }}>
                        <div style={badge}>Fanvue</div>
                        <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>💕</div>
                        <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                            {t('pricing.gf.fanvueTitle') || 'Subscribe on Fanvue'}
                        </div>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>
                            {t('pricing.gf.fanvueDesc') || 'Subscribe to our Fanvue page to unlock all companion features and earn credits automatically.'}
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginBottom: 16 }}>
                            {[
                                { coins: 300, price: '¥490' },
                                { coins: 700, price: '¥980' },
                                { coins: 1600, price: '¥1,980' },
                            ].map((pack) => (
                                <div key={pack.coins} style={{ padding: '8px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#a78bfa' }}>🪙 {pack.coins}</div>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>{pack.price}</div>
                                </div>
                            ))}
                        </div>
                        <a
                            href={FANVUE_PROFILE_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ ...ctaPrimary, display: 'block', textDecoration: 'none', width: '100%', boxSizing: 'border-box' }}
                        >
                            {t('pricing.gf.fanvueCta') || 'Subscribe on Fanvue →'}
                        </a>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: 10, lineHeight: 1.5 }}>
                            {t('pricing.gf.fanvueAfter') || 'After subscribing, go to Settings → Connect Fanvue to link your account and receive credits.'}
                        </p>
                    </div>

                    {/* Free tier note */}
                    <div style={{ marginTop: 12, padding: '10px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, fontSize: '0.75rem', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
                        💬 {t('pricing.gf.freeNote') || 'Free users can chat with all girlfriends (10 messages/day) with SFW photos and play styles. Subscribe on Fanvue to unlock the full experience!'}
                    </div>
                </div>

                {/* ── FAQ ── */}
                <div style={{ marginBottom: 40 }}>
                    <div style={sectionTitleStyle}>❓ FAQ</div>
                    {[
                        { q: t('pricing.faq1q') || 'What are credits?', a: t('pricing.faq1a') || 'Credits are consumed when you generate images. Each generation costs 1-3 credits.' },
                        { q: t('pricing.faq2q') || 'Is companion chat free?', a: t('pricing.faq2a') || 'Yes! Chat with all AI girlfriends for free (10/day). Paid users get unlimited + NSFW.' },
                        { q: t('pricing.faq3q') || 'Separate payment for companions?', a: t('pricing.faq3a') || 'No. Any credit purchase ($14.99+) unlocks all companion features automatically.' },
                        { q: t('pricing.faq4q') || 'Payment methods?', a: t('pricing.faq4a') || 'Cryptocurrency (Bitcoin, Ethereum, USDT, 70+ coins) via NowPayments.' },
                        { q: t('pricing.faq5q') || 'Do credits expire?', a: t('pricing.faq5a') || 'No. Credits never expire.' },
                    ].map((faq, i) => (
                        <details key={i} style={{ marginBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 6 }}>
                            <summary style={{ cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', padding: '7px 0' }}>{faq.q}</summary>
                            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '4px 0 6px 0' }}>{faq.a}</p>
                        </details>
                    ))}
                </div>
            </div>

            {/* Email Verification Modal */}
            {showVerifyModal && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                    <div style={{ background: 'var(--bg-primary, #1a1a2e)', borderRadius: 16, padding: 32, maxWidth: 420, width: '100%', border: '1px solid rgba(124,92,252,0.2)' }}>
                        <h2 style={{ margin: '0 0 8px', fontSize: '1.25rem' }}>Verify Your Email</h2>
                        <p style={{ margin: '0 0 20px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Email verification is required before purchasing.</p>
                        {verifyError && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', color: '#f87171', padding: 10, borderRadius: 8, marginBottom: 16, fontSize: '0.85rem' }}>{verifyError}</div>}
                        {verifySuccess && <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid #22c55e', color: '#4ade80', padding: 10, borderRadius: 8, marginBottom: 16, fontSize: '0.85rem' }}>{verifySuccess}</div>}
                        {devOtp && <div style={{ background: 'rgba(124,92,252,0.1)', padding: '8px 12px', borderRadius: 8, marginBottom: 12, fontSize: '0.85rem', color: '#a78bfa' }}>Dev OTP: <strong>{devOtp}</strong></div>}
                        {verifyStep === 'send' ? (
                            <button className="auth-btn-primary" onClick={handleSendVerification} disabled={verifyLoading} style={{ width: '100%', marginBottom: 12 }}>{verifyLoading ? 'Sending...' : 'Send Verification Code'}</button>
                        ) : (
                            <>
                                <input type="text" value={verifyCode} onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Enter 6-digit code" className="auth-input" maxLength={6} autoFocus style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.3em', marginBottom: 12 }} onKeyDown={(e) => e.key === 'Enter' && verifyCode.length === 6 && handleVerifyCode()} />
                                <button className="auth-btn-primary" onClick={handleVerifyCode} disabled={verifyLoading || verifyCode.length !== 6} style={{ width: '100%', marginBottom: 8 }}>{verifyLoading ? 'Verifying...' : 'Verify & Continue'}</button>
                                <button onClick={handleSendVerification} disabled={verifyLoading} style={{ width: '100%', background: 'transparent', border: 'none', color: '#7c5cfc', cursor: 'pointer', fontSize: '0.85rem', padding: 8 }}>Resend code</button>
                            </>
                        )}
                        <button onClick={() => { setShowVerifyModal(false); setVerifyStep('send'); setVerifyCode(''); setVerifyError(''); setVerifySuccess(''); }} style={{ width: '100%', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem', padding: 10, borderRadius: 8, marginTop: 8 }}>Cancel</button>
                    </div>
                </div>
            )}
        </div>
    );
}
