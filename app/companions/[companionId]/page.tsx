'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import {
  getCompanionById,
  FREE_MESSAGE_LIMIT,
  XP_PER_MESSAGE,
  isLiveActionAvailable,
  PLAY_STYLES,
  RELATIONSHIP_LEVELS,
  getRelationshipLevel,
  getNextLevel,
  type Companion,
  type PlayStyle,
} from '@/lib/companions';
import { getUserCompanionById } from '@/lib/userCompanions';
import PaywallModal from '@/components/companions/PaywallModal';
import PlayStyleModal from '@/components/companions/PlayStyleModal';
import { useTranslation } from '@/lib/useTranslation';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
  imageLoading?: boolean;
}

/** Displays the companion avatar image or a styled initial fallback. */
function AvatarFace({
  companion,
  className,
  style,
}: {
  companion: Companion;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [errored, setErrored] = useState(false);
  if (companion.avatarUrl && !errored) {
    return (
      <img
        src={companion.avatarUrl}
        alt={companion.name}
        className={className}
        style={{ objectFit: 'cover', ...style }}
        onError={() => setErrored(true)}
      />
    );
  }
  const fallback = companion.isAssistant ? '✨' : companion.name[0];
  return (
    <div className={className} style={style}>{fallback}</div>
  );
}

function GalleryImage({ src, fallback, alt }: { src?: string; fallback: string; alt: string }) {
  const [errored, setErrored] = useState(false);
  if (src && !errored) {
    return (
      <img
        src={src}
        alt={alt}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        onError={() => setErrored(true)}
      />
    );
  }
  return (
    <div className="comp-card-placeholder comp-gallery-placeholder">
      <span>{fallback}</span>
    </div>
  );
}

export default function CompanionChatPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const companionId = params.companionId as string;
  const { t, locale } = useTranslation();

  // Support default, user-created, and the Nude Assistant
  const [companion, setCompanion] = useState<Companion | null | undefined>(() => {
    if (companionId.startsWith('user-')) return null; // will load in useEffect
    return getCompanionById(companionId) ?? null;
  });

  useEffect(() => {
    if (companionId.startsWith('user-')) {
      const userComp = getUserCompanionById(companionId);
      setCompanion(userComp);
      return;
    }
    // Fetch latest from DB so Admin edits reflect instantly
    fetch(`/api/companions/${companionId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.companion) setCompanion(data.companion as Companion);
      })
      .catch(() => { /* keep default */ });
  }, [companionId]);

  const { user } = useAppStore();
  const isPaid = !!user && user.plan !== 'free';
  const isAssistant = !!companion?.isAssistant;

  const chatStorageKey = `chat_history_${companionId}`;
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(chatStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as Message[];
        // Strip expired image URLs (photos auto-delete after 1h)
        return parsed.map(m => ({ ...m, imageUrl: undefined, imageLoading: false }));
      }
    } catch {}
    return [];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [paywallType, setPaywallType] = useState<'chat_limit' | 'photo' | 'call' | 'nude_assistant' | null>(null);
  const [showCallComingSoon, setShowCallComingSoon] = useState(false);
  const [showGuestLimit, setShowGuestLimit] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [showRoadmap, setShowRoadmap] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  // Coin spend helper
  const spendCoins = async (action: 'gift' | 'boost') => {
    const token = localStorage.getItem('auth_token');
    if (!token) { setShowGuestLimit(true); return; }
    const res = await fetch('/api/companion-coins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ companionId, action }),
    });
    const d = await res.json();
    if (d.error === 'insufficient_coins') { setShowCoinShop(true); return; }
    if (d.affection !== undefined) setRelPoints(d.affection);
    else if (d.points !== undefined) setRelPoints(d.points);
    if (d.balance !== undefined && user) useAppStore.setState({ user: { ...user, coins: d.balance } });
    const el = document.createElement('div');
    el.className = action === 'gift' ? 'coin-gift-animation' : 'coin-boost-animation';
    el.textContent = action === 'gift' ? '🎁 +20' : '🚀 +100';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1800);
  };
  const [showCoinShop, setShowCoinShop] = useState(false);

  // PlayStyle
  const playStyleKey = `playstyle_${companionId}`;
  const [playStyle, setPlayStyle] = useState<PlayStyle>(() => {
    if (typeof window === 'undefined') return 'sweet';
    return (localStorage.getItem(playStyleKey) || 'sweet') as PlayStyle;
  });
  const [showPlayStyleModal, setShowPlayStyleModal] = useState(false);
  const [relPoints, setRelPoints] = useState(0);
  const [relTrust, setRelTrust] = useState(50);
  const [relTension, setRelTension] = useState(30);
  const [stageChangeEffect, setStageChangeEffect] = useState<{ type: 'up' | 'down'; stage: string } | null>(null);

  // Show PlayStyle modal on first visit
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem(playStyleKey);
    if (!saved && companion) {
      setShowPlayStyleModal(true);
    }
  }, [companion?.id, playStyleKey]);

  // Fetch relationship points on load
  useEffect(() => {
    if (!companion || companion.isAssistant) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    fetch(`/api/companion-relationship?companionId=${companionId}`, { headers })
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.affection === 'number') setRelPoints(d.affection);
        if (typeof d.trust === 'number') setRelTrust(d.trust);
        if (typeof d.tension === 'number') setRelTension(d.tension);
      })
      .catch(() => {});
  }, [companion?.id, companionId]);

  const [galleryIdx, setGalleryIdx] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Recent messages for anti-spam (persisted per companion, last 5)
  const recentMessagesKey = `recent_messages_${companionId}`;
  const readRecentMessages = (): string[] => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(recentMessagesKey);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  };
  const pushRecentMessage = (msg: string) => {
    if (typeof window === 'undefined') return;
    try {
      const existing = readRecentMessages();
      const updated = [msg, ...existing].slice(0, 5);
      localStorage.setItem(recentMessagesKey, JSON.stringify(updated));
    } catch {}
  };

  const userMsgCount = messages.filter((m) => m.role === 'user').length;
  const isLimited = !isPaid && userMsgCount >= FREE_MESSAGE_LIMIT;

  // Persist messages to localStorage (keep last 50)
  useEffect(() => {
    if (messages.length > 0) {
      try {
        const toSave = messages.slice(-50).map(({ role, content }) => ({ role, content }));
        localStorage.setItem(chatStorageKey, JSON.stringify(toSave));
      } catch {}
    }
  }, [messages, chatStorageKey]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Girlfriend experience: she speaks first — only if no saved history
  // Generate greeting via chat API so it respects the user's language
  const greetingSent = useRef(false);
  useEffect(() => {
    if (!companion || greetingSent.current) return;
    const saved = typeof window !== 'undefined' ? localStorage.getItem(chatStorageKey) : null;
    if (saved) return;
    if (!companion.firstMessage) return;
    greetingSent.current = true;

    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    // Ask the AI to generate the first greeting in the user's language
    fetch('/api/companion-chat', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        companionId,
        messages: [],
        userMessage: '[SYSTEM_GREETING]',
        recentMessages: [],
        locale,
        playStyle: playStyle || 'sweet',
      }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.reply) {
          setMessages([{ role: 'assistant', content: data.reply }]);
        } else {
          // Fallback to hardcoded message
          setMessages([{ role: 'assistant', content: companion.firstMessage! }]);
        }
      })
      .catch(() => {
        setMessages([{ role: 'assistant', content: companion.firstMessage! }]);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companion?.id]);

  // Auto-send story comment if arriving from Stories
  const storyCommentSent = useRef(false);
  const pendingStoryComment = searchParams.get('storyComment');
  const pendingRef = useRef(pendingStoryComment);
  pendingRef.current = pendingStoryComment;

  if (!companion) {
    return (
      <div className="comp-chat-page">
        <div className="comp-chat-notfound">
          <h2>{t('companions.notFound')}</h2>
          <Link href="/companions" className="comp-btn-primary">{t('companions.browse')}</Link>
        </div>
      </div>
    );
  }

  // Preset messages — assistant gets customer-service presets, companions get flirty ones
  const presetMessages = isAssistant ? [
    { label: t('companions.assistPresetRequest'), message: t('companions.assistPresetRequestMsg') },
    { label: t('companions.assistPresetHow'), message: t('companions.assistPresetHowMsg') },
    { label: t('companions.assistPresetPlayStyle'), message: t('companions.assistPresetPlayStyleMsg') },
    { label: t('companions.assistPresetIssue'), message: t('companions.assistPresetIssueMsg') },
    { label: t('companions.assistPresetFeature'), message: t('companions.assistPresetFeatureMsg') },
  ] : [
    { label: t('companions.presetSecret'), message: t('companions.presetSecretMsg') },
    { label: t('companions.presetWearing'), message: t('companions.presetWearingMsg') },
    { label: t('companions.presetMiss'), message: t('companions.presetMissMsg') },
    { label: t('companions.presetBold'), message: t('companions.presetBoldMsg') },
    { label: t('companions.presetPhoto'), message: t('companions.presetPhotoMsg') },
  ];

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', content: text.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setIsLoading(true);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const recent = readRecentMessages();
      const res = await fetch('/api/companion-chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          companionId,
          messages: updated.slice(-20).map(({ role, content }) => ({ role, content })),
          userMessage: text.trim(),
          recentMessages: recent,
          locale,
          playStyle: playStyle || 'sweet',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === 'guest_limit') {
          setShowGuestLimit(true);
          setMessages((prev) => prev.slice(0, -1));
          return;
        }
        if (data.error === 'daily_limit') {
          setPaywallType('chat_limit');
          setMessages((prev) => prev.slice(0, -1));
          return;
        }
        throw new Error(data.error || 'API error');
      }

      // If AI wants to send a photo, check free user limit (1st free, 2nd+ paywall)
      if (data.photoPrompt) {
        if (!isPaid) {
          const photoCountKey = 'companion_photo_count';
          const count = parseInt(localStorage.getItem(photoCountKey) || '0', 10);
          if (count >= 1) {
            // 2nd+ photo for free user → paywall
            setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
            setPaywallType('photo');
            pushRecentMessage(text.trim());
            return;
          }
          localStorage.setItem(photoCountKey, String(count + 1));
        }

        // Add assistant message with photo loading state
        // Use a unique ID to find this message later
        const photoMsgId = `photo-${Date.now()}`;
        setMessages((prev) => [...prev, { role: 'assistant', content: data.reply, imageLoading: true, _photoId: photoMsgId } as Message & { _photoId: string }]);

        // Generate photo in background (don't await — let it run independently)
        const photoHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
        const tkn = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
        if (tkn) photoHeaders['Authorization'] = `Bearer ${tkn}`;

        fetch('/api/companion-photo', {
          method: 'POST',
          headers: photoHeaders,
          body: JSON.stringify({ companionId, prompt: data.photoPrompt }),
        })
          .then(r => r.json())
          .then(photoData => {
            setMessages((prev) => prev.map((m) => {
              const msg = m as Message & { _photoId?: string };
              if (msg._photoId === photoMsgId) {
                return { ...m, imageUrl: photoData.imageUrl || undefined, imageLoading: false };
              }
              return m;
            }));
          })
          .catch(() => {
            setMessages((prev) => prev.map((m) => {
              const msg = m as Message & { _photoId?: string };
              if (msg._photoId === photoMsgId) {
                return { ...m, imageLoading: false };
              }
              return m;
            }));
          });
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
      }
      pushRecentMessage(text.trim());

      // Update relationship with 3-axis sentiment
      if (!isAssistant && data.sentiment) {
        const sentiment = data.sentiment as string;
        const affD = (data.affDelta as number) ?? 2;
        const trustD = (data.trustDelta as number) ?? 0;
        const tensionD = (data.tensionDelta as number) ?? 0;

        const relHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
        const relToken = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
        if (relToken) relHeaders['Authorization'] = `Bearer ${relToken}`;
        fetch('/api/companion-relationship', {
          method: 'POST',
          headers: relHeaders,
          body: JSON.stringify({ companionId, sentiment, affectionDelta: affD, trustDelta: trustD, tensionDelta: tensionD, reason: `chat_${sentiment}` }),
        })
          .then((r) => r.json())
          .then((d) => {
            if (typeof d.affection === 'number') setRelPoints(d.affection);
            if (typeof d.trust === 'number') setRelTrust(d.trust);
            if (typeof d.tension === 'number') setRelTension(d.tension);
            // Stage change effect
            if (d.stageChanged) {
              setStageChangeEffect({ type: d.stageUp ? 'up' : 'down', stage: d.newStage });
              setTimeout(() => setStageChangeEffect(null), 3000);
            }
          })
          .catch(() => {});

        // Sentiment micro-animation
        if (affD !== 0) {
          const el = document.createElement('div');
          const emojiMap: Record<string, string> = {
            adoration: '💕💕', tenderness: '💖', playful: '😊', compliment: '❤️',
            coldness: '💭', criticism: '😔', contempt: '💔', betrayal: '💔💔',
          };
          if (affD > 0) {
            el.className = 'sentiment-up-animation';
            el.textContent = `${emojiMap[sentiment] || '❤️'} +${affD}`;
          } else {
            el.className = 'sentiment-down-animation';
            el.textContent = `${emojiMap[sentiment] || '😢'} ${affD}`;
          }
          document.body.appendChild(el);
          setTimeout(() => el.remove(), 2000);
        }
      }

      // If user asked about play styles, show the modal after reply
      const psKeywords = /play.?style|関係性|スタイル|vibe|relationship style|how.*treat|どう接して|変更|change.*style/i;
      if (psKeywords.test(text)) {
        setTimeout(() => setShowPlayStyleModal(true), 1500);
      }

      // Daily limit is now enforced server-side via 429 response
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: t('companions.errorReply') },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handlePreset = (preset: typeof presetMessages[number]) => {
    if ('isPaywalled' in preset && preset.isPaywalled) {
      setPaywallType('photo');
      return;
    }
    sendMessage(preset.message);
  };

  // Auto-send story comment after sendMessage is available
  useEffect(() => {
    const comment = pendingRef.current;
    if (!comment || storyCommentSent.current) return;
    storyCommentSent.current = true;
    router.replace(`/companions/${companionId}`, { scroll: false });
    setTimeout(() => sendMessage(comment), 500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companion?.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  // Always show avatar as the first gallery image. Deduplicate against galleryUrls
  // so the picture the admin just uploaded is guaranteed to appear even when the
  // gallery fields still hold legacy placeholder URLs.
  const galleryImages: string[] = [
    companion.avatarUrl,
    ...companion.galleryUrls.filter((u) => u && u !== companion.avatarUrl),
  ].filter((u): u is string => !!u);

  const galleryLen = Math.max(galleryImages.length, 1);
  const prevGallery = () => setGalleryIdx((i) => (i === 0 ? galleryLen - 1 : i - 1));
  const nextGallery = () => setGalleryIdx((i) => (i === galleryLen - 1 ? 0 : i + 1));

  return (
    <div className="comp-chat-page">
      {/* Header */}
      <div className="comp-chat-header">
        <Link href="/companions" className="comp-chat-back">←</Link>
        <AvatarFace companion={companion} className="comp-chat-header-avatar" />
        <span className="comp-chat-header-name">{companion.name}</span>
        {playStyle && (
          <button className="comp-playstyle-header-btn" onClick={() => setShowPlayStyleModal(true)}>
            {PLAY_STYLES.find((s) => s.id === playStyle)?.emoji}
          </button>
        )}
        <div className="comp-mode-toggle">
          <span className="mode-toggle-btn active">{t('companions.modeChat')}</span>
          {isLiveActionAvailable(companion) && (
            <Link href={`/companions/${companionId}/live`} className="mode-toggle-btn">{t('companions.modeLive')}</Link>
          )}
        </div>
        {!isAssistant && (
          <button className="comp-header-settings-btn" onClick={() => setShowPlayStyleModal(true)} title={t('companions.changeRelation').replace('{name}', companion.name)}>
            ⚙️
          </button>
        )}
      </div>

      <div className="comp-chat-body-wrap">
        {/* Chat Column */}
        <div className="comp-chat-main" style={{ '--chat-bg-image': `url(${companion.avatarUrl})` } as React.CSSProperties}>
          <div className="comp-chat-messages">
            {messages.length === 0 && (
              <div className="comp-chat-intro">
                <AvatarFace companion={companion} className="comp-chat-intro-avatar" />
                <h3>{companion.name}</h3>
                <p className="comp-chat-intro-tag">{companion.personality}</p>
                <p className="comp-chat-intro-tagline">{companion.tagline}</p>
              </div>
            )}

            {messages.map((msg, idx) => (
              <React.Fragment key={idx}>
                {/* Text bubble */}
                <div className={`comp-msg ${msg.role === 'user' ? 'comp-msg-user' : 'comp-msg-ai'}`}>
                  {msg.role === 'assistant' && (
                    <AvatarFace companion={companion} className="comp-msg-avatar" />
                  )}
                  <div className="comp-msg-bubble">{msg.content}</div>
                </div>

                {/* Photo loading — separate bubble */}
                {msg.imageLoading && (
                  <div className="comp-msg comp-msg-ai">
                    <AvatarFace companion={companion} className="comp-msg-avatar" />
                    <div className="comp-photo-loading">
                      <div className="comp-photo-loading-box">
                        <div className="comp-photo-loading-shimmer" />
                        <span className="comp-photo-loading-text">📸 {t('companions.photoSending')}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Photo result — separate bubble */}
                {msg.imageUrl && (
                  <div className="comp-msg comp-msg-ai">
                    <AvatarFace companion={companion} className="comp-msg-avatar" />
                    <div className="comp-photo-bubble">
                      <div className="comp-photo-wrap">
                        <img src={msg.imageUrl} alt="Photo" className="comp-photo-msg" onClick={() => setLightboxUrl(msg.imageUrl!)} style={{ cursor: 'pointer' }} />
                        <a
                          href={`/api/download?url=${encodeURIComponent(msg.imageUrl)}`}
                          className="comp-photo-download"
                          onClick={(e) => e.stopPropagation()}
                        >
                          ⬇
                        </a>
                      </div>
                      <span className="comp-photo-caption">📷 Photo from {companion.name}</span>
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))}

            {isLoading && (
              <div className="comp-msg comp-msg-ai">
                <AvatarFace companion={companion} className="comp-msg-avatar" />
                <div className="comp-msg-bubble comp-typing">
                  <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Mobile Barometer (hidden on desktop) */}
          {!isAssistant && (() => {
            const cl = getRelationshipLevel(relPoints);
            const nl = getNextLevel(relPoints);
            const ptn = nl ? nl.minAffection - relPoints : 0;
            return (
            <div className="comp-mobile-barometer">
              <div className="comp-mobile-bar-info">
                <button className="comp-mobile-roadmap-btn" onClick={() => setShowRoadmap(true)}>
                  {cl.emoji} {t(`companions.rel_${cl.id}`)} ▾
                </button>
                {nl && <span className="comp-mobile-bar-next">{t('companions.rel_next').replace('{points}', String(ptn))} {t(`companions.rel_unlock_${nl.id}`)}</span>}
              </div>
              {/* 3-axis mini bars with labels */}
              <div className="comp-mobile-3axis">
                <div className="comp-mobile-axis-item">
                  <span className="comp-mobile-axis-label" style={{ color: '#ff4d8d' }}>{t('companions.rel_axis_affection')}</span>
                  <div className="comp-mobile-axis-track"><div className="comp-mobile-axis-fill" style={{ width: `${(relPoints / 1000) * 100}%`, background: '#ff4d8d' }} /></div>
                  <span className="comp-mobile-axis-num">{relPoints}</span>
                </div>
                <div className="comp-mobile-axis-item">
                  <span className="comp-mobile-axis-label" style={{ color: '#4d9fff' }}>{t('companions.rel_axis_trust')}</span>
                  <div className="comp-mobile-axis-track"><div className="comp-mobile-axis-fill" style={{ width: `${relTrust}%`, background: '#4d9fff' }} /></div>
                  <span className="comp-mobile-axis-num">{relTrust}</span>
                </div>
                <div className="comp-mobile-axis-item">
                  <span className="comp-mobile-axis-label" style={{ color: '#ffcc00' }}>{t('companions.rel_axis_tension')}</span>
                  <div className="comp-mobile-axis-track"><div className="comp-mobile-axis-fill" style={{ width: `${relTension}%`, background: '#ffcc00' }} /></div>
                  <span className="comp-mobile-axis-num">{relTension}</span>
                </div>
              </div>
              <div className="comp-mobile-bar-actions">
                <button className="comp-mobile-bar-btn" onClick={async () => {
                  const token = localStorage.getItem('auth_token');
                  if (!token) { setShowGuestLimit(true); return; }
                  const res = await fetch('/api/companion-coins', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ companionId, action: 'gift' }),
                  });
                  const d = await res.json();
                  if (d.error === 'insufficient_coins') { setShowCoinShop(true); return; }
                  if (d.points !== undefined) setRelPoints(d.points);
                  if (d.balance !== undefined && user) useAppStore.setState({ user: { ...user, coins: d.balance } });
                  const el = document.createElement('div'); el.className = 'coin-gift-animation'; el.textContent = '🎁 +20'; document.body.appendChild(el); setTimeout(() => el.remove(), 1500);
                }}>🎁 <span className="comp-coin-cost">50</span></button>
                <button className="comp-mobile-bar-btn comp-mobile-bar-btn-boost" onClick={async () => {
                  const token = localStorage.getItem('auth_token');
                  if (!token) { setShowGuestLimit(true); return; }
                  const res = await fetch('/api/companion-coins', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ companionId, action: 'boost' }),
                  });
                  const d = await res.json();
                  if (d.error === 'insufficient_coins') { setShowCoinShop(true); return; }
                  if (d.points !== undefined) setRelPoints(d.points);
                  if (d.balance !== undefined && user) useAppStore.setState({ user: { ...user, coins: d.balance } });
                  const el = document.createElement('div'); el.className = 'coin-boost-animation'; el.textContent = '🚀 +100'; document.body.appendChild(el); setTimeout(() => el.remove(), 1800);
                }}>🚀 <span className="comp-coin-cost">100</span></button>
                <span className="comp-mobile-bar-coins">🪙 {user?.coins ?? 0}</span>
              </div>
            </div>
            ); })()}

          {/* Presets */}
          <div className="comp-presets">
            {presetMessages.map((p) => (
              <button
                key={p.label}
                className="comp-preset-btn"
                onClick={() => handlePreset(p)}
                disabled={isLoading}
              >
                {p.label}
              </button>
            ))}
          </div>


          {/* Input with icon toolbar — LINE-style layout */}
          <form className="comp-chat-input-row" onSubmit={handleSubmit}>
            {!isAssistant && (
              <div className="comp-input-icons">
                <button type="button" className="comp-input-icon-btn comp-input-call-btn" onClick={() => setShowCallComingSoon(true)} title={t('companions.callMe')}>
                  📞
                </button>
                <button type="button" className="comp-input-icon-btn" onClick={() => spendCoins('gift')} title={t('companions.coinGift')}>
                  🎁<span className="comp-input-icon-badge">50</span>
                </button>
                <button type="button" className="comp-input-icon-btn comp-input-icon-boost" onClick={() => spendCoins('boost')} title={t('companions.coinBoost')}>
                  🚀<span className="comp-input-icon-badge">100</span>
                </button>
                <div className="comp-input-divider" />
              </div>
            )}
            <input
              ref={inputRef}
              className="comp-chat-input"
              placeholder={t('companions.writePlaceholder')}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onPaste={(e) => e.preventDefault()}
              onContextMenu={(e) => e.preventDefault()}
              disabled={isLoading}
            />
            <button type="submit" className="comp-chat-send" disabled={isLoading || !input.trim()}>
              →
            </button>
          </form>
        </div>

        {/* Right Column — 9:16 Character Panel (desktop only) */}
        <div className="comp-char-panel">
          {/* Full 9:16 character image */}
          <div className="comp-char-image" style={{ backgroundImage: `url(${galleryImages[galleryIdx] || companion.avatarUrl})` }} />
          <div className="comp-char-gradient" />

          {/* Coin balance — top left */}
          {!isAssistant && (
            <div className="comp-char-coins" onClick={() => setShowCoinShop(true)}>
              <span style={{ fontSize: '0.85rem' }}>🪙</span>
              <span className="comp-char-coins-num">{user?.coins ?? 0}</span>
              <button className="comp-char-coins-add">+</button>
            </div>
          )}

          {/* Gallery dots — top right (settings moved to header) */}

          {/* Gallery dots */}
          {galleryImages.length > 1 && (
            <div className="comp-char-dots">
              {galleryImages.map((_, i) => (
                <span key={i} className={`comp-char-dot ${i === galleryIdx ? 'active' : ''}`} onClick={() => setGalleryIdx(i)} />
              ))}
            </div>
          )}

          {/* Bottom barometer overlay — full width */}
          {!isAssistant && (() => {
            const cl = getRelationshipLevel(relPoints);
            const nl = getNextLevel(relPoints);
            const ptn = nl ? nl.minAffection - relPoints : 0;
            return (
            <div className="comp-char-bottom-overlay">
              {/* Stage badge */}
              <button className="comp-char-bottom-stage" onClick={() => setShowRoadmap(true)}>
                {cl.emoji} {t(`companions.rel_${cl.id}`)} <span className="comp-char-bottom-stage-arrow">▾</span>
              </button>

              {/* 3-axis barometer */}
              <div className="comp-char-bottom-axes">
                {[
                  { label: t('companions.rel_axis_affection'), value: relPoints, max: 1000, color: '#ec4899' },
                  { label: t('companions.rel_axis_trust'), value: relTrust, max: 100, color: '#60a5fa' },
                  { label: t('companions.rel_axis_tension'), value: relTension, max: 100, color: '#fbbf24' },
                ].map(b => (
                  <div key={b.label} className="comp-char-bottom-axis">
                    <span className="comp-char-bottom-axis-label">{b.label}</span>
                    <div className="comp-char-bottom-axis-track">
                      <div className="comp-char-bottom-axis-fill" style={{ width: `${(b.value / b.max) * 100}%`, background: `linear-gradient(90deg, ${b.color}cc, ${b.color})`, boxShadow: `0 0 10px ${b.color}99` }} />
                    </div>
                    <span className="comp-char-bottom-axis-num" style={{ color: b.color }}>{b.value}</span>
                  </div>
                ))}
              </div>

              {/* Next unlock hint */}
              {nl && (
                <div className="comp-char-bottom-unlock">
                  <span className="comp-char-bottom-unlock-pts">
                    {t('companions.rel_next').replace('{points}', String(ptn)).replace(String(ptn), `<em>${ptn}</em>`).includes('<em>')
                      ? <>{t('companions.rel_next').split(String(ptn))[0]}<em>{ptn}</em>{t('companions.rel_next').split(String(ptn)).slice(1).join(String(ptn))}</>
                      : t('companions.rel_next').replace('{points}', String(ptn))}
                  </span>
                  <span className="comp-char-bottom-unlock-reward">{t(`companions.rel_unlock_${nl.id}`)}</span>
                </div>
              )}
              {!nl && <div className="comp-char-bottom-unlock-reward">💎 {t('companions.rel_max')}</div>}
            </div>
            ); })()}

          {/* Name + profile toggle (assistant only shows this) */}
          {isAssistant && (
            <div className="comp-char-glass comp-char-glass-minimal">
              <div className="comp-char-glass-header">
                <div className="comp-char-name-row">
                  <h3>{companion.name} <span className="comp-char-age">{companion.age}</span></h3>
                  <button className="comp-char-profile-toggle" onClick={() => setShowProfile(!showProfile)}>
                    {showProfile ? '✕' : 'ℹ'}
                  </button>
                </div>
              </div>
              {showProfile && (
                <div className="comp-char-profile-text">{companion.description}</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Paywall */}
      {paywallType && (
        <PaywallModal
          type={paywallType}
          companionName={companion.name}
          onClose={() => setPaywallType(null)}
        />
      )}

      {/* Call Coming Soon Modal */}
      {showCallComingSoon && (
        <div className="paywall-overlay" onClick={() => setShowCallComingSoon(false)}>
          <div className="paywall-modal" onClick={(e) => e.stopPropagation()}>
            <button className="paywall-close" onClick={() => setShowCallComingSoon(false)}>×</button>
            <div className="paywall-icon">📞</div>
            <h3>{t('companions.callComingSoonTitle')}</h3>
            <p>{t('companions.callComingSoonDesc').replace('{name}', companion.name)}</p>
            <button className="paywall-btn-primary" onClick={() => setShowCallComingSoon(false)}>
              {t('companions.callComingSoonOk')}
            </button>
          </div>
        </div>
      )}

      {/* Guest Rate Limit — character asks to register */}
      {showGuestLimit && (
        <div className="paywall-overlay" onClick={() => setShowGuestLimit(false)}>
          <div className="paywall-modal" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center' }}>
            <button className="paywall-close" onClick={() => setShowGuestLimit(false)}>×</button>
            <img
              src={companion.storyThumbnailUrl || companion.avatarUrl}
              alt={companion.name}
              style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', objectPosition: '50% 0%', margin: '0 auto 12px', display: 'block', border: '3px solid rgba(255,77,141,0.4)' }}
            />
            <h3 style={{ margin: '0 0 8px' }}>{companion.name}</h3>
            <p style={{ fontSize: '0.95rem', lineHeight: 1.6, marginBottom: 20, color: 'var(--text-secondary)' }}>
              {t('companions.guestLimitMessage').replace('{name}', companion.name)}
            </p>
            <a href="/register" style={{
              display: 'block', padding: '14px 24px',
              background: 'linear-gradient(135deg, #ff4d8d, #ff6fb5)',
              color: '#fff', borderRadius: 12, fontWeight: 700,
              fontSize: '1rem', textDecoration: 'none',
              boxShadow: '0 4px 15px rgba(255,77,141,0.4)',
              marginBottom: 10,
            }}>
              {t('companions.guestLimitRegister')}
            </a>
            <button className="paywall-btn-secondary" onClick={() => setShowGuestLimit(false)}>
              {t('companions.guestLimitLater')}
            </button>
          </div>
        </div>
      )}

      {/* PlayStyle selection modal */}
      {showPlayStyleModal && companion && (
        <PlayStyleModal
          companionName={companion.name}
          onSelect={(style) => {
            setPlayStyle(style);
            localStorage.setItem(playStyleKey, style);
            setShowPlayStyleModal(false);
          }}
          onSkip={() => {
            const def: PlayStyle = 'sweet';
            setPlayStyle(def);
            localStorage.setItem(playStyleKey, def);
            setShowPlayStyleModal(false);
          }}
        />
      )}

      {/* Roadmap Modal */}
      {showRoadmap && companion && (
        <div className="paywall-overlay" onClick={() => setShowRoadmap(false)}>
          <div className="roadmap-modal" onClick={(e) => e.stopPropagation()}>
            <button className="paywall-close" onClick={() => setShowRoadmap(false)}>×</button>
            <h3>{t('companions.roadmapTitle').replace('{name}', companion.name)}</h3>
            <div className="roadmap-stages">
              {RELATIONSHIP_LEVELS.map((lvl, i) => {
                const isCurrent = getRelationshipLevel(relPoints).id === lvl.id;
                const isReached = relPoints >= lvl.minAffection;
                return (
                  <div key={lvl.id} className={`roadmap-stage ${isCurrent ? 'roadmap-current' : ''} ${isReached ? 'roadmap-reached' : 'roadmap-locked'}`}>
                    <div className="roadmap-stage-left">
                      <span className="roadmap-emoji">{lvl.emoji}</span>
                      {i < RELATIONSHIP_LEVELS.length - 1 && <div className={`roadmap-line ${isReached ? 'roadmap-line-active' : ''}`} />}
                    </div>
                    <div className="roadmap-stage-right">
                      <div className="roadmap-stage-header">
                        <span className="roadmap-stage-name">{t(`companions.rel_${lvl.id}`)}</span>
                        <span className="roadmap-stage-pts">{lvl.minAffection}pt</span>
                      </div>
                      <div className="roadmap-stage-unlock">
                        {i < RELATIONSHIP_LEVELS.length - 1 ? t(`companions.rel_unlock_${RELATIONSHIP_LEVELS[i + 1]?.id}`) : t('companions.rel_max')}
                      </div>
                      {isCurrent && <span className="roadmap-you-badge">← {t('companions.roadmapYou')}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Stage Change Effect */}
      {stageChangeEffect && (
        <div className={`stage-change-overlay ${stageChangeEffect.type === 'up' ? 'stage-up' : 'stage-down'}`}>
          <div className="stage-change-content">
            <span className="stage-change-emoji">
              {stageChangeEffect.type === 'up' ? getRelationshipLevel(relPoints).emoji : '💔'}
            </span>
            <span className="stage-change-text">
              {stageChangeEffect.type === 'up' ? t('companions.rel_stage_up') : t('companions.rel_stage_down')}
            </span>
            <span className="stage-change-stage">
              {t(`companions.rel_${stageChangeEffect.stage}`)}
            </span>
          </div>
        </div>
      )}

      {/* Coin Shop Modal */}
      {showCoinShop && (
        <div className="paywall-overlay" onClick={() => setShowCoinShop(false)}>
          <div className="coin-shop-modal" onClick={(e) => e.stopPropagation()}>
            <button className="paywall-close" onClick={() => setShowCoinShop(false)}>×</button>
            <h3>🪙 {t('companions.coinShopTitle')}</h3>
            <p className="coin-shop-desc">{t('companions.coinShopDesc')}</p>
            <div className="coin-shop-packs">
              {[
                { coins: 300, price: '¥490', tag: '' },
                { coins: 700, price: '¥980', tag: t('companions.coinShopPopular') },
                { coins: 1600, price: '¥1,980', tag: t('companions.coinShopBest') },
              ].map((pack) => (
                <button key={pack.coins} className={`coin-shop-pack ${pack.tag ? 'coin-shop-pack-highlight' : ''}`} onClick={() => {
                  // TODO: Connect to actual payment flow
                  window.open('/pricing', '_blank');
                }}>
                  {pack.tag && <span className="coin-shop-pack-tag">{pack.tag}</span>}
                  <span className="coin-shop-pack-coins">🪙 {pack.coins}</span>
                  <span className="coin-shop-pack-price">{pack.price}</span>
                </button>
              ))}
            </div>
            <div className="coin-shop-balance">
              {t('companions.coinShopCurrent')}: 🪙 {user?.coins ?? 0} {t('companions.coinBalance')}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <div className="comp-lightbox" onClick={() => setLightboxUrl(null)}>
          <button className="comp-lightbox-close" onClick={() => setLightboxUrl(null)}>✕</button>
          <img src={lightboxUrl} alt="Photo" className="comp-lightbox-img" />
          <a
            href={`/api/download?url=${encodeURIComponent(lightboxUrl)}`}
            className="comp-lightbox-download"
            onClick={(e) => e.stopPropagation()}
          >
            ⬇ Download
          </a>
        </div>
      )}
    </div>
  );
}
