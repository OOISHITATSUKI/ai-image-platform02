'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/useTranslation';

export default function HelpPage() {
    const { t } = useTranslation();
    return (
        <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', color: 'var(--text-primary)' }}>
            <h1 style={{ marginBottom: '24px' }}>{t('account.help')}</h1>
            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ marginTop: '24px', marginBottom: '12px' }}>How do I generate images?</h2>
                <p>Enter a prompt in the chat box and click the send button. You can also upload reference images.</p>
                <h2 style={{ marginTop: '24px', marginBottom: '12px' }}>What are credits?</h2>
                <p>Credits are used to generate content. Each image costs 1 credit, and videos cost 5 credits.</p>
            </section>
            <Link href="/" style={{ color: 'var(--primary)', fontWeight: 600 }}>← Back to Home</Link>
        </div>
    );
}
