'use client';

import React, { useState } from 'react';
import { useTranslation } from '@/lib/useTranslation';

export default function PricingPage() {
    const { t } = useTranslation();

    const plans = [
        {
            name: t('pricing.basic'),
            packType: 'basic',
            price: '$14.99',
            featured: false,
            features: [
                t('pricing.features.credits', { count: '100' }),
                t('pricing.features.res4k'),
                t('pricing.features.allModes'),
                t('pricing.features.faceSwapUnlimited'),
                t('pricing.features.videoGen'),
            ],
        },
        {
            name: t('pricing.unlimited'),
            packType: 'unlimited',
            price: '$29.99',
            featured: true,
            features: [
                t('pricing.features.credits', { count: '300' }),
                t('pricing.features.res4k'),
                t('pricing.features.allModes'),
                t('pricing.features.faceSwapUnlimited'),
                t('pricing.features.videoGen'),
            ],
        },
    ];

    const [loadingPack, setLoadingPack] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleCheckout = async (packType: string, price: string) => {
        setError(null);
        setLoadingPack(packType);
        try {
            const token = localStorage.getItem('auth_token');
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
            if (res.ok && data.invoice_url) {
                window.location.href = data.invoice_url;
            } else {
                setError(data.error || t('pricing.initError'));
                setLoadingPack(null);
            }
        } catch {
            setError(t('pricing.networkError'));
            setLoadingPack(null);
        }
    };

    return (
        <div className="pricing-view">
            <h1 className="pricing-title">{t('pricing.title')}</h1>
            <p className="pricing-subtitle">{t('pricing.subtitle')}</p>

            {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', color: '#f87171', padding: '12px', borderRadius: '8px', margin: '0 auto 24px auto', maxWidth: '600px', textAlign: 'center' }}>
                    {error}
                </div>
            )}

            <div className="pricing-grid" style={{ maxWidth: 640, margin: '0 auto' }}>
                {plans.map((plan) => (
                    <div key={plan.packType} className={`pricing-card ${plan.featured ? 'featured' : ''}`}>
                        {plan.featured && (
                            <div style={{ textAlign: 'center', marginBottom: 12 }}>
                                <span style={{ background: 'var(--primary)', color: '#fff', fontSize: '0.72rem', fontWeight: 700, padding: '3px 12px', borderRadius: 20, letterSpacing: '0.05em' }}>
                                    {t('pricing.bestValue')}
                                </span>
                            </div>
                        )}
                        <div className="pricing-card-name">{plan.name}</div>
                        <div className="pricing-card-price">{plan.price}</div>
                        <ul className="pricing-feature-list">
                            {plan.features.map((f, i) => (
                                <li key={i}>
                                    <span className="check">✓</span>
                                    {f}
                                </li>
                            ))}
                        </ul>
                        <button
                            className="pricing-cta"
                            disabled={loadingPack !== null}
                            onClick={() => handleCheckout(plan.packType, plan.price)}
                        >
                            {loadingPack === plan.packType
                                ? t('pricing.processing')
                                : t('pricing.buyNow', { price: plan.price })}
                        </button>
                    </div>
                ))}
            </div>

            <div style={{ textAlign: 'center', marginTop: 32, color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>
                🔒 {t('pricing.cryptoNote')}
            </div>
        </div>
    );
}
