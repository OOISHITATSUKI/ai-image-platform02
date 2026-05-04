'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

interface EmotionVideo {
  video_url: string;
  variation_index: number;
  unlock_level: number;
  weight: number;
}

interface Props {
  companionId: string;
  currentEmotion: string;
  emotionVideos: Record<string, EmotionVideo[]>;
  affection: number;
  fallbackImageUrl: string;
}

// Affection thresholds for unlock levels
const LEVEL_THRESHOLDS = [0, 50, 150, 350, 600, 900];

function isUnlocked(unlockLevel: number, affection: number): boolean {
  return affection >= (LEVEL_THRESHOLDS[unlockLevel] ?? 0);
}

// Pick a random video weighted by `weight`
function pickWeighted(videos: EmotionVideo[]): EmotionVideo {
  const total = videos.reduce((s, v) => s + v.weight, 0);
  let r = Math.random() * total;
  for (const v of videos) {
    r -= v.weight;
    if (r <= 0) return v;
  }
  return videos[0];
}

// Cooldown based on relationship
function getCooldownMs(affection: number): number {
  if (affection >= 350) return 2000;
  if (affection >= 150) return 3000;
  if (affection >= 50) return 4000;
  return 5000;
}

export default function EmotionVideoPanel({
  currentEmotion,
  emotionVideos,
  affection,
  fallbackImageUrl,
}: Props) {
  const [activeEmotion, setActiveEmotion] = useState(currentEmotion);
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [crossfading, setCrossfading] = useState(false);
  const lastChangeRef = useRef(0);
  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  const [showA, setShowA] = useState(true); // ping-pong between A and B

  const resolveVideoUrl = useCallback((emotion: string): string | null => {
    // Get unlocked videos for this emotion
    const videos = (emotionVideos[emotion] ?? []).filter(v => isUnlocked(v.unlock_level, affection));
    if (videos.length > 0) return pickWeighted(videos).video_url;

    // Fallback to happy
    if (emotion !== 'happy') {
      const happyVideos = (emotionVideos['happy'] ?? []).filter(v => isUnlocked(v.unlock_level, affection));
      if (happyVideos.length > 0) return pickWeighted(happyVideos).video_url;
    }

    return null;
  }, [emotionVideos, affection]);

  // Initialize
  useEffect(() => {
    const url = resolveVideoUrl(currentEmotion);
    setActiveUrl(url);
    setActiveEmotion(currentEmotion);
  }, [emotionVideos]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle emotion change with cooldown + crossfade
  useEffect(() => {
    if (currentEmotion === activeEmotion) return;

    const now = Date.now();
    const cooldown = getCooldownMs(affection);
    if (now - lastChangeRef.current < cooldown) return;

    const url = resolveVideoUrl(currentEmotion);
    if (!url) return;
    if (url === activeUrl) {
      setActiveEmotion(currentEmotion);
      return;
    }

    lastChangeRef.current = now;
    setNextUrl(url);
    setCrossfading(true);

    // After crossfade completes, swap
    const timeout = setTimeout(() => {
      setActiveUrl(url);
      setActiveEmotion(currentEmotion);
      setShowA(prev => !prev);
      setCrossfading(false);
      setNextUrl(null);
    }, 500);

    return () => clearTimeout(timeout);
  }, [currentEmotion, activeEmotion, affection, activeUrl, resolveVideoUrl]);

  // No videos at all — show fallback image
  const hasAnyVideos = Object.keys(emotionVideos).length > 0 && activeUrl;

  if (!hasAnyVideos) {
    return (
      <div className="emotion-video-container">
        <img
          src={fallbackImageUrl}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
    );
  }

  const urlA = showA ? activeUrl : nextUrl;
  const urlB = showA ? nextUrl : activeUrl;

  return (
    <div className="emotion-video-container">
      {/* Player A */}
      <video
        ref={videoARef}
        key={urlA || 'a'}
        src={urlA || undefined}
        className={`emotion-video-player ${showA && !crossfading ? 'visible' : ''} ${crossfading && !showA ? 'visible' : ''} ${crossfading && showA ? 'hidden' : ''}`}
        muted
        loop
        playsInline
        autoPlay
        preload="auto"
      />
      {/* Player B */}
      <video
        ref={videoBRef}
        key={urlB || 'b'}
        src={urlB || undefined}
        className={`emotion-video-player ${!showA && !crossfading ? 'visible' : ''} ${crossfading && showA ? 'visible' : ''} ${crossfading && !showA ? 'hidden' : ''}`}
        muted
        loop
        playsInline
        autoPlay
        preload="auto"
      />
    </div>
  );
}
