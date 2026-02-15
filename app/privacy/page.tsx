'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/useTranslation';

export default function PrivacyPage() {
    const { t } = useTranslation();
    return (
        <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', color: 'var(--text-primary)' }}>
            <h1 style={{ marginBottom: '24px' }}>{t('account.privacy')}</h1>
            <section style={{ marginBottom: '32px' }}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>Last updated: February 15, 2026</p>
                <p>We value your privacy. Your generated images and prompts are private by default.</p>
                <h2 style={{ marginTop: '24px', marginBottom: '12px' }}>1. Data Collection</h2>
                <p>We collect minimal data required to provide the service and handle payments.</p>
            </section>
            <Link href="/" style={{ color: 'var(--primary)', fontWeight: 600 }}>← Back to Home</Link>
        </div>
    );
}
