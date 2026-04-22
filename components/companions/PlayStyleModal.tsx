'use client';

import React, { useState } from 'react';
import { PLAY_STYLES, type PlayStyle } from '@/lib/companions';
import { useTranslation } from '@/lib/useTranslation';

interface PlayStyleModalProps {
  companionName: string;
  onSelect: (style: PlayStyle) => void;
  onSkip: () => void;
}

export default function PlayStyleModal({ companionName, onSelect, onSkip }: PlayStyleModalProps) {
  const [selected, setSelected] = useState<PlayStyle | null>(null);
  const { t } = useTranslation();

  return (
    <div className="playstyle-overlay" onClick={onSkip}>
      <div className="playstyle-modal" onClick={(e) => e.stopPropagation()}>
        <h2>{t('companions.playStyleTitle')}</h2>
        <p>{t('companions.playStyleDesc').replace('{name}', companionName)}</p>

        <div className="playstyle-grid">
          {PLAY_STYLES.map((s) => (
            <button
              key={s.id}
              className={`playstyle-btn ${selected === s.id ? 'selected' : ''}`}
              onClick={() => setSelected(s.id)}
            >
              <span className="playstyle-btn-emoji">{s.emoji}</span>
              <span className="playstyle-btn-label">{t(`companions.ps_${s.id}`)}</span>
              <span className="playstyle-btn-desc">{t(`companions.ps_${s.id}_desc`)}</span>
            </button>
          ))}
        </div>

        <button
          className="playstyle-confirm-btn"
          disabled={!selected}
          onClick={() => selected && onSelect(selected)}
          style={{ opacity: selected ? 1 : 0.5 }}
        >
          {t('companions.playStyleConfirm')}
        </button>
        <button className="playstyle-skip" onClick={onSkip}>
          {t('companions.playStyleSkip')}
        </button>
      </div>
    </div>
  );
}
