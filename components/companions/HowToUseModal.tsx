'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/useTranslation';

interface HowToUseModalProps {
  onClose: () => void;
}

const STEP_ICONS = ['🗨️', '💬', '🔴', '⭐'];

export default function HowToUseModal({ onClose }: HowToUseModalProps) {
  const router = useRouter();
  const { t } = useTranslation();

  const steps = [
    { icon: STEP_ICONS[0], title: t('companions.howToStep1Title'), description: t('companions.howToStep1Desc') },
    { icon: STEP_ICONS[1], title: t('companions.howToStep2Title'), description: t('companions.howToStep2Desc') },
    { icon: STEP_ICONS[2], title: t('companions.howToStep3Title'), description: t('companions.howToStep3Desc') },
    { icon: STEP_ICONS[3], title: t('companions.howToStep4Title'), description: t('companions.howToStep4Desc') },
  ];

  const handleStart = () => {
    onClose();
    router.push('/companions');
  };

  return (
    <div className="how-to-use-overlay" onClick={onClose}>
      <div className="how-to-use-modal" onClick={(e) => e.stopPropagation()}>
        <div className="how-to-use-header">
          <h2>{t('companions.howToTitle')}</h2>
          <button className="how-to-use-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="how-to-use-steps">
          {steps.map((s) => (
            <div key={s.title} className="how-to-use-step">
              <span className="how-to-use-icon">{s.icon}</span>
              <div>
                <div className="how-to-use-title">{s.title}</div>
                <div className="how-to-use-desc">{s.description}</div>
              </div>
            </div>
          ))}
        </div>

        <button className="how-to-use-cta" onClick={handleStart}>
          {t('companions.howToCta')}
        </button>
      </div>
    </div>
  );
}
