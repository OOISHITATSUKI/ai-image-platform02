'use client';

import React, { useState } from 'react';

export default function PricingPage() {
    const plans = [
        {
            name: 'Free',
            price: '$0',
            period: '',
            featured: false,
            features: [
                { text: '5 images/day', available: true },
                { text: 'No video generation', available: false },
                { text: 'Max 512px resolution', available: true },
                { text: 'No face swap', available: false },
                { text: '24-hour history', available: true },
                { text: 'Contains ads', available: false },
            ],
        },
        {
            name: 'Basic',
            price: '$9.99',
            period: '/month',
            featured: false,
            features: [
                { text: '100 images/day', available: true },
                { text: '5 videos/day', available: true },
                { text: 'Max 1024px resolution', available: true },
                { text: 'Max 3s video', available: true },
                { text: '10 face swaps/day', available: true },
                { text: '30-day history', available: true },
                { text: 'No ads', available: true },
            ],
        },
        {
            name: 'Pro',
            price: '$24.99',
            period: '/month',
            featured: true,
            features: [
                { text: '500 images/day', available: true },
                { text: '30 videos/day', available: true },
                { text: 'Max 2K resolution', available: true },
                { text: 'Max 8s video', available: true },
                { text: '50 face swaps/day', available: true },
                { text: 'Unlimited history', available: true },
                { text: 'No ads', available: true },
            ],
        },
        {
            name: 'Ultimate',
            price: '$49.99',
            period: '/month',
            featured: false,
            features: [
                { text: 'Unlimited images', available: true },
                { text: '100 videos/day', available: true },
                { text: 'Max 4K resolution', available: true },
                { text: 'Max 20s video', available: true },
                { text: 'Unlimited face swaps', available: true },
                { text: 'Unlimited history', available: true },
                { text: 'No ads', available: true },
                { text: 'Priority support', available: true },
            ],
        },
    ];

    const [loadingPack, setLoadingPack] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleCheckout = async (packName: string) => {
        setError(null);
        let packType = '';
        if (packName === 'Basic') packType = 'light';
        else if (packName === 'Pro') packType = 'standard';
        else if (packName === 'Ultimate') packType = 'premium';
        else return;

        setLoadingPack(packName);
        try {
            const token = localStorage.getItem('auth_token');
            const res = await fetch('/api/billing/create-invoice', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ packType })
            });
            const data = await res.json();

            if (res.ok && data.invoice_url) {
                // Redirect user to NowPayments hosted checkout page
                window.location.href = data.invoice_url;
            } else {
                setError(data.error || 'Failed to initialize payment');
                setLoadingPack(null);
            }
        } catch (e) {
            setError('Network error occurred');
            setLoadingPack(null);
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
                            {plan.period && <span>{plan.period}</span>}
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
                            disabled={plan.price === '$0' || loadingPack !== null}
                            onClick={() => plan.price !== '$0' && handleCheckout(plan.name)}
                        >
                            {loadingPack === plan.name ? 'Processing...' : plan.price === '$0' ? 'Current Plan' : 'Purchase with Crypto'}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
