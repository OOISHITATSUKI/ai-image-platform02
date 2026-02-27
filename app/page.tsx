'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/useTranslation';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';

const showcaseImages = [
  { src: '/showcase/showcase-1.png', alt: 'AI Nude Generation Sample 1' },
  { src: '/showcase/showcase-2.png', alt: 'AI Nude Generation Sample 2' },
  { src: '/showcase/showcase-3.png', alt: 'AI Nude Generation Sample 3' },
  { src: '/showcase/showcase-4.png', alt: 'AI Nude Generation Sample 4' },
  { src: '/showcase/showcase-5.png', alt: 'AI Nude Generation Sample 5' },
];

export default function HomePage() {
  const { createChat, setGenerationType, chats } = useAppStore();
  const { t } = useTranslation();

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [Autoplay({ delay: 3500, stopOnInteraction: false })]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi, setSelectedIndex]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
  }, [emblaApi, setScrollSnaps, onSelect]);

  const scrollTo = useCallback((index: number) => emblaApi && emblaApi.scrollTo(index), [emblaApi]);

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
      <section className="hero-outer">
        <div className="hero-content">
          <h1 className="hero-headline">{t('home.headline')}</h1>
          <p className="hero-subheadline">{t('home.subheadline')}</p>
        </div>

        {/* ── Image Slider ── */}
        <div className="embla" ref={emblaRef}>
          <div className="embla__container">
            {showcaseImages.map((img, index) => (
              <div className="embla__slide" key={index}>
                <div className="showcase-image-wrapper">
                  {/* Using standard img for now to ensure visibility without public assets yet, 
                      transitioning to Next/Image when assets are verified */}
                  <img src={img.src} alt={img.alt} loading={index < 2 ? 'eager' : 'lazy'} />
                </div>
              </div>
            ))}
          </div>

          <div className="embla-dots">
            {scrollSnaps.map((_, index) => (
              <button
                key={index}
                className={`embla-dot ${index === selectedIndex ? 'embla-dot--selected' : ''}`}
                onClick={() => scrollTo(index)}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>

        <div className="hero-cta-group">
          <Link href="/editor" className="hero-cta-button" onClick={() => handleToolClick('txt2img')}>
            {t('home.ctaButton')}
          </Link>
          <span className="hero-cta-sub">{t('home.ctaSub')}</span>
        </div>
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
