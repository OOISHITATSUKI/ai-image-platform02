'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

interface HowToUseModalProps {
  onClose: () => void;
}

const STEPS = [
  {
    icon: '🗨️',
    title: 'Step 1 — Choose Your Companion',
    description:
      'Browse the companion list and find someone who matches your vibe. Each girl has her own personality, backstory, and style.',
  },
  {
    icon: '💬',
    title: 'Step 2 — Start Chatting',
    description:
      'Talk to her like you would a real girlfriend. She remembers the conversation and responds personally. The more you chat, the closer you get.',
  },
  {
    icon: '🔴',
    title: 'Step 3 — Unlock Live Action',
    description:
      'As your bond grows, unlock Live Action mode. Watch her come to life with real video responses — just for you. Level up by chatting or upgrading.',
  },
  {
    icon: '⭐',
    title: 'Step 4 — Level Up',
    description:
      "Each conversation earns XP. Higher levels unlock more intimate actions. Skip levels instantly with coins if you can't wait 😏",
  },
];

export default function HowToUseModal({ onClose }: HowToUseModalProps) {
  const router = useRouter();

  const handleStart = () => {
    onClose();
    router.push('/companions');
  };

  return (
    <div className="how-to-use-overlay" onClick={onClose}>
      <div className="how-to-use-modal" onClick={(e) => e.stopPropagation()}>
        <div className="how-to-use-header">
          <h2>✨ Meet Your AI Companion</h2>
          <button className="how-to-use-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="how-to-use-steps">
          {STEPS.map((s) => (
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
          ✨ Start Chatting Now
        </button>
      </div>
    </div>
  );
}
