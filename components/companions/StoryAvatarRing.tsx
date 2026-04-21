'use client';

import React, { useState } from 'react';

interface StoryAvatarRingProps {
  src?: string;
  name: string;
  hasStories: boolean;
  isViewed: boolean;
  onClick?: () => void;
}

export default function StoryAvatarRing({ src, name, hasStories, isViewed, onClick }: StoryAvatarRingProps) {
  const [errored, setErrored] = useState(false);

  const ringColor = hasStories
    ? isViewed
      ? 'rgba(255,255,255,0.25)' // grey ring = viewed
      : '#ff4d8d'                // pink ring = unviewed
    : 'transparent';

  return (
    <div
      className="story-avatar-ring-wrap"
      onClick={onClick}
      style={{ cursor: hasStories ? 'pointer' : 'default' }}
    >
      <div
        style={{
          width: 68, height: 68, borderRadius: '50%',
          padding: 3,
          background: hasStories
            ? `linear-gradient(135deg, ${ringColor}, ${!isViewed ? '#ff8c42' : ringColor})`
            : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <div style={{
          width: 60, height: 60, borderRadius: '50%', overflow: 'hidden',
          background: '#1a1a2e', border: '2px solid #0d0d1a',
        }}>
          {src && !errored ? (
            <img
              src={src}
              alt={name}
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 0%' }}
              onError={() => setErrored(true)}
            />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.2rem', color: 'var(--text-secondary)',
            }}>
              {name[0]}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
