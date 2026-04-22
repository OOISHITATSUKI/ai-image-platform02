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

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [paywallType, setPaywallType] = useState<'chat_limit' | 'photo' | 'call' | 'nude_assistant' | null>(null);
  const [showCallComingSoon, setShowCallComingSoon] = useState(false);
  const [showGuestLimit, setShowGuestLimit] = useState(false);

  // PlayStyle
  const playStyleKey = `playstyle_${companionId}`;
  const [playStyle, setPlayStyle] = useState<PlayStyle>(() => {
    if (typeof window === 'undefined') return 'sweet';
    return (localStorage.getItem(playStyleKey) || 'sweet') as PlayStyle;
  });
  const [showPlayStyleModal, setShowPlayStyleModal] = useState(false);

  // Show PlayStyle modal on first visit
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem(playStyleKey);
    if (!saved && companion) {
      setShowPlayStyleModal(true);
    }
  }, [companion?.id, playStyleKey]);
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Girlfriend experience: she speaks first when the chat opens.
  useEffect(() => {
    if (companion?.firstMessage) {
      setMessages([{ role: 'assistant', content: companion.firstMessage }]);
    } else {
      setMessages([]);
    }
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
    if (isLimited) { setPaywallType('chat_limit'); return; }

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
          // Remove the user message we optimistically added
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

      // If user asked about play styles, show the modal after reply
      const psKeywords = /play.?style|関係性|スタイル|vibe|relationship style|how.*treat|どう接して|変更|change.*style/i;
      if (psKeywords.test(text)) {
        setTimeout(() => setShowPlayStyleModal(true), 1500);
      }

      if (!isPaid && userMsgCount + 1 >= FREE_MESSAGE_LIMIT) {
        setPaywallType('chat_limit');
      }
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
          <button className="comp-chat-call-btn" onClick={() => setShowCallComingSoon(true)}>📞</button>
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
              <div key={idx} className={`comp-msg ${msg.role === 'user' ? 'comp-msg-user' : 'comp-msg-ai'}`}>
                {msg.role === 'assistant' && (
                  <AvatarFace companion={companion} className="comp-msg-avatar" />
                )}
                <div className="comp-msg-bubble">
                  {msg.content}
                  {msg.imageLoading && (
                    <div className="comp-photo-loading">
                      <div className="comp-photo-loading-box">
                        <div className="comp-photo-loading-shimmer" />
                        <span className="comp-photo-loading-text">📸 Generating photo...</span>
                      </div>
                    </div>
                  )}
                  {msg.imageUrl && (
                    <div className="comp-photo-wrap">
                      <img src={msg.imageUrl} alt="Photo" className="comp-photo-msg" />
                      <a
                        href={`/api/download?url=${encodeURIComponent(msg.imageUrl)}`}
                        className="comp-photo-download"
                        onClick={(e) => e.stopPropagation()}
                      >
                        ⬇
                      </a>
                    </div>
                  )}
                </div>
              </div>
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

          {/* Presets */}
          <div className="comp-presets">
            {presetMessages.map((p) => (
              <button
                key={p.label}
                className="comp-preset-btn"
                onClick={() => handlePreset(p)}
                disabled={isLoading || (isLimited && !('isPaywalled' in p))}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Limit bar */}
          {!isPaid && (
            <div className="comp-limit-bar">
              <span>{t('companions.freeMessages').replace('{count}', String(userMsgCount)).replace('{limit}', String(FREE_MESSAGE_LIMIT))}</span>
              <div className="comp-limit-track">
                <div className="comp-limit-fill" style={{ width: `${Math.min(100, (userMsgCount / FREE_MESSAGE_LIMIT) * 100)}%` }} />
              </div>
            </div>
          )}

          {/* Input */}
          <form className="comp-chat-input-row" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              className="comp-chat-input"
              placeholder={isLimited ? t('companions.upgradePlaceholder') : t('companions.writePlaceholder')}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onPaste={(e) => e.preventDefault()}
              onContextMenu={(e) => e.preventDefault()}
              disabled={isLoading || isLimited}
            />
            <button type="submit" className="comp-chat-send" disabled={isLoading || !input.trim() || isLimited}>
              →
            </button>
          </form>
        </div>

        {/* Right Column — Profile (desktop only) */}
        <div className="comp-chat-sidebar">
          {/* Gallery Slider */}
          <div className="comp-gallery">
            <div className="comp-gallery-img">
              <GalleryImage
                src={galleryImages[galleryIdx] || companion.avatarUrl}
                fallback={companion.isAssistant ? '✨' : companion.name[0]}
                alt={companion.name}
              />
              <span className="comp-gallery-v2">{t('companions.galleryV2')}</span>
            </div>
            <div className="comp-gallery-controls">
              <button onClick={prevGallery} className="comp-gallery-arrow">‹</button>
              <div className="comp-gallery-dots">
                {galleryImages.map((_, i) => (
                  <span key={i} className={`comp-gallery-dot ${i === galleryIdx ? 'active' : ''}`} onClick={() => setGalleryIdx(i)} />
                ))}
              </div>
              <button onClick={nextGallery} className="comp-gallery-arrow">›</button>
            </div>
          </div>

          <div className="comp-profile-info">
            <h3>{companion.name} <span className="comp-profile-age">{companion.age}</span></h3>
            <p className="comp-profile-desc">{companion.description}</p>
          </div>

          {!isAssistant && (
            <button className="comp-call-btn-green" onClick={() => setShowCallComingSoon(true)}>
              {t('companions.callMe')}
            </button>
          )}

          {playStyle && (
            <button className="comp-change-relation-btn" onClick={() => setShowPlayStyleModal(true)}>
              {PLAY_STYLES.find((s) => s.id === playStyle)?.emoji} {t('companions.changeRelation').replace('{name}', companion.name)}
            </button>
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
    </div>
  );
}
