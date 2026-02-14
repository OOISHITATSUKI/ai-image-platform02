'use client';

import React from 'react';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/useTranslation';

export default function HomePage() {
  const { createChat, setGenerationType, chats } = useAppStore();
  const { t } = useTranslation();

  const toolCards = [
    { icon: '✏️', titleKey: 'create.txt2img', desc: 'Generate images from text descriptions', type: 'txt2img' as const },
    { icon: '🖼️', titleKey: 'create.img2img', desc: 'Transform existing images with AI', type: 'img2img' as const },
    { icon: '🎨', titleKey: 'create.imgEdit', desc: 'Edit images with face swap & inpaint', type: 'img_edit' as const },
    { icon: '📝', titleKey: 'create.txt2vid', desc: 'Create videos from text prompts', type: 'txt2vid' as const },
    { icon: '🎬', titleKey: 'create.img2vid', desc: 'Animate your static images', type: 'img2vid' as const },
    { icon: '👤', titleKey: 'create.ref2vid', desc: 'Generate videos from reference images', type: 'ref2vid' as const },
    { icon: '📹', titleKey: 'create.vid2vid', desc: 'Style transfer and video editing', type: 'vid2vid' as const },
  ];

  const handleToolClick = (type: typeof toolCards[0]['type']) => {
    setGenerationType(type);
    if (chats.length === 0) {
      createChat();
    }
  };

  return (
    <div className="home-view">
      <header className="home-header">
        <h1 className="home-title">{t('home.title')}</h1>
        <p className="home-subtitle">{t('home.subtitle')}</p>
      </header>

      <div className="tool-cards-grid">
        {toolCards.map((card) => (
          <Link
            key={card.type}
            href="/editor"
            className="tool-card"
            onClick={() => handleToolClick(card.type)}
          >
            <div className="tool-card-icon">{card.icon}</div>
            <div className="tool-card-title">{t(card.titleKey)}</div>
            <div className="tool-card-desc">{card.desc}</div>
          </Link>
        ))}
      </div>

      <div className="section-header">
        <h3>{t('home.recentCreations')}</h3>
        <Link href="/library" className="view-all-link">{t('home.viewAll')}</Link>
      </div>
      <div className="gallery-grid">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="gallery-item">
            <div className="gallery-placeholder">
              {i <= 3 ? '🖼️' : '🎬'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
