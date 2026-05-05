'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/useTranslation';
import { useAppStore } from '@/lib/store';

export default function PricingPage() {
    const { t: rawT } = useTranslation();
    // t() returns the key itself when missing — this wrapper falls back properly
    const t = (key: string, fallback?: string) => {
        const val = rawT(key);
        return (val === key && fallback) ? fallback : val;
    };
    const { user, isAuthenticated } = useAppStore();
    const currentPlan = user?.plan || 'free';

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
    const [showPacks, setShowPacks] = useState(false);

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

    const handleRapydCheckout = async (packType: string) => {
        setError(null); setLoadingPack(`rapyd_${packType}`);
        try {
            const token = getToken();
            if (!token) { setError(t('pricing.loginRequired')); setLoadingPack(null); return; }
            const res = await fetch('/api/rapyd/create-checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ packType }),
            });
            const data = await res.json();
            if (data.requiresVerification) { setPendingPackType(packType); setShowVerifyModal(true); setLoadingPack(null); return; }
            if (res.ok && data.checkout_url) { window.location.href = data.checkout_url; }
            else { setError(data.error || t('pricing.paymentError')); setLoadingPack(null); }
        } catch { setError(t('pricing.networkError')); setLoadingPack(null); }
    };

    const FANVUE_PROFILE_URL = 'https://www.fanvue.com/tat05';

    const ok = <span style={{ color: '#34d399', flexShrink: 0 }}>✓</span>;
    const no = <span style={{ color: 'rgba(255,255,255,0.15)', flexShrink: 0 }}>—</span>;

    const subBtnStyle: React.CSSProperties = { padding: '10px 16px', borderRadius: 10, fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', marginTop: 'auto', textAlign: 'center', background: 'rgba(255,255,255,0.08)', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.15)', display: 'block', width: '100%', textDecoration: 'none', boxSizing: 'border-box' };

    return (
        <div className="pricing-view">
            <div style={{ maxWidth: 880, margin: '0 auto', padding: '0 16px' }}>
                {/* ── Header ── */}
                <h1 className="pricing-title" style={{ textAlign: 'center', marginBottom: 6 }}>
                    {t('pricing.plans.title') || 'Choose your plan'}
                </h1>
                <p style={{ textAlign: 'center', fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: 28, lineHeight: 1.5 }}>
                    {t('pricing.plans.subtitle') || 'One credit. Everything unlocked. No expiry.'}
                </p>

                {error && (
                    <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', color: '#f87171', padding: 12, borderRadius: 8, marginBottom: 20, textAlign: 'center', fontSize: '0.85rem' }}>
                        {error}
                    </div>
                )}

                {/* ── Plan Cards: 4-column grid ── */}
                {/* Mobile: Premium first, then Standard, Lite, Free */}
                <div className="pricing-grid" style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 14,
                    alignItems: 'stretch',
                    marginBottom: 28,
                }}>
                    {/* ── FREE ── */}
                    <div className="pricing-plan-card" style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 16,
                        padding: '24px 18px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 5,
                        order: 4,
                    }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            {t('pricing.plans.free.label') || 'Free'}
                        </div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>$0</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: 6 }}>
                            {t('pricing.plans.free.tagline') || 'Try before you buy'}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                            <div style={{ display: 'flex', gap: 7, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{ok} {t('pricing.plans.free.f1') || '10 chats / day'}</div>
                            <div style={{ display: 'flex', gap: 7, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{ok} {t('pricing.plans.free.f2') || 'Basic image generation'}</div>
                            <div style={{ display: 'flex', gap: 7, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{ok} {t('pricing.plans.free.f3') || 'SFW companion photos'}</div>
                            <div style={{ display: 'flex', gap: 7, fontSize: '0.78rem', color: 'rgba(255,255,255,0.25)' }}>{no} {t('pricing.plans.free.f4') || 'NSFW chat & photos'}</div>
                            <div style={{ display: 'flex', gap: 7, fontSize: '0.78rem', color: 'rgba(255,255,255,0.25)' }}>{no} {t('pricing.plans.free.f5') || 'Face Swap / Nude Mode'}</div>
                        </div>
                        {currentPlan === 'free' && isAuthenticated ? (
                            <div style={{ padding: '10px 16px', borderRadius: 10, fontWeight: 700, fontSize: '0.8rem', textAlign: 'center', background: 'rgba(255,255,255,0.06)', color: 'var(--text-tertiary)', marginTop: 'auto' }}>
                                {t('pricing.plans.free.ctaCurrent') || 'Current plan'}
                            </div>
                        ) : !isAuthenticated ? (
                            <Link href="/register" style={{ padding: '10px 16px', borderRadius: 10, fontWeight: 700, fontSize: '0.8rem', textAlign: 'center', background: 'rgba(255,255,255,0.08)', color: 'var(--text-primary)', textDecoration: 'none', display: 'block', marginTop: 'auto', border: '1px solid rgba(255,255,255,0.15)' }}>
                                {t('pricing.plans.free.ctaSignup') || 'Sign up free'}
                            </Link>
                        ) : null}
                    </div>

                    {/* ── LITE (new) ── */}
                    <div className="pricing-plan-card" style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: 16,
                        padding: '24px 18px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 5,
                        order: 3,
                    }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            {t('pricing.plans.lite.label') || 'Lite'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>$7.99</span>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>/mo</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#60a5fa', fontWeight: 600, marginBottom: 2 }}>
                            80 {t('pricing.credits') || 'credits'} / {t('pricing.month') || 'month'}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                            <div style={{ display: 'flex', gap: 7, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{ok} {t('pricing.plans.lite.f1') || 'All generation modes'}</div>
                            <div style={{ display: 'flex', gap: 7, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{ok} {t('pricing.plans.lite.f2') || 'NSFW chat (20/mo)'}</div>
                            <div style={{ display: 'flex', gap: 7, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{ok} {t('pricing.plans.lite.f3') || 'No watermark'}</div>
                        </div>
                        <a href={FANVUE_PROFILE_URL} target="_blank" rel="noopener noreferrer" style={subBtnStyle}>
                            {t('pricing.plans.lite.cta', 'Get Lite')} <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>via Fanvue</span>
                        </a>
                    </div>

                    {/* ── STANDARD ── */}
                    <div className="pricing-plan-card" style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: 16,
                        padding: '24px 18px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 5,
                        order: 2,
                    }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            {t('pricing.plans.standard.label') || 'Standard'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>$14.99</span>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>/mo</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 2 }}>
                            220 {t('pricing.credits') || 'credits'} / {t('pricing.month') || 'month'}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                            <div style={{ display: 'flex', gap: 7, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{ok} {t('pricing.plans.standard.f1') || 'All generation modes'}</div>
                            <div style={{ display: 'flex', gap: 7, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{ok} {t('pricing.plans.standard.f2') || 'Standard resolution'}</div>
                            <div style={{ display: 'flex', gap: 7, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{ok} {t('pricing.plans.standard.f3') || 'NSFW chat & photos'}</div>
                            <div style={{ display: 'flex', gap: 7, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{ok} {t('pricing.plans.standard.f4') || 'No watermark'}</div>
                        </div>
                        <a href={FANVUE_PROFILE_URL} target="_blank" rel="noopener noreferrer" style={subBtnStyle}>
                            {t('pricing.plans.standard.cta', 'Get Standard')} <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>via Fanvue</span>
                        </a>
                    </div>

                    {/* ── PREMIUM (highlighted) ── */}
                    <div className="pricing-plan-card pricing-plan-featured" style={{
                        background: 'linear-gradient(135deg, rgba(167,139,250,0.1), rgba(244,114,182,0.08))',
                        border: '2px solid #a78bfa',
                        borderRadius: 16,
                        padding: '24px 18px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 5,
                        position: 'relative',
                        order: 1,
                    }}>
                        <div style={{
                            position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)',
                            background: 'linear-gradient(135deg, #a78bfa, #f472b6)', color: '#fff',
                            fontSize: '0.62rem', fontWeight: 700, padding: '3px 14px', borderRadius: 16,
                            whiteSpace: 'nowrap',
                        }}>
                            {t('pricing.plans.premium.badge') || 'MOST POPULAR'}
                        </div>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            {t('pricing.plans.premium.label') || 'Premium'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                            <span style={{
                                fontSize: '1.8rem', fontWeight: 800, lineHeight: 1,
                                background: 'linear-gradient(135deg, #a78bfa, #f472b6)',
                                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                            }}>$24.99</span>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>/mo</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#a78bfa', fontWeight: 600, marginBottom: 2 }}>
                            600 {t('pricing.credits') || 'credits'} / {t('pricing.month') || 'month'}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                            <div style={{ display: 'flex', gap: 7, fontSize: '0.78rem', color: 'var(--text-primary)' }}>{ok} {t('pricing.plans.premium.f1') || 'Everything unlocked'}</div>
                            <div style={{ display: 'flex', gap: 7, fontSize: '0.78rem', color: 'var(--text-primary)' }}>{ok} {t('pricing.plans.premium.f2') || 'HD + priority generation'}</div>
                            <div style={{ display: 'flex', gap: 7, fontSize: '0.78rem', color: 'var(--text-primary)' }}>{ok} {t('pricing.plans.premium.f3') || 'Unlimited NSFW chat'}</div>
                            <div style={{ display: 'flex', gap: 7, fontSize: '0.78rem', color: 'var(--text-primary)' }}>{ok} {t('pricing.plans.premium.f4') || 'No watermark'}</div>
                        </div>
                        <a href={FANVUE_PROFILE_URL} target="_blank" rel="noopener noreferrer" style={{
                            padding: '12px 16px', borderRadius: 10, fontWeight: 700, fontSize: '0.85rem',
                            display: 'block', marginTop: 'auto', textDecoration: 'none',
                            background: 'linear-gradient(135deg, #a78bfa, #f472b6)', color: '#fff',
                            textAlign: 'center', boxShadow: '0 4px 20px rgba(167,139,250,0.3)',
                        }}>
                            {t('pricing.plans.premium.cta', 'Get Premium')} <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>via Fanvue</span>
                        </a>
                    </div>
                </div>

                {/* ── Credit Packs (collapsed) ── */}
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <button
                        onClick={() => setShowPacks(!showPacks)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', color: '#a78bfa', fontWeight: 600, padding: '8px 16px' }}
                    >
                        {t('pricing.creditPacksLink') || 'Just need credits? One-time packs from $4.99'} {showPacks ? '▲' : '→'}
                    </button>
                    {showPacks && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginTop: 16, maxWidth: 560, margin: '16px auto 0' }}>
                            {[
                                { id: 'starter', credits: 60, price: '$4.99', tag: '', fanvueUrl: 'https://www.fanvue.com/tat05/media/fvml-2' },
                                { id: 'plus', credits: 150, price: '$9.99', tag: t('pricing.packPopular', 'Popular'), fanvueUrl: 'https://www.fanvue.com/tat05/media/fvml-3' },
                                { id: 'mega', credits: 350, price: '$19.99', tag: t('pricing.packBest', 'Best Value'), fanvueUrl: 'https://www.fanvue.com/tat05/media/fvml-4' },
                            ].map((pack) => (
                                <div key={pack.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '18px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, position: 'relative' }}>
                                    {pack.tag && <span style={{ position: 'absolute', top: -8, right: 12, background: 'linear-gradient(135deg, #f472b6, #a78bfa)', color: '#fff', fontSize: '0.62rem', fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>{pack.tag}</span>}
                                    <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#a78bfa' }}>{pack.credits}</span>
                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>{t('pricing.credits', 'credits')}</span>
                                    <span style={{ fontSize: '1.1rem', fontWeight: 800, background: 'linear-gradient(135deg, #a78bfa, #f472b6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{pack.price}</span>
                                    <div style={{ display: 'flex', gap: 6, marginTop: 6, width: '100%', flexWrap: 'wrap' }}>
                                        <button onClick={() => handleRapydCheckout(pack.id)} disabled={loadingPack !== null}
                                            style={{ flex: 1, padding: '6px 4px', borderRadius: 8, fontSize: '0.65rem', fontWeight: 600, cursor: 'pointer', background: 'rgba(167,139,250,0.15)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.3)', minWidth: '45%' }}>
                                            {loadingPack === `rapyd_${pack.id}` ? '...' : t('pricing.payCard', 'Credit Card')}
                                        </button>
                                        <button onClick={() => handleCheckout(pack.id)} disabled={loadingPack !== null}
                                            style={{ flex: 1, padding: '6px 4px', borderRadius: 8, fontSize: '0.65rem', fontWeight: 600, cursor: 'pointer', background: 'rgba(255,255,255,0.08)', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.12)', minWidth: '45%' }}>
                                            {loadingPack === pack.id ? '...' : t('pricing.payCrypto', 'Cryptocurrency')}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── FAQ (accordion) ── */}
                <div style={{ marginBottom: 40 }}>
                    {[
                        {
                            q: t('pricing.faq.howCreditsQ', 'How do credits work?'),
                            a: t('pricing.faq.howCreditsA', 'Image generation: 1-5 credits. NSFW chat: 1 credit/message. Girlfriend photos: 2-3 credits. Video: 10 credits. SFW chat is always free (10/day).'),
                        },
                        {
                            q: t('pricing.faq.companionQ', 'Is companion chat free?'),
                            a: t('pricing.faq.companionA', 'Yes — SFW chat is free up to 10 messages per day. NSFW chat costs 1 credit per message.'),
                        },
                        {
                            q: t('pricing.faq.whatUnlocksQ', 'What do credits unlock?'),
                            a: t('pricing.faq.whatUnlocksA', 'Credits unlock: NSFW & explicit chat, nude/lingerie girlfriend photos, Face Swap, Nude Mode (Inpaint), AI video generation, all Live Action levels, and HD resolution. SFW chat (10/day) and basic image generation are free.'),
                        },
                        {
                            q: t('pricing.faq.paymentQ', 'What payment methods do you accept?'),
                            a: t('pricing.faq.paymentA', 'Cryptocurrency (Bitcoin, Ethereum, USDT, 70+ cryptocurrencies) via NowPayments.'),
                        },
                        {
                            q: t('pricing.faq.expireQ', 'Do credits expire?'),
                            a: t('pricing.faq.expireA', 'No. Credits never expire as long as your account is active.'),
                        },
                    ].map((faq, i) => (
                        <details key={i} style={{ marginBottom: 4, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 4 }}>
                            <summary style={{ cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', padding: '10px 0', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                {faq.q}
                                <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', marginLeft: 8 }}>+</span>
                            </summary>
                            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.7, margin: '0 0 10px 0' }}>{faq.a}</p>
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

            {/* Responsive: 4col desktop, 2col tablet, 1col mobile (Premium first) */}
            <style>{`
                @media (max-width: 960px) {
                    .pricing-grid { grid-template-columns: repeat(2, 1fr) !important; }
                }
                @media (max-width: 600px) {
                    .pricing-grid { grid-template-columns: 1fr !important; }
                    .pricing-plan-featured { order: -1 !important; }
                }
            `}</style>
        </div>
    );
}
