'use client';

import React, { useState } from 'react';
import { PLAY_STYLES, type PlayStyle } from '@/lib/companions';
import { useTranslation } from '@/lib/useTranslation';

interface PlayStyleModalProps {
  companionName: string;
  currentNickname?: string | null;
  currentMessageStyle?: 'cinematic' | 'chat';
  onSelect: (style: PlayStyle) => void;
  onSkip: () => void;
  onNicknameChange?: (nickname: string) => void;
  onMessageStyleChange?: (style: 'cinematic' | 'chat') => void;
  onReset?: () => void;
}

export default function PlayStyleModal({ companionName, currentNickname, currentMessageStyle, onSelect, onSkip, onNicknameChange, onMessageStyleChange, onReset }: PlayStyleModalProps) {
  const [selected, setSelected] = useState<PlayStyle | null>(null);
  const [nickname, setNickname] = useState(currentNickname ?? '');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const { t } = useTranslation();

  return (
    <div className="playstyle-overlay" onClick={onSkip}>
      <div className="playstyle-modal" onClick={(e) => e.stopPropagation()}>
        <h2>{t('companions.playStyleTitle')}</h2>
        <p>{t('companions.playStyleDesc').replace('{name}', companionName)}</p>

        {/* Nickname input */}
        {onNicknameChange && (
          <div className="playstyle-nickname">
            <label className="playstyle-nickname-label">
              {(t('companions.nicknameLabel') || `${companionName}からの呼び名`).replace('{name}', companionName)}
            </label>
            <div className="playstyle-nickname-row">
              <input
                className="playstyle-nickname-input"
                placeholder={t('companions.nicknamePlaceholder') || 'ニックネームを入力...'}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={20}
              />
              <button
                className="playstyle-nickname-save"
                onClick={() => {
                  onNicknameChange(nickname.trim());
                }}
                disabled={nickname.trim() === (currentNickname ?? '')}
              >
                {t('companions.nicknameSave') || '保存'}
              </button>
            </div>
          </div>
        )}

        {/* Message style toggle */}
        {onMessageStyleChange && (
          <div className="playstyle-msgstyle">
            <label className="playstyle-nickname-label">
              {t('companions.messageStyleLabel') || 'メッセージスタイル'}
            </label>
            <div className="playstyle-msgstyle-row">
              <button
                className={`playstyle-msgstyle-btn ${currentMessageStyle === 'cinematic' ? 'active' : ''}`}
                onClick={() => onMessageStyleChange('cinematic')}
              >
                <span className="playstyle-msgstyle-emoji">🎬</span>
                <span className="playstyle-msgstyle-label">{t('companions.styleCinematic') || 'シネマティック'}</span>
                <span className="playstyle-msgstyle-desc">{t('companions.styleCinematicDesc') || '情景描写付き'}</span>
              </button>
              <button
                className={`playstyle-msgstyle-btn ${currentMessageStyle === 'chat' ? 'active' : ''}`}
                onClick={() => onMessageStyleChange('chat')}
              >
                <span className="playstyle-msgstyle-emoji">💬</span>
                <span className="playstyle-msgstyle-label">{t('companions.styleChat') || 'チャット'}</span>
                <span className="playstyle-msgstyle-desc">{t('companions.styleChatDesc') || 'LINE風で読みやすい'}</span>
              </button>
            </div>
          </div>
        )}

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

        {/* Reset relationship */}
        {onReset && (
          <div className="playstyle-reset-area">
            {!showResetConfirm ? (
              <button className="playstyle-reset-btn" onClick={() => setShowResetConfirm(true)}>
                💔 {t('companions.resetRelation') || '関係をリセットする'}
              </button>
            ) : (
              <div className="playstyle-reset-confirm">
                <p className="playstyle-reset-warn">
                  {(t('companions.resetConfirm') || '本当に{name}と一度、破局しますか？').replace('{name}', companionName)}
                </p>
                <p className="playstyle-reset-note">
                  {t('companions.resetNote') || '⚠ チャット履歴・関係ポイント・ニックネームが全て削除されます。この操作は取り消せません。'}
                </p>
                <div className="playstyle-reset-actions">
                  <button className="playstyle-reset-yes" onClick={onReset}>
                    💔 {t('companions.resetYes') || 'リセットする'}
                  </button>
                  <button className="playstyle-reset-no" onClick={() => setShowResetConfirm(false)}>
                    {t('companions.resetNo') || 'やめる'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
