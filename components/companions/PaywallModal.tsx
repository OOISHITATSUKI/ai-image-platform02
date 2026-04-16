'use client';

import React from 'react';
import Link from 'next/link';

interface PaywallModalProps {
  type: 'chat_limit' | 'photo' | 'call' | 'live_action' | 'nude_assistant';
  companionName: string;
  requiredLevel?: number;
  onClose: () => void;
}

const COPY: Record<PaywallModalProps['type'], { icon: string; title: string; desc: (name: string, level?: number) => string }> = {
  chat_limit: {
    icon: '💬',
    title: 'Unlock Unlimited Chat',
    desc: (name) => `You've reached the free message limit with ${name}. Upgrade to keep the conversation going!`,
  },
  photo: {
    icon: '📸',
    title: 'Unlock Photo Mode',
    desc: (name) => `Upgrade to receive photos from ${name}.`,
  },
  call: {
    icon: '📞',
    title: 'Unlock Voice Calls',
    desc: (name) => `Upgrade to call ${name} and hear her voice.`,
  },
  live_action: {
    icon: '🔥',
    title: 'Unlock More Actions',
    desc: (_name, level) => `Upgrade to access Level ${level} actions and beyond.`,
  },
  nude_assistant: {
    icon: '✨',
    title: 'Unlock Nude Assistant',
    desc: () =>
      "Your personal AI guide — prompt tips, Live Action skip strategies, companion recommendations, and 24/7 help. Included with Basic & Unlimited.",
  },
};

export default function PaywallModal({ type, companionName, requiredLevel, onClose }: PaywallModalProps) {
  const { icon, title, desc } = COPY[type];

  return (
    <div className="paywall-overlay" onClick={onClose}>
      <div className="paywall-modal" onClick={(e) => e.stopPropagation()}>
        <button className="paywall-close" onClick={onClose}>×</button>
        <div className="paywall-icon">{icon}</div>
        <h3>{title}</h3>
        <p>{desc(companionName, requiredLevel)}</p>
        <Link href="/pricing" className="paywall-btn-primary">
          Upgrade Now
        </Link>
        <button className="paywall-btn-secondary" onClick={onClose}>
          Maybe Later
        </button>
      </div>
    </div>
  );
}
