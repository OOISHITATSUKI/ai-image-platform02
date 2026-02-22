'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/useTranslation';
import Link from 'next/link';

export default function FirstGenModal() {
    const { user, setUser } = useAppStore();
    const { t } = useTranslation();

    const [chkPrivacy, setChkPrivacy] = useState(false);
    const [chkCompliance, setChkCompliance] = useState(false);
    const [chkProhibited, setChkProhibited] = useState(false);
    const [loading, setLoading] = useState(false);

    // Don't show if already confirmed or not authenticated
    if (!user || user.firstGenerationConfirmed) return null;

    const isUS = user.country === 'US';
    const allChecked = chkPrivacy && chkCompliance && chkProhibited;

    const handleConfirm = async () => {
        if (!allChecked) return;
        setLoading(true);
        try {
            const token = localStorage.getItem('auth_token');
            if (token) {
                await fetch('/api/auth/me', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({ firstGenerationConfirmed: true }),
                });
            }

            // Update local state
            setUser({ ...user, firstGenerationConfirmed: true });
        } catch (err) {
            console.error('FirstGenModal confirm error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="firstgen-overlay">
            <div className="firstgen-card">
                <h2>{t('firstGenModal.title')}</h2>
                <hr className="firstgen-divider" />

                <div className="firstgen-section">
                    <h3 className="firstgen-section-title">{t('firstGenModal.privacyTitle')}</h3>
                    <ul className="firstgen-list">
                        <li>{t('firstGenModal.privacyPoint1')}</li>
                        <li>{t('firstGenModal.privacyPoint2')}</li>
                        <li>{t('firstGenModal.privacyPoint3')}</li>
                    </ul>
                    <Link href="/privacy" target="_blank" className="firstgen-link">
                        [{t('firstGenModal.readFullText')}]
                    </Link>
                    <label className="firstgen-checkbox" onClick={() => setChkPrivacy(!chkPrivacy)}>
                        <input type="checkbox" checked={chkPrivacy} readOnly />
                        <span>{t('firstGenModal.privacyCheck')}</span>
                    </label>
                </div>

                <hr className="firstgen-divider" />

                <div className={`firstgen-section ${isUS ? 'firstgen-highlight-us' : ''}`}>
                    <h3 className="firstgen-section-title">{t('firstGenModal.complianceTitle')}</h3>
                    <p className="firstgen-subtitle">{t('firstGenModal.complianceSubtitle')}</p>
                    <p className="firstgen-text">
                        {t('firstGenModal.compliancePoint1').split('\n').map((line: string, i: number) => (
                            <React.Fragment key={i}>
                                {line}
                                <br />
                            </React.Fragment>
                        ))}
                    </p>
                    <Link href="/terms" target="_blank" className="firstgen-link">
                        [{t('firstGenModal.readFullText')}]
                    </Link>
                    <label className="firstgen-checkbox" onClick={() => setChkCompliance(!chkCompliance)}>
                        <input type="checkbox" checked={chkCompliance} readOnly />
                        <span>{t('firstGenModal.complianceCheck')}</span>
                    </label>
                </div>

                <hr className="firstgen-divider" />

                <div className="firstgen-section">
                    <label className="firstgen-checkbox firstgen-checkbox-large" onClick={() => setChkProhibited(!chkProhibited)}>
                        <input type="checkbox" checked={chkProhibited} readOnly />
                        <span>{t('firstGenModal.prohibitedCheck')}</span>
                    </label>
                </div>

                <div className="firstgen-actions">
                    <button
                        className="auth-btn-primary firstgen-submit"
                        onClick={handleConfirm}
                        disabled={!allChecked || loading}
                    >
                        {loading ? '...' : `[ ${t('firstGenModal.startButton')} ]`}
                    </button>
                </div>
            </div>
        </div>
    );
}
