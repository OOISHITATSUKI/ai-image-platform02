'use client';

import React from 'react';

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

    return (
        <div className="pricing-view">
            <h1 className="pricing-title">Choose Your Plan</h1>
            <p className="pricing-subtitle">Unlock the full power of AI generation</p>

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
                        <button className="pricing-cta">
                            {plan.price === '$0' ? 'Current Plan' : 'Upgrade'}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
