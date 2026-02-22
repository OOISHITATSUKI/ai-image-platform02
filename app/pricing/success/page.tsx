'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';

export default function PricingSuccessPage() {
    const router = useRouter();
    const { fetchUserData } = useAppStore();
    const [seconds, setSeconds] = useState(5);

    useEffect(() => {
        // Refresh user data so that if the IPN arrived fast enough, credits are updated
        fetchUserData();

        const interval = setInterval(() => {
            setSeconds(s => s - 1);
        }, 1000);

        const timeout = setTimeout(() => {
            router.push('/editor');
        }, 5000);

        return () => {
            clearInterval(interval);
            clearTimeout(timeout);
        };
    }, [router, fetchUserData]);

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            minHeight: '80vh', textAlign: 'center', padding: '20px'
        }}>
            <div style={{ fontSize: '4rem', marginBottom: '20px' }}>✅</div>
            <h1 style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>
                Payment Received
            </h1>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', maxWidth: '600px', lineHeight: 1.6, marginBottom: '24px' }}>
                Thank you for your purchase. We are processing your transaction on the blockchain.
                Your credits will be added to your account as soon as the network confirms the payment.
            </p>
            <div style={{ color: 'var(--primary)', fontWeight: 500 }}>
                Redirecting to Editor in {seconds} seconds...
            </div>

            <button
                onClick={() => router.push('/editor')}
                style={{
                    marginTop: '32px', padding: '12px 24px', background: 'var(--bg-card)',
                    border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)',
                    cursor: 'pointer', fontSize: '1rem', fontWeight: 500
                }}
            >
                Go to Editor Now
            </button>
        </div>
    );
}
