'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import {
  getCompanionById,
  getLevelFromXp,
  getXpForNextLevel,
  getActionVideoUrl,
  xpForAction,
  isLiveActionAvailable,
  LEVEL_XP_REQUIREMENTS,
  SKIP_LEVEL_COSTS,
  MAX_LEVEL,
  type Companion,
  type LiveAction,
  type DressedState,
} from '@/lib/companions';
import PaywallModal from '@/components/companions/PaywallModal';

/** Avatar with graceful fallback for Live screen. */
function LiveAvatar({
  companion,
  className,
}: {
  companion: Companion;
  className?: string;
}) {
  const [errored, setErrored] = useState(false);
  if (companion.avatarUrl && !errored) {
    return (
      <img
        src={companion.avatarUrl}
        alt={companion.name}
        className={className}
        style={{ objectFit: 'cover' }}
        onError={() => setErrored(true)}
      />
    );
  }
  const fallback = companion.isAssistant ? '✨' : companion.name[0];
  return <div className={className}>{fallback}</div>;
}

const AMBIENT_AUDIO_URL = '/companions/audio/ambient-ocean.mp3';

export default function LiveActionPage() {
  const params = useParams();
  const companionId = params.companionId as string;

  const [companion, setCompanion] = useState<Companion | null>(() => getCompanionById(companionId) ?? null);

  useEffect(() => {
    fetch(`/api/companions/${companionId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.companion) setCompanion(data.companion as Companion);
      })
      .catch(() => { /* keep default */ });
  }, [companionId]);

  const { user, deductCredits } = useAppStore();
  const isPaid = !!user && user.plan !== 'free';

  // Per-companion persisted XP
  const xpKey = `companion_xp_${companionId}`;
  const [xp, setXpState] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(xpKey);
      setXpState(stored ? parseInt(stored, 10) || 0 : 0);
    } catch {
      setXpState(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companionId]);

  const setXp = (updater: number | ((prev: number) => number)) => {
    setXpState((prev) => {
      const next = typeof updater === 'function' ? (updater as (n: number) => number)(prev) : updater;
      if (typeof window !== 'undefined') {
        try { localStorage.setItem(xpKey, String(next)); } catch {}
      }
      return next;
    });
  };

  const addXp = (amount: number) => setXp((prev) => prev + amount);

  const [dressedState, setDressedState] = useState<DressedState>('dressed');
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [loopVideo, setLoopVideo] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const pendingEndRef = useRef<(() => void) | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [paywallLevel, setPaywallLevel] = useState<number | null>(null);
  const [paywallType, setPaywallType] = useState<'live_action' | null>(null);

  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [lastUserMessage, setLastUserMessage] = useState('');

  // Ambient audio
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioMuted, setAudioMuted] = useState(true);

  const level = getLevelFromXp(xp);
  const xpInfo = getXpForNextLevel(xp);
  const nextLevel = Math.min(level + 1, MAX_LEVEL);
  const skipCost = SKIP_LEVEL_COSTS[nextLevel] ?? 0;

  // Set initial video once companion is loaded
  useEffect(() => {
    if (!companion) return;
    const greetingUrl = getActionVideoUrl(companion.id, 'greeting', 'dressed', 1);
    setVideoUrl(greetingUrl);
    setLoopVideo(true);
    setDressedState('dressed');
    setVideoError(false);
  }, [companion?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ambient audio setup
  useEffect(() => {
    const a = new Audio(AMBIENT_AUDIO_URL);
    a.loop = true;
    a.volume = 0.3;
    audioRef.current = a;
    return () => {
      try { a.pause(); } catch {}
      audioRef.current = null;
    };
  }, []);

  const toggleAudio = () => {
    const a = audioRef.current;
    if (!a) return;
    if (audioMuted) {
      a.play().catch(() => {});
      setAudioMuted(false);
    } else {
      a.pause();
      setAudioMuted(true);
    }
  };

  if (!companion) {
    return (
      <div className="comp-chat-page">
        <div className="comp-chat-notfound">
          <h2>Companion not found</h2>
          <Link href="/companions" className="comp-btn-primary">Browse Companions</Link>
        </div>
      </div>
    );
  }

  if (!isLiveActionAvailable(companion)) {
    return (
      <div className="comp-chat-page">
        <div className="comp-chat-notfound">
          <h2>Live Action is not available for {companion.name}</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
            You can still chat with her anytime.
          </p>
          <Link href={`/companions/${companion.id}`} className="comp-btn-primary">
            Chat with {companion.name}
          </Link>
        </div>
      </div>
    );
  }

  const playClip = (url: string, loop: boolean, onEnd?: () => void) => {
    setVideoError(false);
    setIsTransitioning(true);
    pendingEndRef.current = onEnd ?? null;
    // fade timing (matches .live-video-wrap.fading CSS, 0.3s)
    setTimeout(() => {
      setVideoUrl(url);
      setLoopVideo(loop);
      setIsTransitioning(false);
    }, 300);
  };

  const handleVideoEnd = () => {
    const fn = pendingEndRef.current;
    pendingEndRef.current = null;
    if (fn) fn();
  };

  const isUnlocked = (action: LiveAction) => {
    if (action.requiredLevel <= 1) return true;
    return action.requiredLevel <= level;
  };

  const playAction = (action: LiveAction) => {
    if (!isUnlocked(action)) {
      setPaywallLevel(action.requiredLevel);
      setPaywallType('live_action');
      return;
    }

    addXp(xpForAction(action.requiredLevel));

    // Re-dress: toggles dressed state, follows up with sexy_tease loop
    if (action.isRedress) {
      const prelim = getActionVideoUrl(companion.id, 'redress', dressedState, 3);
      const newState: DressedState = dressedState === 'dressed' ? 'undressed' : 'dressed';
      playClip(prelim, false, () => {
        setDressedState(newState);
        const followUp = getActionVideoUrl(companion.id, 'sexy_tease', newState, 1);
        playClip(followUp, true);
      });
      return;
    }

    // dressed → Level 4+: auto-undress first
    if (dressedState === 'dressed' && action.requiredLevel >= 4) {
      const prelim = getActionVideoUrl(companion.id, 'redress', 'dressed', 3);
      const finalUrl = getActionVideoUrl(companion.id, action.id, 'undressed', action.requiredLevel);
      playClip(prelim, false, () => {
        setDressedState('undressed');
        playClip(finalUrl, true);
      });
      return;
    }

    // undressed → Level 1/2: auto-redress first
    if (dressedState === 'undressed' && action.requiredLevel <= 2) {
      const prelim = getActionVideoUrl(companion.id, 'redress', 'undressed', 3);
      const finalUrl = getActionVideoUrl(companion.id, action.id, 'dressed', action.requiredLevel);
      playClip(prelim, false, () => {
        setDressedState('dressed');
        playClip(finalUrl, true);
      });
      return;
    }

    // Direct play
    const url = getActionVideoUrl(companion.id, action.id, dressedState, action.requiredLevel);
    playClip(url, true);
  };

  const handleSkipLevel = () => {
    if (level >= MAX_LEVEL) return;
    if (!user) {
      setPaywallLevel(nextLevel);
      setPaywallType('live_action');
      return;
    }
    if ((user.credits ?? 0) < skipCost) {
      setPaywallLevel(nextLevel);
      setPaywallType('live_action');
      return;
    }
    deductCredits(skipCost);
    setXp(LEVEL_XP_REQUIREMENTS[nextLevel]);
  };

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const text = chatInput.trim();
    const isDuplicate = text === lastUserMessage;
    setLastUserMessage(text);
    setChatInput('');
    setChatMessages((prev) => [...prev, { role: 'user', content: text }]);
    setChatLoading(true);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // Recent messages for anti-spam
      let recent: string[] = [];
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem(`recent_messages_${companionId}`);
          recent = raw ? (JSON.parse(raw) as string[]) : [];
        } catch {}
      }

      const res = await fetch('/api/companion-chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          companionId,
          messages: chatMessages.slice(-20),
          userMessage: text,
          recentMessages: recent,
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setChatMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);

      // Save recent and add XP (server may have returned 0 for spam)
      if (typeof window !== 'undefined') {
        try {
          const updated = [text, ...recent].slice(0, 5);
          localStorage.setItem(`recent_messages_${companionId}`, JSON.stringify(updated));
        } catch {}
      }
      if (!isDuplicate && typeof data.xpGain === 'number' && data.xpGain > 0) {
        addXp(data.xpGain);
      }
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: "Sorry, I'm having trouble responding right now. Try again! 💕" },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="comp-chat-page">
      {/* Header */}
      <div className="comp-chat-header">
        <Link href="/companions" className="comp-chat-back">←</Link>
        <LiveAvatar companion={companion} className="comp-chat-header-avatar" />
        <span className="comp-chat-header-name">{companion.name}</span>
        <div className="comp-mode-toggle">
          <Link href={`/companions/${companionId}`} className="mode-toggle-btn">💬 Chat</Link>
          <span className="mode-toggle-btn active">🔴 Live</span>
        </div>
        <button
          className="comp-chat-call-btn"
          onClick={toggleAudio}
          title={audioMuted ? 'Unmute ambient sound' : 'Mute ambient sound'}
        >
          {audioMuted ? '🔇' : '🔊'}
        </button>
      </div>

      <div className="comp-live-layout">
        {/* Left: Video Player */}
        <div className="comp-live-player">
          <div className={`live-video-wrap ${isTransitioning ? 'fading' : ''}`}>
            {videoUrl && !videoError ? (
              <video
                ref={videoRef}
                key={videoUrl}
                src={videoUrl}
                autoPlay
                loop={loopVideo}
                muted
                playsInline
                onError={() => setVideoError(true)}
                onEnded={handleVideoEnd}
                className="live-video"
              />
            ) : (
              <div className="live-video-fallback">
                {companion.avatarUrl ? (
                  <img
                    src={companion.avatarUrl}
                    alt={companion.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div className="comp-card-placeholder" style={{ width: '100%', height: '100%' }}>
                    <span>{companion.isAssistant ? '✨' : companion.name[0]}</span>
                  </div>
                )}
              </div>
            )}
            {/* Overlay info */}
            <div className="live-video-overlay-top">
              <LiveAvatar companion={companion} className="live-video-avatar" />
              <span className="live-video-name">{companion.name}</span>
              <span className="live-video-state-badge">
                {dressedState === 'dressed' ? '👚 Dressed' : '💋 Undressed'}
              </span>
            </div>
          </div>

          {/* Suggestion under video */}
          <div className="live-suggestions">
            <button
              className="comp-preset-btn"
              onClick={() => {
                const greet = companion.liveActions.find((a) => a.id === 'greeting');
                if (greet) playAction(greet);
              }}
              disabled={isTransitioning}
            >
              😊 Hey, how are you?
            </button>
          </div>

          {/* Chat input in live mode */}
          <form
            className="live-chat-form"
            onSubmit={(e) => { e.preventDefault(); sendChat(); }}
          >
            <input
              className="comp-chat-input"
              placeholder="Ask Anything..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onPaste={(e) => e.preventDefault()}
              onContextMenu={(e) => e.preventDefault()}
              disabled={chatLoading}
            />
            <button type="submit" className="comp-chat-send" disabled={chatLoading || !chatInput.trim()}>→</button>
          </form>
          {chatMessages.length > 0 && (
            <div className="live-chat-replies">
              {chatMessages.slice(-3).map((m, i) => (
                <div key={i} className={`live-chat-msg ${m.role}`}>
                  {m.role === 'assistant' && <span className="live-chat-msg-name">{companion.name}:</span>}
                  {m.content}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Actions Panel */}
        <div className="comp-live-panel">
          <div className="live-panel-header">
            <span>🎮 Live Action</span>
            <span className="comp-beta-badge">Beta v2</span>
          </div>

          {/* XP / Level */}
          <div className="live-level-box">
            <div className="live-level-row">
              <span className="live-level-num">⭐ Level {level}</span>
              {level < MAX_LEVEL && (
                <button
                  className="live-skip-btn"
                  onClick={handleSkipLevel}
                  title={`Skip to Level ${nextLevel} for ${skipCost} credits`}
                >
                  Skip to Lv{nextLevel} ⭐ {skipCost}
                </button>
              )}
            </div>
            <div className="xp-bar-track">
              <div
                className="xp-bar-fill"
                style={{
                  width: `${Math.min(100, xpInfo.required > 0
                    ? ((xp - LEVEL_XP_REQUIREMENTS[level]) /
                        Math.max(1, xpInfo.required - LEVEL_XP_REQUIREMENTS[level])) * 100
                    : 100)}%`,
                }}
              />
            </div>
            <div className="live-level-xp">
              {xp} / {xpInfo.required} XP {level < MAX_LEVEL ? `→ Lv${level + 1}` : '(Max)'}
            </div>
          </div>

          {/* Action List */}
          <div className="live-action-list">
            {companion.liveActions.map((action) => {
              const unlocked = isUnlocked(action);
              return (
                <button
                  key={action.id}
                  className={`live-action-item ${unlocked ? 'unlocked' : 'locked'} ${action.isRedress ? 'is-redress' : ''}`}
                  onClick={() => playAction(action)}
                  disabled={isTransitioning || !unlocked}
                >
                  <span className="live-action-label">{action.label}</span>
                  {unlocked ? (
                    <span className="live-play-btn">▶</span>
                  ) : (
                    <span className="live-lock-badge">🔒 Level {action.requiredLevel}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Paywall */}
      {paywallType === 'live_action' && paywallLevel !== null && (
        <PaywallModal
          type="live_action"
          companionName={companion.name}
          requiredLevel={paywallLevel}
          onClose={() => { setPaywallLevel(null); setPaywallType(null); }}
        />
      )}
    </div>
  );
}
