'use client';

import React, { useState } from 'react';
import { useTranslation } from '@/lib/useTranslation';

export default function PricingPage() {
    const { t } = useTranslation();

    const plans = [
        {
            nameKey: 'pricing.standard',
            packType: 'standard',
            price: '$14.99',
            credits: 200,
            perCredit: '~$0.075',
            featured: false,
            featureKeys: [
                'pricing.feat.credits200',
                'pricing.feat.allModes',
                'pricing.feat.standardRes',
                'pricing.feat.faceSwapInpaint',
            ],
        },
        {
            nameKey: 'pricing.premium',
            packType: 'premium',
            price: '$39.99',
            credits: 600,
            perCredit: '~$0.067',
            featured: true,
            featureKeys: [
                'pricing.feat.credits600',
                'pricing.feat.allModes',
                'pricing.feat.hdRes',
                'pricing.feat.faceSwapUnlimited',
                'pricing.feat.priority',
            ],
        },
    ];

    const [loadingPack, setLoadingPack] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Email verification modal state
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
        setVerifyError('');
        setVerifySuccess('');
        setVerifyLoading(true);
        try {
            const res = await fetch('/api/auth/verify-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${getToken()}`,
                },
                body: JSON.stringify({ action: 'send' }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            if (data.devOtp) setDevOtp(data.devOtp);
            setVerifyStep('verify');
            setVerifySuccess('Verification code sent to your email');
        } catch (err) {
            setVerifyError(err instanceof Error ? err.message : 'Failed to send code');
        } finally {
            setVerifyLoading(false);
        }
    };

    const handleVerifyCode = async () => {
        setVerifyError('');
        setVerifySuccess('');
        setVerifyLoading(true);
        try {
            const res = await fetch('/api/auth/verify-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${getToken()}`,
                },
                body: JSON.stringify({ action: 'verify', code: verifyCode }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            // Email verified — proceed with checkout
            setShowVerifyModal(false);
            setVerifyStep('send');
            setVerifyCode('');
            if (pendingPackType) {
                handleCheckout(pendingPackType);
            }
        } catch (err) {
            setVerifyError(err instanceof Error ? err.message : 'Verification failed');
        } finally {
            setVerifyLoading(false);
        }
    };

    const handleCheckout = async (packType: string) => {
        setError(null);
        setLoadingPack(packType);
        try {
            const token = getToken();
            if (!token) {
                setError(t('pricing.loginRequired'));
                setLoadingPack(null);
                return;
            }
            const res = await fetch('/api/billing/create-invoice', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ packType }),
            });
            const data = await res.json();

            if (data.requiresVerification) {
                // Show email verification modal
                setPendingPackType(packType);
                setShowVerifyModal(true);
                setLoadingPack(null);
                return;
            }

            if (res.ok && data.invoice_url) {
                window.location.href = data.invoice_url;
            } else {
                setError(data.error || t('pricing.paymentError'));
                setLoadingPack(null);
            }
        } catch (e) {
            setError(t('pricing.networkError'));
            setLoadingPack(null);
        }
    };

    return (
        <div className="pricing-view">
            <h1 className="pricing-title">{t('pricing.title')}</h1>
            <p className="pricing-subtitle">{t('pricing.subtitle')}</p>

            {error && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#f87171', padding: '12px', borderRadius: '8px', margin: '0 auto 24px auto', maxWidth: '600px', textAlign: 'center' }}>
                    {error}
                </div>
            )}

            <div className="pricing-grid">
                {plans.map((plan) => (
                    <div
                        key={plan.packType}
                        className={`pricing-card ${plan.featured ? 'featured' : ''}`}
                    >
                        <div className="pricing-card-name">{t(plan.nameKey)}</div>
                        <div className="pricing-card-price">
                            {plan.price}
                        </div>
                        <ul className="pricing-feature-list">
                            {plan.featureKeys.map((key, i) => (
                                <li key={i}>
                                    <span className="check">✓</span>
                                    {t(key)}
                                </li>
                            ))}
                        </ul>
                        <button
                            className="pricing-cta"
                            disabled={loadingPack !== null}
                            onClick={() => handleCheckout(plan.packType)}
                        >
                            {loadingPack === plan.packType
                                ? t('pricing.processing')
                                : `${t('pricing.buyWithCrypto')} (${plan.price})`
                            }
                        </button>
                    </div>
                ))}
            </div>

            {/* Email Verification Modal */}
            {showVerifyModal && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    background: 'rgba(0,0,0,0.7)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', padding: '20px',
                }}>
                    <div style={{
                        background: 'var(--bg-primary, #1a1a2e)', borderRadius: '16px',
                        padding: '32px', maxWidth: '420px', width: '100%',
                        border: '1px solid rgba(124,92,252,0.2)',
                    }}>
                        <h2 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', color: 'var(--text-primary, #fff)' }}>
                            Verify Your Email
                        </h2>
                        <p style={{ margin: '0 0 20px 0', fontSize: '0.9rem', color: 'var(--text-secondary, #a0a0b0)' }}>
                            Email verification is required before purchasing credits.
                        </p>

                        {verifyError && (
                            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', color: '#f87171', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem' }}>
                                {verifyError}
                            </div>
                        )}
                        {verifySuccess && (
                            <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid #22c55e', color: '#4ade80', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem' }}>
                                {verifySuccess}
                            </div>
                        )}

                        {devOtp && (
                            <div style={{ background: 'rgba(124,92,252,0.1)', padding: '8px 12px', borderRadius: '8px', marginBottom: '12px', fontSize: '0.85rem', color: '#a78bfa' }}>
                                Dev OTP: <strong>{devOtp}</strong>
                            </div>
                        )}

                        {verifyStep === 'send' ? (
                            <button
                                className="auth-btn-primary"
                                onClick={handleSendVerification}
                                disabled={verifyLoading}
                                style={{ width: '100%', marginBottom: '12px' }}
                            >
                                {verifyLoading ? 'Sending...' : 'Send Verification Code'}
                            </button>
                        ) : (
                            <>
                                <div style={{ marginBottom: '12px' }}>
                                    <input
                                        type="text"
                                        value={verifyCode}
                                        onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        placeholder="Enter 6-digit code"
                                        className="auth-input"
                                        maxLength={6}
                                        autoFocus
                                        style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.3em' }}
                                        onKeyDown={(e) => e.key === 'Enter' && verifyCode.length === 6 && handleVerifyCode()}
                                    />
                                </div>
                                <button
                                    className="auth-btn-primary"
                                    onClick={handleVerifyCode}
                                    disabled={verifyLoading || verifyCode.length !== 6}
                                    style={{ width: '100%', marginBottom: '8px' }}
                                >
                                    {verifyLoading ? 'Verifying...' : 'Verify & Continue'}
                                </button>
                                <button
                                    onClick={handleSendVerification}
                                    disabled={verifyLoading}
                                    style={{
                                        width: '100%', background: 'transparent', border: 'none',
                                        color: '#7c5cfc', cursor: 'pointer', fontSize: '0.85rem', padding: '8px',
                                    }}
                                >
                                    Resend code
                                </button>
                            </>
                        )}

                        <button
                            onClick={() => { setShowVerifyModal(false); setVerifyStep('send'); setVerifyCode(''); setVerifyError(''); setVerifySuccess(''); }}
                            style={{
                                width: '100%', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                                color: 'var(--text-secondary, #a0a0b0)', cursor: 'pointer', fontSize: '0.85rem',
                                padding: '10px', borderRadius: '8px', marginTop: '8px',
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
