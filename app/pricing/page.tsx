'use client';

import React, { useState } from 'react';

export default function PricingPage() {
    const plans = [
        {
            name: 'Starter',
            packType: 'starter',
            price: '$4.99',
            credits: 500,
            perCredit: '~$0.010',
            featured: false,
            features: [
                { text: '500 Credits', available: true },
                { text: 'Text to Image', available: true },
                { text: 'Standard Resolution', available: true },
                { text: 'Face Swap / Nude Mode', available: false },
            ],
        },
        {
            name: 'Light',
            packType: 'light',
            price: '$9.99',
            credits: 1200,
            perCredit: '~$0.008',
            featured: false,
            features: [
                { text: '1,200 Credits', available: true },
                { text: 'All Generation Modes', available: true },
                { text: 'HD Resolution', available: true },
                { text: 'Face Swap / Nude Mode', available: true },
            ],
        },
        {
            name: 'Standard',
            packType: 'standard',
            price: '$24.99',
            credits: 4000,
            perCredit: '~$0.006',
            featured: true,
            features: [
                { text: '4,000 Credits', available: true },
                { text: 'All Generation Modes', available: true },
                { text: 'Ultra HD Resolution', available: true },
                { text: 'Unlimited Face Swap / Nude Mode', available: true },
                { text: 'Priority Generation', available: true },
            ],
        },
        {
            name: 'Premium',
            packType: 'premium',
            price: '$49.99',
            credits: 10000,
            perCredit: '~$0.005',
            featured: false,
            features: [
                { text: '10,000 Credits', available: true },
                { text: 'All Generation Modes', available: true },
                { text: 'Highest Quality', available: true },
                { text: 'Unlimited Face Swap / Nude Mode', available: true },
                { text: 'Priority Generation + Support', available: true },
            ],
        },
    ];

    const [loadingPack, setLoadingPack] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Email verification modal state
    const [showVerifyModal, setShowVerifyModal] = useState(false);
    const [pendingPackType, setPendingPackType] = useState<string | null>(null);
    const [verifyCode, setVerifyCode] = useState('');
    const [verifyStep, setVerifyStep] = useState<'send' | 'verify'>('send');
    const [verifyLoading, setVerifyLoading] = useState(false);
    const [verifyError, setVerifyError] = useState('');
    const [devOtp, setDevOtp] = useState('');
    const [userEmail, setUserEmail] = useState('');

    const getToken = () => localStorage.getItem('auth_token');

    const handleCheckout = async (packType: string) => {
        setError(null);
        setLoadingPack(packType);
        try {
            const token = getToken();
            if (!token) {
                setError('Login required');
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

            if (res.ok && data.invoice_url) {
                window.location.href = data.invoice_url;
            } else if (data.requiresVerification) {
                // Show email verification modal
                setPendingPackType(packType);
                setVerifyStep('send');
                setVerifyCode('');
                setVerifyError('');
                setShowVerifyModal(true);
                setLoadingPack(null);
            } else {
                setError(data.error || 'Payment initialization failed');
                setLoadingPack(null);
            }
        } catch {
            setError('A network error occurred');
            setLoadingPack(null);
        }
    };

    const handleSendVerification = async () => {
        setVerifyError('');
        setVerifyLoading(true);
        try {
            const token = getToken();
            const res = await fetch('/api/auth/verify-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ action: 'send' }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            if (data.devOtp) setDevOtp(data.devOtp);
            setVerifyStep('verify');
        } catch (err) {
            setVerifyError(err instanceof Error ? err.message : 'Failed to send verification code');
        } finally {
            setVerifyLoading(false);
        }
    };

    const handleVerifyCode = async () => {
        setVerifyError('');
        setVerifyLoading(true);
        try {
            const token = getToken();
            const res = await fetch('/api/auth/verify-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ action: 'verify', code: verifyCode }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            // Verification successful — proceed with checkout
            setShowVerifyModal(false);
            if (pendingPackType) {
                handleCheckout(pendingPackType);
            }
        } catch (err) {
            setVerifyError(err instanceof Error ? err.message : 'Verification failed');
        } finally {
            setVerifyLoading(false);
        }
    };

    return (
        <div className="pricing-view">
            <h1 className="pricing-title">Choose Your Plan</h1>
            <p className="pricing-subtitle">Unlock the full power of AI generation</p>

            {error && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#f87171', padding: '12px', borderRadius: '8px', margin: '0 auto 24px auto', maxWidth: '600px', textAlign: 'center' }}>
                    {error}
                </div>
            )}

            <div className="pricing-grid">
                {plans.map((plan) => (
                    <div
                        key={plan.name}
                        className={`pricing-card ${plan.featured ? 'featured' : ''}`}
                    >
                        <div className="pricing-card-name">{plan.name}</div>
                        <div className="pricing-card-price">
                            {plan.price}
                        </div>
                        <ul className="pricing-feature-list">
                            {plan.features.map((f, i) => (
                                <li key={i}>
                                    <span className={f.available ? 'check' : 'cross'}>
                                        {f.available ? '✓' : '✕'}
                                    </span>
                                    {f.text}
                                </li>
                            ))}
                        </ul>
                        <button
                            className="pricing-cta"
                            disabled={loadingPack !== null}
                            onClick={() => handleCheckout(plan.packType)}
                        >
                            {loadingPack === plan.packType
                                ? 'Processing...'
                                : `Buy with Crypto (${plan.price})`
                            }
                        </button>
                    </div>
                ))}
            </div>

            {/* Email Verification Modal */}
            {showVerifyModal && (
                <div
                    style={{
                        position: 'fixed', inset: 0, zIndex: 9999,
                        background: 'rgba(0,0,0,0.7)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '20px',
                    }}
                    onClick={() => setShowVerifyModal(false)}
                >
                    <div
                        style={{
                            background: '#1a1a2e', borderRadius: '16px',
                            padding: '32px', maxWidth: '420px', width: '100%',
                            border: '1px solid #2a2a4a',
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <h2 style={{ color: '#fff', fontSize: '1.25rem', marginBottom: '8px' }}>
                            Email Verification Required
                        </h2>
                        <p style={{ color: '#9999ae', fontSize: '0.9rem', marginBottom: '24px' }}>
                            Email verification is required to purchase credits.
                        </p>

                        {verifyError && (
                            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#f87171', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem' }}>
                                {verifyError}
                            </div>
                        )}

                        {devOtp && (
                            <div style={{ background: 'rgba(124,92,252,0.1)', border: '1px solid rgba(124,92,252,0.3)', color: '#c084fc', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem', textAlign: 'center' }}>
                                Dev mode — OTP: <strong>{devOtp}</strong>
                            </div>
                        )}

                        {verifyStep === 'send' ? (
                            <button
                                onClick={handleSendVerification}
                                disabled={verifyLoading}
                                style={{
                                    width: '100%', padding: '12px',
                                    background: '#7c5cfc', color: '#fff',
                                    border: 'none', borderRadius: '10px',
                                    fontSize: '1rem', cursor: 'pointer',
                                    opacity: verifyLoading ? 0.6 : 1,
                                }}
                            >
                                {verifyLoading ? 'Sending...' : 'Send Verification Code'}
                            </button>
                        ) : (
                            <>
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', color: '#b0b0c0', fontSize: '0.85rem', marginBottom: '6px' }}>
                                        Verification Code
                                    </label>
                                    <input
                                        type="text"
                                        value={verifyCode}
                                        onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        placeholder="000000"
                                        maxLength={6}
                                        autoFocus
                                        onKeyDown={(e) => e.key === 'Enter' && verifyCode.length === 6 && handleVerifyCode()}
                                        style={{
                                            width: '100%', padding: '12px',
                                            background: '#0f0f23', color: '#fff',
                                            border: '1px solid #2a2a4a', borderRadius: '8px',
                                            fontSize: '1.5rem', textAlign: 'center',
                                            letterSpacing: '8px',
                                        }}
                                    />
                                </div>
                                <button
                                    onClick={handleVerifyCode}
                                    disabled={verifyLoading || verifyCode.length !== 6}
                                    style={{
                                        width: '100%', padding: '12px',
                                        background: '#7c5cfc', color: '#fff',
                                        border: 'none', borderRadius: '10px',
                                        fontSize: '1rem', cursor: 'pointer',
                                        opacity: (verifyLoading || verifyCode.length !== 6) ? 0.6 : 1,
                                    }}
                                >
                                    {verifyLoading ? 'Verifying...' : 'Verify & Continue'}
                                </button>
                                <button
                                    onClick={handleSendVerification}
                                    disabled={verifyLoading}
                                    style={{
                                        width: '100%', padding: '8px', marginTop: '8px',
                                        background: 'transparent', color: '#7c5cfc',
                                        border: 'none', cursor: 'pointer',
                                        fontSize: '0.85rem',
                                    }}
                                >
                                    Resend code
                                </button>
                            </>
                        )}

                        <button
                            onClick={() => setShowVerifyModal(false)}
                            style={{
                                width: '100%', padding: '8px', marginTop: '12px',
                                background: 'transparent', color: '#6b6b85',
                                border: 'none', cursor: 'pointer',
                                fontSize: '0.85rem',
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
