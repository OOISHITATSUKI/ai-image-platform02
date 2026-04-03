'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/useTranslation';

export interface TutorialStep {
    icon: string;
    titleKey: string;
    descKey: string;
}

interface TutorialModalProps {
    titleKey: string;
    steps: TutorialStep[];
    cookieKey: string;
    ctaKey: string;
    /** Global window key for manual open from sidebar */
    globalOpenKey: string;
}

function getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, days: number) {
    const expires = new Date(Date.now() + days * 86400000).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

export default function TutorialModal({ titleKey, steps, cookieKey, ctaKey, globalOpenKey }: TutorialModalProps) {
    const [visible, setVisible] = useState(false);
    const { t } = useTranslation();

    // Auto-show on first visit
    useEffect(() => {
        if (!getCookie(cookieKey)) {
            const timer = setTimeout(() => setVisible(true), 400);
            return () => clearTimeout(timer);
        }
    }, [cookieKey]);

    // Register global open function for sidebar
    const openManually = useCallback(() => setVisible(true), []);

    useEffect(() => {
        (window as unknown as Record<string, unknown>)[globalOpenKey] = openManually;
        return () => { delete (window as unknown as Record<string, unknown>)[globalOpenKey]; };
    }, [openManually, globalOpenKey]);

    const handleClose = () => {
        setCookie(cookieKey, '1', 365);
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div className="inpaint-tutorial-overlay" onClick={handleClose}>
            <div className="inpaint-tutorial-card" onClick={(e) => e.stopPropagation()}>
                <button className="inpaint-tutorial-close" onClick={handleClose} aria-label="Close">
                    &times;
                </button>

                <h2 className="inpaint-tutorial-title">
                    {t(titleKey)}
                </h2>

                <div className="inpaint-tutorial-steps">
                    {steps.map((step, i) => (
                        <React.Fragment key={i}>
                            {i > 0 && <span className="inpaint-tutorial-arrow">→</span>}
                            <div className="inpaint-tutorial-step">
                                <span className="inpaint-tutorial-num">{i + 1}</span>
                                <span className="inpaint-tutorial-icon">{step.icon}</span>
                                <h3>{t(step.titleKey)}</h3>
                                <p>{t(step.descKey)}</p>
                            </div>
                        </React.Fragment>
                    ))}
                </div>

                <button className="inpaint-tutorial-cta" onClick={handleClose}>
                    {t(ctaKey)} →
                </button>
            </div>
        </div>
    );
}
