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

    const handleCheckout = async (packType: string) => {
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
        </div>
    );
}
