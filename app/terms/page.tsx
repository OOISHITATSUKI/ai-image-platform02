'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/useTranslation';

export default function TermsPage() {
    const { t } = useTranslation();
    return (
        <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', color: 'var(--text-primary)' }}>
            <h1 style={{ marginBottom: '24px' }}>{t('account.terms')}</h1>
            <section style={{ marginBottom: '32px' }}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>Last updated: February 15, 2026</p>
                <p>Welcome to VideoGen. By using our service, you agree to these terms.</p>
                <h2 style={{ marginTop: '24px', marginBottom: '12px' }}>1. Content Policy</h2>
                <p>You are responsible for the content you generate. Content must comply with local laws and our community guidelines.</p>
                <h2 style={{ marginTop: '24px', marginBottom: '12px' }}>2. Credits & Payments</h2>
                <p>Credits are non-refundable except where required by law. Subscription can be cancelled at any time.</p>
            </section>
            <Link href="/" style={{ color: 'var(--primary)', fontWeight: 600 }}>← Back to Home</Link>
        </div >
    );
}
