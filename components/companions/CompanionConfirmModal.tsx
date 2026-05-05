'use client';

import React from 'react';
import type { Companion } from '@/lib/companions';

interface Props {
  companion: Companion;
  onConfirm: () => void;
  onClose: () => void;
}

export default function CompanionConfirmModal({ companion, onConfirm, onClose }: Props) {
  return (
    <div className="comp-confirm-overlay" onClick={onClose}>
      <div className="comp-confirm-modal" onClick={(e) => e.stopPropagation()}>
        {/* Image preview (video removed for performance) */}
        <div className="comp-confirm-media">
          <img
            src={companion.avatarUrl}
            alt={companion.name}
            className="comp-confirm-img"
          />
          <div className="comp-confirm-media-gradient" />
        </div>

        {/* Info */}
        <div className="comp-confirm-info">
          <h2 className="comp-confirm-name">{companion.name}, {companion.age}</h2>
          <span className="comp-confirm-personality">{companion.personality}</span>
          <p className="comp-confirm-tagline">{companion.tagline}</p>
        </div>

        {/* Question */}
        <p className="comp-confirm-question">
          この<strong>{companion.name}</strong>と会話を始めますか？
        </p>

        {/* Buttons */}
        <button className="comp-confirm-start" onClick={onConfirm}>
          💬 会話を始める
        </button>
        <button className="comp-confirm-cancel" onClick={onClose}>
          戻る
        </button>
      </div>
    </div>
  );
}
