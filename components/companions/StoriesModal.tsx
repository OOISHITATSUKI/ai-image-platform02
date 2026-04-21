'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export interface StoryItem {
  id: string;
  media_url: string;
  media_type: 'image' | 'video';
  duration_seconds: number;
  caption?: string;
  base_likes?: number;
  base_comments?: number;
  real_likes?: number;
  real_comments?: number;
}

export interface CompanionStories {
  companionId: string;
  name: string;
  avatarUrl: string;
  stories: StoryItem[];
}

interface StoriesModalProps {
  companions: CompanionStories[];
  initialCompanionIndex: number;
  onClose: () => void;
}

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem('story_session_id');
  if (!id) { id = crypto.randomUUID(); localStorage.setItem('story_session_id', id); }
  return id;
}

function formatCount(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export default function StoriesModal({ companions, initialCompanionIndex, onClose }: StoriesModalProps) {
  const router = useRouter();
  const [compIdx, setCompIdx] = useState(initialCompanionIndex);
  const [storyIdx, setStoryIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapRef = useRef<number>(0);

  // Interaction state
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [commentFocused, setCommentFocused] = useState(false);
  const [heartBurst, setHeartBurst] = useState(false);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const commentInputRef = useRef<HTMLInputElement>(null);

  const current = companions[compIdx];
  const story = current?.stories[storyIdx];
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const duration = story?.media_type === 'video' && videoDuration
    ? videoDuration * 1000
    : (story?.duration_seconds ?? 5) * 1000;

  // Reset state on story change
  useEffect(() => {
    setVideoDuration(null);
    setCaptionExpanded(false);
    setCommentText('');
    setCommentFocused(false);
    if (story) {
      setLikesCount((story.base_likes ?? 0) + (story.real_likes ?? 0));
      setCommentsCount((story.base_comments ?? 0) + (story.real_comments ?? 0));
      // Check if already liked
      const likedSet = JSON.parse(localStorage.getItem('liked_stories') || '[]') as string[];
      setIsLiked(likedSet.includes(story.id));
    }
  }, [compIdx, storyIdx, story?.id]);

  // Mark viewed
  useEffect(() => {
    if (!story) return;
    try {
      const key = 'viewed_stories';
      const viewed = JSON.parse(localStorage.getItem(key) || '[]') as string[];
      if (!viewed.includes(story.id)) {
        viewed.push(story.id);
        localStorage.setItem(key, JSON.stringify(viewed.slice(-200)));
      }
    } catch {}
  }, [story?.id]);

  const goNext = useCallback(() => {
    if (!current) { onClose(); return; }
    if (storyIdx < current.stories.length - 1) {
      setStoryIdx(storyIdx + 1);
      setProgress(0);
    } else if (compIdx < companions.length - 1) {
      setCompIdx(compIdx + 1);
      setStoryIdx(0);
      setProgress(0);
    } else {
      onClose();
    }
  }, [current, storyIdx, compIdx, companions.length, onClose]);

  const goPrev = useCallback(() => {
    if (storyIdx > 0) {
      setStoryIdx(storyIdx - 1);
      setProgress(0);
    } else if (compIdx > 0) {
      setCompIdx(compIdx - 1);
      const prevComp = companions[compIdx - 1];
      setStoryIdx(prevComp.stories.length - 1);
      setProgress(0);
    }
  }, [storyIdx, compIdx, companions]);

  // Progress timer — paused when comment input is focused
  useEffect(() => {
    if (paused || commentFocused || !story) return;
    const interval = 50;
    const increment = (interval / duration) * 100;
    timerRef.current = window.setInterval(() => {
      setProgress((p) => {
        if (p >= 100) { goNext(); return 0; }
        return p + increment;
      });
    }, interval);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [compIdx, storyIdx, paused, commentFocused, duration, goNext, story]);

  // Video playback
  useEffect(() => {
    if (story?.media_type === 'video' && videoRef.current) {
      videoRef.current.currentTime = 0;
      if (paused || commentFocused) videoRef.current.pause();
      else videoRef.current.play().catch(() => {});
    }
  }, [story, paused, commentFocused]);

  // Keyboard
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (commentFocused) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, goNext, goPrev, commentFocused]);

  // Like handler
  const handleLike = useCallback(async () => {
    if (!story) return;
    const newLiked = !isLiked;
    setIsLiked(newLiked);
    setLikesCount((p) => newLiked ? p + 1 : p - 1);

    // Persist in localStorage
    const likedSet = JSON.parse(localStorage.getItem('liked_stories') || '[]') as string[];
    if (newLiked) { likedSet.push(story.id); }
    else { const idx = likedSet.indexOf(story.id); if (idx >= 0) likedSet.splice(idx, 1); }
    localStorage.setItem('liked_stories', JSON.stringify(likedSet.slice(-500)));

    const token = localStorage.getItem('auth_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    fetch(`/api/stories/${story.id}/like`, {
      method: newLiked ? 'POST' : 'DELETE',
      headers,
      body: JSON.stringify({ sessionId: getSessionId() }),
    }).catch(() => {});
  }, [isLiked, story]);

  // Double tap → like + heart burst
  const handleDoubleTap = useCallback(() => {
    if (!isLiked) handleLike();
    setHeartBurst(true);
    setTimeout(() => setHeartBurst(false), 700);
  }, [isLiked, handleLike]);

  // Comment submit → save + navigate to chat
  const handleCommentSubmit = async () => {
    const text = commentText.trim();
    if (!text || !story || !current) return;

    const token = localStorage.getItem('auth_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    // Save comment
    fetch(`/api/stories/${story.id}/comment`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ content: text, sessionId: getSessionId() }),
    }).catch(() => {});

    setCommentsCount((p) => p + 1);
    setCommentText('');

    // Navigate to chat with the comment pre-filled so it appears in the chat UI
    onClose();
    router.push(`/companions/${current.companionId}?storyComment=${encodeURIComponent(`[Commented on your story]: ${text}`)}`);
  };

  if (!current || !story) return null;

  const handleTap = (e: React.MouseEvent) => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      handleDoubleTap();
      lastTapRef.current = 0;
      return;
    }
    lastTapRef.current = now;

    setTimeout(() => {
      if (lastTapRef.current === now) {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        if (x < rect.width / 3) goPrev();
        else goNext();
      }
    }, 310);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY, time: Date.now() };
    longPressRef.current = setTimeout(() => setPaused(true), 300);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (longPressRef.current) { clearTimeout(longPressRef.current); longPressRef.current = null; }
    if (paused) { setPaused(false); return; }
    if (!touchStartRef.current) return;
    const t = e.changedTouches[0];
    const dy = t.clientY - touchStartRef.current.y;
    const dx = t.clientX - touchStartRef.current.x;
    const dt = Date.now() - touchStartRef.current.time;
    touchStartRef.current = null;

    if (Math.abs(dy) > 80 && Math.abs(dy) > Math.abs(dx) && dt < 500) {
      if (dy < 0) { router.push(`/companions/${current.companionId}`); onClose(); return; }
      else { onClose(); return; }
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999, background: '#000',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div
        style={{
          position: 'relative', width: '100%', height: '100%', maxWidth: 480,
          overflow: 'hidden', userSelect: 'none',
        }}
        onClick={handleTap}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Media */}
        {story.media_type === 'video' ? (
          <video
            ref={videoRef}
            src={story.media_url}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            playsInline muted loop
            onLoadedMetadata={(e) => {
              const dur = (e.currentTarget as HTMLVideoElement).duration;
              if (dur && isFinite(dur)) setVideoDuration(dur);
            }}
          />
        ) : (
          <img src={story.media_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        )}

        {/* Heart burst animation */}
        {heartBurst && <div className="heart-burst">❤️</div>}

        {/* Top gradient */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '20%',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 100%)',
          pointerEvents: 'none',
        }} />

        {/* Bottom gradient */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%',
          background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)',
          pointerEvents: 'none',
        }} />

        {/* Progress bars */}
        <div style={{
          position: 'absolute', top: 8, left: 12, right: 12,
          display: 'flex', gap: 4, zIndex: 10,
        }}>
          {current.stories.map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 2, background: 'rgba(255,255,255,0.3)', borderRadius: 2, overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', background: '#fff', borderRadius: 2,
                width: i < storyIdx ? '100%' : i === storyIdx ? `${Math.min(100, progress)}%` : '0%',
              }} />
            </div>
          ))}
        </div>

        {/* Header */}
        <div style={{
          position: 'absolute', top: 20, left: 12, right: 12,
          display: 'flex', alignItems: 'center', gap: 10, zIndex: 10,
        }}>
          <img
            src={current.avatarUrl} alt={current.name}
            style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '2px solid #fff' }}
          />
          <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem', flex: 1 }}>{current.name}</span>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer', padding: '4px 8px', lineHeight: 1 }}
          >✕</button>
        </div>

        {/* Caption */}
        {story.caption && (
          <div
            className={`story-caption ${captionExpanded ? 'expanded' : ''}`}
            onClick={(e) => { e.stopPropagation(); setCaptionExpanded(!captionExpanded); }}
          >
            {story.caption}
          </div>
        )}

        {/* Stats: likes & comments */}
        <div className="story-stats">
          <button
            className={`story-like-btn ${isLiked ? 'liked' : ''}`}
            onClick={(e) => { e.stopPropagation(); handleLike(); }}
          >
            <span className="heart-icon">{isLiked ? '❤️' : '🤍'}</span>
            <span>{formatCount(likesCount)}</span>
          </button>
          <span className="story-comment-count">
            💬 {formatCount(commentsCount)}
          </span>
        </div>

        {/* Comment input + CTA */}
        <div className="story-comment-input-wrap" onClick={(e) => e.stopPropagation()}>
          <input
            ref={commentInputRef}
            className="story-comment-input"
            placeholder={`Message ${current.name}...`}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onFocus={() => setCommentFocused(true)}
            onBlur={() => { if (!commentText.trim()) setCommentFocused(false); }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCommentSubmit(); }}
          />
          {commentText.trim() ? (
            <button className="story-comment-send" onClick={handleCommentSubmit}>→</button>
          ) : (
            <button
              className="story-comment-send"
              style={{ background: 'rgba(255,255,255,0.15)' }}
              onClick={() => { onClose(); router.push(`/companions/${current.companionId}`); }}
              title={`Chat with ${current.name}`}
            >💬</button>
          )}
        </div>
      </div>
    </div>
  );
}
