'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/useTranslation';
import QAWizard from './QAWizard';
import type { QAData } from './QAWizard';

const COOKIE_KEY = 'visited_at';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const ALWAYS_SHOW = process.env.NEXT_PUBLIC_QA_MODAL_ALWAYS_SHOW === 'true';

function getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, days: number) {
    const expires = new Date(Date.now() + days * 86400000).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

type Trigger = 'auto_first' | 'auto_returning' | 'manual' | 'url_param' | 'env_force';

interface QAModalProps {
    onSubmit: (e?: React.FormEvent, skipGuard?: boolean) => void;
    setInputText: (v: string) => void;
    setTagsExpanded: (v: boolean) => void;
    setSettingsExpanded: (v: boolean) => void;
    onQAComplete?: (data: QAData) => void;
}

export default function QAModal({
    onSubmit, setInputText, setTagsExpanded, setSettingsExpanded, onQAComplete,
}: QAModalProps) {
    const { t } = useTranslation();
    const { settings } = useAppStore();
    const searchParams = useSearchParams();
    const contentLevel = (settings.nudeMode ?? true) ? 'nsfw' : 'sfw';

    const [visible, setVisible] = useState(false);
    const [trigger, setTrigger] = useState<Trigger | null>(null);
    const [isReturning, setIsReturning] = useState(false);
    const [wizardKey, setWizardKey] = useState(0);

    // Modal shows only: first visit, returning after 7+ days, URL param, env override
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchParams.get('qa_modal') === '1') {
                setTrigger('url_param');
                setVisible(true);
                return;
            }

            if (ALWAYS_SHOW) {
                setTrigger('env_force');
                setVisible(true);
                return;
            }

            const visitedAt = getCookie(COOKIE_KEY);

            if (!visitedAt) {
                setTrigger('auto_first');
                setVisible(true);
                setCookie(COOKIE_KEY, new Date().toISOString(), 365);
                return;
            }

            const lastVisit = new Date(visitedAt).getTime();
            if (Date.now() - lastVisit > SEVEN_DAYS_MS) {
                setTrigger('auto_returning');
                setIsReturning(true);
                setVisible(true);
                setCookie(COOKIE_KEY, new Date().toISOString(), 365);
                return;
            }

            setCookie(COOKIE_KEY, new Date().toISOString(), 365);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchParams]);

    // Manual open (sidebar "使い方を見る" button)
    const openManually = useCallback(() => {
        setTrigger('manual');
        setWizardKey((k) => k + 1);
        setIsReturning(false);
        setVisible(true);
    }, []);

    useEffect(() => {
        (window as unknown as Record<string, unknown>).__openQAModal = openManually;
        return () => { delete (window as unknown as Record<string, unknown>).__openQAModal; };
    }, [openManually]);

    const handleClose = useCallback(() => setVisible(false), []);

    const handleComplete = useCallback((answers: Record<string, string | null>, promptText: string) => {
        if (promptText) setInputText(promptText);
        onQAComplete?.({
            answers,
            questions: Object.keys(answers),
            completed: true,
            skippedCount: Object.values(answers).filter((v) => v === null).length,
        });
    }, [setInputText, onQAComplete]);

    const handleGenerate = useCallback(() => {
        handleClose();
        setTimeout(() => onSubmit(undefined, true), 100);
    }, [handleClose, onSubmit]);

    const handleOpenTags = useCallback(() => {
        handleClose();
        setTagsExpanded(true);
        setTimeout(() => document.querySelector('.editor-collapsible-section:first-of-type')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
    }, [handleClose, setTagsExpanded]);

    const handleOpenSettings = useCallback(() => {
        handleClose();
        setSettingsExpanded(true);
        setTimeout(() => document.querySelector('.editor-collapsible-section:last-of-type')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
    }, [handleClose, setSettingsExpanded]);

    const handleDismissToPrompt = useCallback(() => {
        handleClose();
    }, [handleClose]);

    if (!visible) return null;

    return (
        <div className="qa-modal-overlay" onClick={handleClose}>
            <div className="qa-modal-container" onClick={(e) => e.stopPropagation()}>
                <button className="qa-modal-close" onClick={handleClose}>✕</button>

                <div className="qa-modal-header">
                    {isReturning && (
                        <div className="qa-modal-returning">👋 {t('qa.returningMessage')}</div>
                    )}
                    <h2 className="qa-modal-title">✦ {t('qa.modalTitle')}</h2>
                    <p className="qa-modal-subtitle">{t('qa.modalSubtitle')}</p>
                </div>

                <QAWizard
                    key={wizardKey}
                    mode="modal"
                    isNsfw={contentLevel === 'nsfw'}
                    onComplete={handleComplete}
                    onGenerate={handleGenerate}
                    onOpenTags={handleOpenTags}
                    onOpenSettings={handleOpenSettings}
                    onDismissToPrompt={handleDismissToPrompt}
                />
            </div>
        </div>
    );
}
