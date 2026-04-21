'use client';

import React, { useState, useEffect } from 'react';
import type { Companion } from '@/lib/companions';
import { saveUserCompanion, buildUserCompanionSystemPrompt } from '@/lib/userCompanions';
import { useTranslation } from '@/lib/useTranslation';

interface CreateCompanionModalProps {
  imageUrl: string;
  onClose: () => void;
  onCreated: (companionId: string) => void;
}

export default function CreateCompanionModal({ imageUrl, onClose, onCreated }: CreateCompanionModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [personality, setPersonality] = useState<Companion['personality']>('playful');

  const PERSONALITIES = [
    { value: 'playful' as const, icon: '😊', label: t('companions.createPlayful') },
    { value: 'shy' as const, icon: '🌸', label: t('companions.createShy') },
    { value: 'dominant' as const, icon: '👑', label: t('companions.createBold') },
    { value: 'caring' as const, icon: '💖', label: t('companions.createCaring') },
    { value: 'mysterious' as const, icon: '🌙', label: t('companions.createMysterious') },
  ];

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleCreate = () => {
    if (!name.trim()) return;

    const companion: Companion = {
      id: `user-${Date.now()}`,
      name: name.trim(),
      age: 20,
      personality,
      tagline: 'Your personal AI companion',
      description: `${name.trim()} was created just for you.`,
      avatarUrl: imageUrl,
      galleryUrls: [imageUrl],
      systemPrompt: buildUserCompanionSystemPrompt(name.trim(), personality),
      tags: ['Custom'],
      isPremium: false,
      isNew: true,
      liveActions: [],
      isUserCreated: true,
    };

    saveUserCompanion(companion);
    onCreated(companion.id);
  };

  return (
    <div className="create-companion-modal-overlay" onClick={onClose}>
      <div className="create-companion-modal" onClick={(e) => e.stopPropagation()}>
        <h2>{t('companions.createTitle')}</h2>

        <img
          src={imageUrl}
          alt="Preview"
          className="create-companion-preview"
        />

        <div>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
            {t('companions.createNameLabel')}
          </label>
          <input
            className="create-companion-input"
            placeholder={t('companions.createNamePlaceholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            maxLength={30}
          />
        </div>

        <div>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
            {t('companions.createPersonalityLabel')}
          </label>
          <div className="personality-grid">
            {PERSONALITIES.map((p) => (
              <button
                key={p.value}
                className={`personality-btn ${personality === p.value ? 'selected' : ''}`}
                onClick={() => setPersonality(p.value)}
                type="button"
              >
                {p.icon} {p.label}
              </button>
            ))}
          </div>
        </div>

        <button
          className="start-chatting-btn"
          onClick={handleCreate}
          disabled={!name.trim()}
        >
          {t('companions.createStartChat')}
        </button>

        <button
          style={{
            background: 'none', border: 'none', color: 'var(--text-secondary)',
            cursor: 'pointer', fontSize: '0.88rem', padding: '8px', textAlign: 'center', width: '100%',
          }}
          onClick={onClose}
        >
          {t('companions.createCancel')}
        </button>
      </div>
    </div>
  );
}
