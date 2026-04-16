'use client';

import React, { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { COMPANIONS, getActionVideoUrl, isLiveActionAvailable, type Companion } from '@/lib/companions';
import { getUserCompanions } from '@/lib/userCompanions';

/** Shows the companion's avatar; falls back to an initial tile on error. */
function CompanionAvatar({
  src,
  name,
  variant = 'card',
}: {
  src?: string;
  name: string;
  variant?: 'card' | 'icon';
}) {
  const [errored, setErrored] = useState(false);
  const className = variant === 'icon' ? 'comp-icon-img' : 'comp-card-image';

  if (!src || errored) {
    return variant === 'icon' ? (
      <span className="comp-icon-initial">{name[0]}</span>
    ) : (
      <div className="comp-card-placeholder">
        <span>{name[0]}</span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={name}
      className={className}
      onError={() => setErrored(true)}
    />
  );
}

export default function CompanionsPage() {
  const [userCompanions, setUserCompanions] = useState<Companion[]>([]);
  const [companions, setCompanions] = useState<Companion[]>(COMPANIONS);

  useEffect(() => {
    setUserCompanions(getUserCompanions());

    // Fetch published companions from DB — fall back to defaults if empty / error
    fetch('/api/companions')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.companions) && data.companions.length > 0) {
          setCompanions(data.companions as Companion[]);
        }
      })
      .catch(() => { /* keep defaults */ });
  }, []);

  return (
    <div className="comp-home">
      {/* Hero Banner */}
      <section className="comp-hero">
        <h1 className="comp-hero-title">Meet Your AI Companion</h1>
        <p className="comp-hero-sub">Chat, flirt, and explore — your perfect AI partner awaits</p>
        <Link href="/editor" className="comp-hero-cta">
          ✨ Create Now
        </Link>
      </section>

      {/* Nude Assistant promo — open to everyone, with soft upsell inside */}
      <section className="comp-section assistant-home-section">
        <Link href="/companions/assistant" className="assistant-home-promo">
          <div className="assistant-home-promo-icon">✨</div>
          <div className="assistant-home-promo-text">
            <span className="assistant-home-promo-badge">YOUR AI GUIDE</span>
            <h3>Meet Your Nude Assistant</h3>
            <p>Free to start. Ask about prompts, features, Live Action strategies — she&apos;ll walk you through everything.</p>
          </div>
          <span className="assistant-home-promo-cta">Chat Now →</span>
        </Link>
      </section>

      {/* Icon Row — horizontal scroll */}
      <section className="comp-icon-row">
        {companions.map((c) => (
          <Link key={c.id} href={`/companions/${c.id}`} className="comp-icon-item">
            <div className="comp-icon-ring">
              <CompanionAvatar src={c.avatarUrl} name={c.name} variant="icon" />
            </div>
            <span className="comp-icon-name">{c.name}</span>
          </Link>
        ))}
      </section>

      {/* My Characters */}
      {userCompanions.length > 0 && (
        <section className="comp-section">
          <h2 className="comp-section-title">My Characters</h2>
          <div className="comp-grid">
            {userCompanions.map((c) => (
              <Link key={c.id} href={`/companions/${c.id}`} className="comp-card">
                <div className="comp-card-img">
                  <CompanionAvatar src={c.avatarUrl} name={c.name} />
                  <div className="comp-card-overlay" />
                </div>
                <div className="comp-card-bottom">
                  <div className="comp-card-meta">
                    <span className="comp-card-name">{c.name}</span>
                    <span className="comp-card-personality">{c.personality}</span>
                  </div>
                  <button className="comp-card-play">▶ Chat</button>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured Companions */}
      <section className="comp-section">
        <h2 className="comp-section-title">Featured Companions</h2>
        <div className="comp-grid">
          {companions.map((c, idx) => (
            <React.Fragment key={c.id}>
              {/* Insert promo banner after 2nd card */}
              {idx === 2 && (
                <Link href="/pricing" className="comp-promo-card">
                  <div className="comp-promo-inner">
                    <span className="comp-promo-badge">70% OFF</span>
                    <p>Unlock all companions & features</p>
                    <span className="comp-promo-cta">Upgrade Now →</span>
                  </div>
                </Link>
              )}
              <Link href={`/companions/${c.id}`} className="comp-card">
                <div className="comp-card-img">
                  <CompanionAvatar src={c.avatarUrl} name={c.name} />
                  <div className="comp-card-overlay" />
                  {c.isNew && <span className="comp-badge-new">New</span>}
                  {isLiveActionAvailable(c) && (
                    <span className="comp-badge-live-available" title="Live Action available">● LIVE</span>
                  )}
                </div>
                <div className="comp-card-bottom">
                  <div className="comp-card-meta">
                    <span className="comp-card-name">{c.name}, {c.age}</span>
                    <span className="comp-card-personality">{c.personality}</span>
                  </div>
                  <p className="comp-card-tagline">{c.tagline}</p>
                  <button className="comp-card-play">▶ Chat</button>
                </div>
              </Link>
            </React.Fragment>
          ))}
        </div>
      </section>

      {/* Live Action Section */}
      <section className="comp-section" id="live-action">
        <h2 className="comp-section-title">
          🔴 Live Action <span className="comp-beta-badge">Beta</span>
        </h2>
        <div className="comp-live-grid">
          {companions.filter(isLiveActionAvailable).map((c) => (
            <LiveCard key={c.id} companion={c} />
          ))}
        </div>
      </section>
    </div>
  );
}

function LiveCard({ companion }: { companion: Companion }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hovering, setHovering] = useState(false);
  const greetingVideo = getActionVideoUrl(companion.id, 'greeting', 'dressed', 1);

  return (
    <Link
      href={`/companions/${companion.id}/live`}
      className="comp-live-card"
      onMouseEnter={() => { setHovering(true); videoRef.current?.play().catch(() => {}); }}
      onMouseLeave={() => { setHovering(false); videoRef.current?.pause(); }}
    >
      <div className="comp-live-card-media">
        {/* Avatar as static background */}
        <CompanionAvatar src={companion.avatarUrl} name={companion.name} />
        {/* Video preview on hover */}
        {greetingVideo && (
          <video
            ref={videoRef}
            src={greetingVideo}
            className={`comp-live-video ${hovering ? 'visible' : ''}`}
            loop
            muted
            playsInline
            preload="none"
          />
        )}
        <span className="comp-badge-live">● LIVE</span>
      </div>
      <div className="comp-live-card-info">
        <span className="comp-card-name">{companion.name}</span>
      </div>
    </Link>
  );
}
