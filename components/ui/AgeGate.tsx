'use client';

import React from 'react';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/useTranslation';

export default function AgeGate() {
    const { ageVerified, setAgeVerified } = useAppStore();
    const { t } = useTranslation();

    const [agreed, setAgreed] = React.useState(false);

    if (ageVerified) return null;

    return (
        <div className="age-gate-overlay">
            <div className="age-gate-card">
                <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>🔞</div>
                <h2>{t('ageGate.title')}</h2>
                <p>{t('ageGate.message')}</p>

                <div className="age-gate-consent">
                    <label>
                        <input
                            type="checkbox"
                            checked={agreed}
                            onChange={(e) => setAgreed(e.target.checked)}
                        />
                        <span>
                            {t('ageGate.checkbox')} (<a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)' }}>{t('ageGate.termsLink')}</a>)
                        </span>
                    </label>
                </div>

                <div className="age-gate-actions">
                    <button
                        className="age-gate-enter"
                        onClick={() => setAgeVerified(true)}
                        disabled={!agreed}
                        style={{ opacity: agreed ? 1 : 0.5, cursor: agreed ? 'pointer' : 'not-allowed' }}
                    >
                        {t('ageGate.enter')}
                    </button>
                    <button
                        className="age-gate-leave"
                        onClick={() => {
                            window.location.href = 'https://www.google.com';
                        }}
                    >
                        {t('ageGate.leave')}
                    </button>
                </div>
            </div>
        </div>
    );
}
