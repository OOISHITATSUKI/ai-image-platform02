'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { COMPANIONS, getActionVideoUrl, isLiveActionAvailable, type Companion } from '@/lib/companions';
import { getUserCompanions } from '@/lib/userCompanions';
import { useTranslation } from '@/lib/useTranslation';
import { useAppStore } from '@/lib/store';
import StoryAvatarRing from '@/components/companions/StoryAvatarRing';
import StoriesModal, { type CompanionStories, type StoryItem } from '@/components/companions/StoriesModal';

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
  const { t } = useTranslation();
  const { user } = useAppStore();
  const isPaid = !!user && user.plan !== 'free';
  const [userCompanions, setUserCompanions] = useState<Companion[]>([]);
  const [companions, setCompanions] = useState<Companion[]>(COMPANIONS);

  // Stories
  interface RawStory { id: string; companion_id: string; media_url: string; media_type: 'image' | 'video'; duration_seconds: number; caption?: string; sort_order: number; base_likes?: number; base_comments?: number; real_likes?: number; real_comments?: number; }
  const [storiesMap, setStoriesMap] = useState<Map<string, StoryItem[]>>(new Map());
  const [storiesModal, setStoriesModal] = useState<{ companions: CompanionStories[]; startIdx: number } | null>(null);

  const getViewedStories = useCallback((): Set<string> => {
    try { return new Set(JSON.parse(localStorage.getItem('viewed_stories') || '[]')); } catch { return new Set(); }
  }, []);

  useEffect(() => {
    setUserCompanions(getUserCompanions());

    // Fetch published companions from DB
    fetch('/api/companions')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.companions) && data.companions.length > 0) {
          setCompanions(data.companions as Companion[]);
        }
      })
      .catch(() => {});

    // Fetch stories
    fetch('/api/companions/stories')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.stories)) {
          const map = new Map<string, StoryItem[]>();
          for (const s of data.stories as RawStory[]) {
            const items = map.get(s.companion_id) ?? [];
            items.push({ id: s.id, media_url: s.media_url, media_type: s.media_type, duration_seconds: s.duration_seconds, caption: s.caption, base_likes: s.base_likes, base_comments: s.base_comments, real_likes: s.real_likes, real_comments: s.real_comments });
            map.set(s.companion_id, items);
          }
          setStoriesMap(map);
        }
      })
      .catch(() => {});
  }, []);

  const openStories = (companionId: string) => {
    const companionsWithStories = companions
      .filter((c) => storiesMap.has(c.id))
      .map((c) => ({
        companionId: c.id,
        name: c.name,
        avatarUrl: c.avatarUrl,
        stories: storiesMap.get(c.id)!,
      }));

    const startIdx = companionsWithStories.findIndex((c) => c.companionId === companionId);
    if (startIdx >= 0) {
      setStoriesModal({ companions: companionsWithStories, startIdx });
    }
  };

  return (
    <div className="comp-home">
      {/* Hero Banner */}
      <section className="comp-hero">
        <h1 className="comp-hero-title">{t('companions.heroTitle')}</h1>
        <p className="comp-hero-sub">{t('companions.heroSub')}</p>
      </section>

      {/* AI Assistant Banner */}
      <section className="comp-section" style={{ padding: '0 16px' }}>
        <Link href="/companions/assistant" style={{ display: 'block', borderRadius: 16, overflow: 'hidden' }}>
          <img
            src="/companions/assistant-banner.webp"
            alt="AI Assistant"
            style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 16 }}
            loading="eager"
          />
        </Link>
      </section>

      {/* Icon Row — horizontal scroll with Stories support */}
      <section className="comp-icon-row">
        {companions.map((c) => {
          const hasStories = !!c.storyThumbnailUrl && storiesMap.has(c.id);
          const viewed = hasStories && (() => {
            const viewedSet = getViewedStories();
            const cStories = storiesMap.get(c.id) ?? [];
            return cStories.every((s) => viewedSet.has(s.id));
          })();

          return hasStories ? (
            <div key={c.id} className="comp-icon-item" onClick={() => openStories(c.id)} style={{ cursor: 'pointer' }}>
              <StoryAvatarRing src={c.avatarUrl} name={c.name} hasStories isViewed={!!viewed} />
              <span className="comp-icon-name">{c.name}</span>
            </div>
          ) : (
            <Link key={c.id} href={`/companions/${c.id}`} className="comp-icon-item">
              <StoryAvatarRing src={c.avatarUrl} name={c.name} hasStories={false} isViewed={false} />
              <span className="comp-icon-name">{c.name}</span>
            </Link>
          );
        })}
      </section>

      {/* My Characters */}
      {userCompanions.length > 0 && (
        <section className="comp-section">
          <h2 className="comp-section-title">{t('companions.myCharacters')}</h2>
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
                  <button className="comp-card-play">{t('companions.chatBtn')}</button>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured Companions */}
      <section className="comp-section">
        <h2 className="comp-section-title">{t('companions.featured')}</h2>
        <div className="comp-grid">
          {companions.map((c, idx) => (
            <React.Fragment key={c.id}>
              {/* Insert promo banner after 2nd card — hidden for paid users */}
              {idx === 2 && !isPaid && (
                <Link href="/pricing" className="comp-promo-card">
                  <div className="comp-promo-inner">
                    <span className="comp-promo-badge">{t('companions.promoBadge')}</span>
                    <p>{t('companions.promoText')}</p>
                    <span className="comp-promo-cta">{t('companions.promoCta')}</span>
                  </div>
                </Link>
              )}
              <Link href={`/companions/${c.id}`} className="comp-card">
                <div className="comp-card-img">
                  <CompanionAvatar src={c.avatarUrl} name={c.name} />
                  <div className="comp-card-overlay" />
                  {c.isNew && <span className="comp-badge-new">{t('companions.badgeNew')}</span>}
                  {isLiveActionAvailable(c) && (
                    <span className="comp-badge-live-available" title="Live Action available">{t('companions.badgeLive')}</span>
                  )}
                </div>
                <div className="comp-card-bottom">
                  <div className="comp-card-meta">
                    <span className="comp-card-name">{c.name}, {c.age}</span>
                    <span className="comp-card-personality">{c.personality}</span>
                  </div>
                  <p className="comp-card-tagline">{c.tagline}</p>
                  <button className="comp-card-play">{t('companions.chatBtn')}</button>
                </div>
              </Link>
            </React.Fragment>
          ))}
        </div>
      </section>

      {/* Live Action Section */}
      <section className="comp-section" id="live-action">
        <h2 className="comp-section-title">
          {t('companions.liveActionTitle')} <span className="comp-beta-badge">{t('companions.betaBadge')}</span>
        </h2>
        <div className="comp-live-grid">
          {companions.filter(isLiveActionAvailable).map((c) => (
            <LiveCard key={c.id} companion={c} />
          ))}
        </div>
      </section>

      {/* Stories Modal */}
      {storiesModal && (
        <StoriesModal
          companions={storiesModal.companions}
          initialCompanionIndex={storiesModal.startIdx}
          onClose={() => setStoriesModal(null)}
        />
      )}
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
