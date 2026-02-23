'use client';

import React, { useState } from 'react';

export default function PricingPage() {
    const plans = [
        {
            name: 'お試し',
            packType: 'starter',
            price: '$4.99',
            credits: 500,
            perCredit: '~$0.010',
            featured: false,
            features: [
                { text: '500 クレジット', available: true },
                { text: 'Text → Image', available: true },
                { text: '標準解像度', available: true },
                { text: 'Face Swap / Inpaint', available: false },
            ],
        },
        {
            name: 'ライト',
            packType: 'light',
            price: '$9.99',
            credits: 1200,
            perCredit: '~$0.008',
            featured: false,
            features: [
                { text: '1,200 クレジット', available: true },
                { text: '全生成モード', available: true },
                { text: 'HD解像度', available: true },
                { text: 'Face Swap / Inpaint', available: true },
            ],
        },
        {
            name: 'スタンダード',
            packType: 'standard',
            price: '$24.99',
            credits: 4000,
            perCredit: '~$0.006',
            featured: true,
            features: [
                { text: '4,000 クレジット', available: true },
                { text: '全生成モード', available: true },
                { text: 'Ultra HD解像度', available: true },
                { text: 'Face Swap / Inpaint 無制限', available: true },
                { text: '優先生成', available: true },
            ],
        },
        {
            name: 'プレミアム',
            packType: 'premium',
            price: '$49.99',
            credits: 10000,
            perCredit: '~$0.005',
            featured: false,
            features: [
                { text: '10,000 クレジット', available: true },
                { text: '全生成モード', available: true },
                { text: '最高品質', available: true },
                { text: 'Face Swap / Inpaint 無制限', available: true },
                { text: '優先生成 + 優先サポート', available: true },
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
                setError('ログインが必要です');
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
                setError(data.error || '決済の初期化に失敗しました');
                setLoadingPack(null);
            }
        } catch (e) {
            setError('ネットワークエラーが発生しました');
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
                                ? '処理中...'
                                : `仮想通貨で購入 (${plan.price})`
                            }
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
