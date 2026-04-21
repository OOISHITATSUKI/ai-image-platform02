'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/useTranslation';

interface PaywallModalProps {
  type: 'chat_limit' | 'photo' | 'call' | 'live_action' | 'nude_assistant';
  companionName: string;
  requiredLevel?: number;
  onClose: () => void;
}

const ICON_MAP: Record<PaywallModalProps['type'], string> = {
  chat_limit: '💬',
  photo: '📸',
  call: '📞',
  live_action: '🔥',
  nude_assistant: '✨',
};

const TITLE_KEYS: Record<PaywallModalProps['type'], string> = {
  chat_limit: 'companions.paywallChatTitle',
  photo: 'companions.paywallPhotoTitle',
  call: 'companions.paywallCallTitle',
  live_action: 'companions.paywallLiveTitle',
  nude_assistant: 'companions.paywallAssistantTitle',
};

const DESC_KEYS: Record<PaywallModalProps['type'], string> = {
  chat_limit: 'companions.paywallChatDesc',
  photo: 'companions.paywallPhotoDesc',
  call: 'companions.paywallCallDesc',
  live_action: 'companions.paywallLiveDesc',
  nude_assistant: 'companions.paywallAssistantDesc',
};

export default function PaywallModal({ type, companionName, requiredLevel, onClose }: PaywallModalProps) {
  const { t } = useTranslation();
  const icon = ICON_MAP[type];
  const title = t(TITLE_KEYS[type]);
  const desc = t(DESC_KEYS[type])
    .replace('{name}', companionName)
    .replace('{level}', String(requiredLevel ?? ''));

  return (
    <div className="paywall-overlay" onClick={onClose}>
      <div className="paywall-modal" onClick={(e) => e.stopPropagation()}>
        <button className="paywall-close" onClick={onClose}>×</button>
        <div className="paywall-icon">{icon}</div>
        <h3>{title}</h3>
        <p>{desc}</p>
        <Link href="/pricing" className="paywall-btn-primary">
          {t('companions.paywallUpgrade')}
        </Link>
        <button className="paywall-btn-secondary" onClick={onClose}>
          {t('companions.paywallLater')}
        </button>
      </div>
    </div>
  );
}
