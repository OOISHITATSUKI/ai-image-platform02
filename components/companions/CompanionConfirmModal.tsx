'use client';

import React, { useState } from 'react';
import type { Companion } from '@/lib/companions';

interface Props {
  companion: Companion;
  onConfirm: () => void;
  onClose: () => void;
}

export default function CompanionConfirmModal({ companion, onConfirm, onClose }: Props) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = () => {
    setLoading(true);
    onConfirm();
  };

  return (
    <div className="comp-confirm-overlay" onClick={onClose}>
      <div className="comp-confirm-modal comp-confirm-light" onClick={(e) => e.stopPropagation()}>
        <div className="comp-confirm-card">
          <img src={companion.avatarUrl} alt={companion.name} className="comp-confirm-avatar" width={144} height={192} loading="eager" />
          <div className="comp-confirm-card-info">
            <span className="comp-confirm-card-name">{companion.name}, {companion.age}</span>
            <span className="comp-confirm-card-personality">{companion.personality}</span>
          </div>
        </div>
        <button className="comp-confirm-start" onClick={handleConfirm} disabled={loading}>
          {loading ? '読み込み中...' : '💬 会話を始める'}
        </button>
        <button className="comp-confirm-cancel" onClick={onClose} disabled={loading}>
          戻る
        </button>
      </div>
    </div>
  );
}
