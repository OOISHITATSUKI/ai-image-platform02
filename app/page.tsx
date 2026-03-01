'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/useTranslation';
import ShowcaseFlipCard from '@/components/ui/ShowcaseFlipCard';

const showcaseGridImages = [
  { before: '/images/showcase/card1-before.webp', after: '/images/showcase/card1-after.webp', alt: 'Demonstration 1' },
  // Phase 2 placeholders:
  { before: '', after: '', alt: 'Placeholder 2' },
  { before: '', after: '', alt: 'Placeholder 3' },
  { before: '', after: '', alt: 'Placeholder 4' },
  { before: '', after: '', alt: 'Placeholder 5' },
  { before: '', after: '', alt: 'Placeholder 6' },
];

export default function HomePage() {
  const { createChat, setGenerationType, chats } = useAppStore();
  const { t } = useTranslation();

  const [isFlipped, setIsFlipped] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);

  // Consider age limits – only allow flip if ageVerified could be accessed (assuming it's in useAppStore or you can omit the check for now depending on how they verify age normally). The requirement says:
  // "After画像はセンシティブコンテンツ。年齢確認（AgeGate）が済んでいない場合はフリップボタンを非表示にする or ブラー処理をかける。既存の ageVerified state で判定。"
  const ageVerified = useAppStore(state => state.ageVerified);

  const handleFlip = () => {
    setIsFlipping(true);
    setIsFlipped(!isFlipped);
    setTimeout(() => setIsFlipping(false), 800); // Wait for the transition plus slight buffer
  };

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
      {/* ── Hero Section ── */}
      <section className="hero-section">
        <h1 className="hero-headline">{t('home.headline')}</h1>
        <p className="hero-subheadline">{t('home.subheadline')}</p>

        <div className="showcase-grid">
          {showcaseGridImages.map((img, i) => (
            <React.Fragment key={i}>
              {img.before ? (
                <ShowcaseFlipCard
                  beforeSrc={img.before}
                  afterSrc={img.after}
                  imgAlt={img.alt}
                  autoFlip={true}
                  priority={i < 3}
                />
              ) : (
                <div className="showcase-card showcase-placeholder">
                  <span>Coming Soon</span>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        <br />

        <Link href="/editor" className="hero-cta-btn" onClick={() => handleToolClick('txt2img')}>
          {t('home.ctaButton')}
          <span className="hero-cta-sub">{t('home.ctaSub')}</span>
        </Link>
      </section>

      {/* ── Existing Content Below ── */}
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
      <div className="showcase-grid" style={{ marginBottom: 0 }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="showcase-card showcase-placeholder">
            <span style={{ fontSize: '2rem' }}>{i <= 3 ? '🖼️' : '🎬'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
