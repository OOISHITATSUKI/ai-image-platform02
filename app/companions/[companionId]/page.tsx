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

/** Convert markdown-style links [text](url) to clickable <a> tags */
function renderMessageContent(content: string): React.ReactNode {
  const parts = content.split(/(\[[^\]]+\]\([^)]+\))/g);
  if (parts.length === 1) return content;
  return parts.map((part, i) => {
    const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (match) {
      return <a key={i} href={match[2]} style={{ color: '#f472b6', textDecoration: 'underline' }}>{match[1]}</a>;
    }
    return part;
  });
}

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
  const [dynamicReplies, setDynamicReplies] = useState<string[]>([]);
  const [messageStyle, setMessageStyle] = useState<'cinematic' | 'chat'>(() => {
    if (typeof window === 'undefined') return 'cinematic';
    return (localStorage.getItem(`msgStyle_${companionId}`) || 'cinematic') as 'cinematic' | 'chat';
  });
  const [paywallType, setPaywallType] = useState<'chat_limit' | 'photo' | 'call' | 'nude_assistant' | null>(null);
  const [showCallComingSoon, setShowCallComingSoon] = useState(false);
  const [showGuestLimit, setShowGuestLimit] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [showBarometerInfo, setShowBarometerInfo] = useState(false);
  const [showAssistCloseness, setShowAssistCloseness] = useState(false);
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
  const [userNickname, setUserNickname] = useState<string | null>(null);

  // Show PlayStyle modal on first visit (skip for assistant)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (companion?.isAssistant) return;
    const saved = localStorage.getItem(playStyleKey);
    if (!saved && companion) {
      setShowPlayStyleModal(true);
    }
  }, [companion?.id, playStyleKey]);

  // Fetch relationship points + nickname on load
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
        if (d.nickname !== undefined) setUserNickname(d.nickname);
      })
      .catch(() => {});
  }, [companion?.id, companionId]);

  const saveNickname = async (name: string) => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    const res = await fetch('/api/companion-relationship', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ companionId, nickname: name }),
    });
    const d = await res.json();
    if (d.nickname !== undefined) setUserNickname(d.nickname);
  };

  const resetRelationship = async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    const res = await fetch('/api/companion-relationship', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ companionId }),
    });
    const d = await res.json();
    if (d.reset) {
      setRelPoints(0);
      setRelTrust(50);
      setRelTension(30);
      setUserNickname(null);
      setMessages([]);
      localStorage.removeItem(chatStorageKey);
      setShowPlayStyleModal(false);
    }
  };

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

  // Preset messages — assistant gets FAQ + flirty presets (random 3), companions get flirty ones
  const allAssistantPresets = [
    // FAQ / serious
    { label: t('companions.assistPresetRequest'), message: t('companions.assistPresetRequestMsg') },
    { label: t('companions.assistPresetHow'), message: t('companions.assistPresetHowMsg') },
    { label: t('companions.assistPresetPlayStyle'), message: t('companions.assistPresetPlayStyleMsg') },
    { label: t('companions.assistPresetIssue'), message: t('companions.assistPresetIssueMsg') },
    { label: t('companions.assistPresetFeature'), message: t('companions.assistPresetFeatureMsg') },
    { label: t('companions.assistFaqCredits'), message: t('companions.assistFaqCreditsMsg') },
    { label: t('companions.assistFaqNsfw'), message: t('companions.assistFaqNsfwMsg') },
    { label: t('companions.assistFaqFaceswap'), message: t('companions.assistFaqFaceswapMsg') },
    { label: t('companions.assistFaqPrompt'), message: t('companions.assistFaqPromptMsg') },
    { label: t('companions.assistFaqPayment'), message: t('companions.assistFaqPaymentMsg') },
    { label: t('companions.assistFaqLevel'), message: t('companions.assistFaqLevelMsg') },
    { label: t('companions.assistFaqVideo'), message: t('companions.assistFaqVideoMsg') },
    { label: t('companions.assistFaqInpaint'), message: t('companions.assistFaqInpaintMsg') },
    // Flirty / playful
    { label: t('companions.assistFlirtBf'), message: t('companions.assistFlirtBfMsg') },
    { label: t('companions.assistFlirtPhoto'), message: t('companions.assistFlirtPhotoMsg') },
    { label: t('companions.assistFlirtType'), message: t('companions.assistFlirtTypeMsg') },
    { label: t('companions.assistFlirtDate'), message: t('companions.assistFlirtDateMsg') },
    { label: t('companions.assistFlirtAge'), message: t('companions.assistFlirtAgeMsg') },
  ];
  const [assistantPresets] = useState(() => {
    const shuffled = [...allAssistantPresets].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  });
  const presetMessages = isAssistant ? assistantPresets : [
    { label: t('companions.presetSecret'), message: t('companions.presetSecretMsg') },
    { label: t('companions.presetWearing'), message: t('companions.presetWearingMsg') },
    { label: t('companions.presetMiss'), message: t('companions.presetMissMsg') },
    { label: t('companions.presetBold'), message: t('companions.presetBoldMsg') },
    { label: t('companions.presetPhoto'), message: t('companions.presetPhotoMsg') },
  ];

  // Detect breakup/reset keywords in user message
  const [showResetFromChat, setShowResetFromChat] = useState(false);
  const breakupKeywords = /別れ|わかれ|やり直し|リセット|break\s*up|start\s*over|reset|goodbye|さようなら|もう終わり|関係.*終|끝내|헤어지|分手|重新开始|terminar|romper/i;

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    // Check for breakup/reset intent
    if (!isAssistant && breakupKeywords.test(text.trim())) {
      setShowResetFromChat(true);
      return;
    }

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
          userNickname: userNickname || undefined,
          messageStyle,
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

      // Update dynamic quick replies
      if (Array.isArray(data.suggestedReplies) && data.suggestedReplies.length > 0) {
        setDynamicReplies(data.suggestedReplies);
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
                if (photoData.imageUrl) {
                  return { ...m, imageUrl: photoData.imageUrl, imageLoading: false };
                }
                // Photo generation failed — show error in chat
                return { ...m, content: m.content + `\n\n📷 ${t('companions.photoFailed') || '写真の送信に失敗しました...もう一度お願いしてね'}`, imageLoading: false };
              }
              return m;
            }));
          })
          .catch(() => {
            setMessages((prev) => prev.map((m) => {
              const msg = m as Message & { _photoId?: string };
              if (msg._photoId === photoMsgId) {
                return { ...m, content: m.content + `\n\n📷 ${t('companions.photoFailed') || '写真の送信に失敗しました...もう一度お願いしてね'}`, imageLoading: false };
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

      // If user asked about play styles, show the modal after reply (not for assistant)
      if (!isAssistant) {
        const psKeywords = /play.?style|関係性|スタイル|vibe|relationship style|how.*treat|どう接して|変更|change.*style/i;
        if (psKeywords.test(text)) {
          setTimeout(() => setShowPlayStyleModal(true), 1500);
        }
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
      {/* Header — simplified: ← avatar name | coins ⚙️ */}
      <div className="comp-chat-header">
        <div className="comp-header-left">
          <Link href="/companions" className="comp-chat-back">←</Link>
          <AvatarFace companion={companion} className="comp-chat-header-avatar" />
          <div className="comp-header-name-wrap">
            <span className="comp-chat-header-name">{companion.name}</span>
            <span className="comp-header-online">
              <span className="comp-header-online-dot" />{t('companions.online') || 'Online'}
              {isAssistant && (
                <span onClick={(e) => { e.stopPropagation(); setShowAssistCloseness(true); }} style={{ marginLeft: 8, color: '#a78bfa', fontWeight: 600, cursor: 'pointer' }}>
                  💬 {Math.min(Math.floor(messages.filter(m => m.role === 'user').length), 100)}/100
                </span>
              )}
            </span>
          </div>
        </div>
        <div className="comp-header-right">
          {isLiveActionAvailable(companion) && (
            <Link href={`/companions/${companionId}/live`} className="comp-header-live-btn">Live</Link>
          )}
          {!isAssistant && (
            <div className="comp-header-coin-badge" onClick={() => setShowCoinShop(true)}>
              <span className="comp-header-coin-icon">🪙</span>
              <span className="comp-header-coin-num">{user?.coins ?? 0}</span>
              <button className="comp-header-coin-add">+</button>
            </div>
          )}
          {!isAssistant && (
            <button className="comp-header-settings-btn" onClick={() => setShowPlayStyleModal(true)}>
              ⚙️
            </button>
          )}
        </div>
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
                  <div className="comp-msg-bubble">{msg.role === 'assistant' ? renderMessageContent(msg.content) : msg.content}</div>
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

          {/* Mobile: Assistant closeness bar */}
          {isAssistant && (
            <div className="comp-mobile-barometer" style={{ padding: '8px 16px', cursor: 'pointer' }} onClick={() => setShowAssistCloseness(true)}>
              <div className="comp-mobile-bar-info" style={{ justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.75rem', color: '#a78bfa', fontWeight: 600 }}>
                  💬 {t('companions.assistCloseness') || 'Closeness'}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {Math.min(Math.floor(messages.filter(m => m.role === 'user').length), 100)}/100
                </span>
              </div>
              <div className="comp-mobile-axis-track" style={{ marginTop: 4 }}>
                <div className="comp-mobile-axis-fill" style={{
                  width: `${Math.min(Math.floor(messages.filter(m => m.role === 'user').length), 100)}%`,
                  background: 'linear-gradient(90deg, #a78bfa, #f472b6)',
                  transition: 'width 0.5s ease',
                }} />
              </div>
            </div>
          )}

          {/* Mobile Barometer (hidden on desktop) */}
          {!isAssistant && (() => {
            const cl = getRelationshipLevel(relPoints);
            const nl = getNextLevel(relPoints);
            const ptn = nl ? nl.minAffection - relPoints : 0;
            return (
            <div className="comp-mobile-barometer" onClick={() => setShowBarometerInfo(true)} style={{ cursor: 'pointer' }}>
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
              {/* Actions moved to input bar icons */}
            </div>
            ); })()}

          {/* Presets — rank-aware with photo/NSFW prompts */}
          <div className="comp-presets">
            {(() => {
              const msgCount = messages.filter(m => m.role === 'user').length;

              // Photo/action prompts escalate with affection level
              const sfwPrompts = [
                t('companions.quickPhoto1') || '写真見せて 📸',
                t('companions.quickPhoto2') || '顔が見たいな 💕',
              ];
              const swimsuitPrompts = [
                t('companions.quickSwimsuit1') || '水着姿見たい 👙',
                t('companions.quickPhoto3') || '自撮り送って 😍',
                t('companions.quickFlirt1') || 'もっとドキドキさせて 💓',
              ];
              const boldPrompts = [
                t('companions.quickBold1') || 'セクシーな写真見せて 🔥',
                t('companions.quickBold2') || '脱いでみて 😈',
                t('companions.quickBold3') || '今何着てるの？ 👀',
              ];

              // Select prompts based on affection level
              const actionPrompts = relPoints >= 400 ? boldPrompts
                : relPoints >= 150 ? swimsuitPrompts
                : sfwPrompts;

              let displayReplies: string[];
              if (dynamicReplies.length > 0) {
                // Every 2-3 messages, inject an action prompt
                if (msgCount % 3 !== 0) {
                  const prompt = actionPrompts[msgCount % actionPrompts.length];
                  displayReplies = [...dynamicReplies.slice(0, 2), prompt];
                } else {
                  displayReplies = dynamicReplies;
                }
              } else {
                // Fallback: 2 presets + 1 action prompt
                const fallback = presetMessages.slice(0, 2).map(p => p.label);
                fallback.push(actionPrompts[Math.floor(Math.random() * actionPrompts.length)]);
                displayReplies = fallback;
              }
              return displayReplies;
            })().map((text, idx) => (
              <button
                key={`${text}-${idx}`}
                className="comp-preset-btn"
                onClick={() => {
                  sendMessage(text);
                  setDynamicReplies([]);
                }}
                disabled={isLoading}
              >
                {typeof text === 'string' ? text : (text as { label: string }).label}
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
            <div className="comp-char-bottom-overlay" onClick={() => setShowBarometerInfo(true)} style={{ cursor: 'pointer' }}>
              {/* Name + mini profile */}
              <div className="comp-char-bottom-header">
                <div className="comp-char-bottom-name">
                  <h3>{companion.name} <span className="comp-char-bottom-age">{companion.age}</span></h3>
                  <button className="comp-char-bottom-stage" onClick={() => setShowRoadmap(true)}>
                    {cl.emoji} {t(`companions.rel_${cl.id}`)} <span className="comp-char-bottom-stage-arrow">▾</span>
                  </button>
                </div>
                {companion.profile && (
                  <div className="comp-char-bottom-profile">
                    <span>📍 {t('companions.profileHometown') || 'From'}: {companion.profile.hometown}</span>
                    <span>💼 {t('companions.profileOccupation') || 'Job'}: {companion.profile.occupation}</span>
                    {companion.profile.hobbies && <span>✨ {t('companions.profileHobbies') || 'Hobbies'}: {companion.profile.hobbies}</span>}
                  </div>
                )}
              </div>

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
                    {(() => {
                      const tmpl = t('companions.rel_next');
                      const idx = tmpl.indexOf('{points}');
                      if (idx === -1) return tmpl;
                      return <>{tmpl.slice(0, idx)}<em>{ptn}</em>{tmpl.slice(idx + '{points}'.length)}</>;
                    })()}
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

      {/* Assistant Closeness Modal */}
      {showAssistCloseness && isAssistant && (() => {
        const closeness = Math.min(Math.floor(messages.filter(m => m.role === 'user').length), 100);
        const stages = [
          { min: 0, label: t('companions.assistStage1') || 'First meeting', emoji: '👋', desc: t('companions.assistStage1Desc') || 'Polite and professional' },
          { min: 5, label: t('companions.assistStage2') || 'Getting comfortable', emoji: '😊', desc: t('companions.assistStage2Desc') || 'Warmer, occasional jokes' },
          { min: 15, label: t('companions.assistStage3') || 'Friendly', emoji: '💬', desc: t('companions.assistStage3Desc') || 'Shares personal tidbits' },
          { min: 30, label: t('companions.assistStage4') || 'Close', emoji: '💕', desc: t('companions.assistStage4Desc') || 'Opens up, shares secrets' },
          { min: 50, label: t('companions.assistStage5') || 'Best friends', emoji: '✨', desc: t('companions.assistStage5Desc') || 'Very personal, inside jokes' },
        ];
        const currentStage = [...stages].reverse().find(s => closeness >= s.min) || stages[0];
        return (
          <div className="paywall-overlay" onClick={() => setShowAssistCloseness(false)}>
            <div className="paywall-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 360 }}>
              <button className="paywall-close" onClick={() => setShowAssistCloseness(false)}>×</button>
              <div className="paywall-icon">{currentStage.emoji}</div>
              <h3>{t('companions.assistClosenessTitle') || 'Closeness with Assistant'}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '8px 0 16px' }}>
                {t('companions.assistClosenessDesc') || 'The more you chat, the more she opens up to you'}
              </p>
              <div style={{ margin: '0 0 16px', textAlign: 'center' }}>
                <span style={{ fontSize: '2rem', fontWeight: 700, color: '#a78bfa' }}>{closeness}</span>
                <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>/100</span>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, height: 8, marginBottom: 20 }}>
                <div style={{ width: `${closeness}%`, height: '100%', borderRadius: 8, background: 'linear-gradient(90deg, #a78bfa, #f472b6)', transition: 'width 0.5s ease' }} />
              </div>
              {stages.map((s, i) => {
                const isActive = closeness >= s.min;
                const isCurrent = s === currentStage;
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', borderRadius: 8,
                    background: isCurrent ? 'rgba(167,139,250,0.15)' : 'transparent',
                    opacity: isActive ? 1 : 0.4,
                    marginBottom: 4,
                  }}>
                    <span style={{ fontSize: '1.1rem' }}>{s.emoji}</span>
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: isCurrent ? '#a78bfa' : 'var(--text-primary)' }}>{s.label}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{s.desc}</div>
                    </div>
                    <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{s.min}+</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

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

      {/* PlayStyle selection modal (not for assistant) */}
      {showPlayStyleModal && companion && !isAssistant && (
        <PlayStyleModal
          companionName={companion.name}
          currentNickname={userNickname}
          currentMessageStyle={messageStyle}
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
          onNicknameChange={(name) => {
            saveNickname(name);
          }}
          onMessageStyleChange={(style) => {
            setMessageStyle(style);
            localStorage.setItem(`msgStyle_${companionId}`, style);
          }}
          onReset={() => {
            resetRelationship();
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

      {/* Reset from Chat Modal */}
      {showResetFromChat && companion && (
        <div className="paywall-overlay" onClick={() => setShowResetFromChat(false)}>
          <div className="paywall-modal" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center' }}>
            <button className="paywall-close" onClick={() => setShowResetFromChat(false)}>×</button>
            <img
              src={companion.storyThumbnailUrl || companion.avatarUrl}
              alt={companion.name}
              style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', objectPosition: '50% 0%', margin: '0 auto 12px', display: 'block', border: '3px solid rgba(239,68,68,0.4)' }}
            />
            <h3 style={{ margin: '0 0 8px' }}>💔 {companion.name}</h3>
            <p style={{ fontSize: '0.95rem', lineHeight: 1.6, marginBottom: 8, color: 'var(--text-secondary)' }}>
              {(t('companions.resetConfirm') || '本当に{name}と一度、破局しますか？').replace('{name}', companion.name)}
            </p>
            <p style={{ fontSize: '0.78rem', color: '#a1a1aa', marginBottom: 20 }}>
              {t('companions.resetNote') || '⚠ チャット履歴・関係ポイント・ニックネームが全て削除されます。この操作は取り消せません。'}
            </p>
            <button
              onClick={() => { setShowResetFromChat(false); resetRelationship(); }}
              style={{
                display: 'block', width: '100%', padding: '14px 24px',
                background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)',
                color: '#ef4444', borderRadius: 12, fontWeight: 700,
                fontSize: '1rem', cursor: 'pointer', marginBottom: 10,
              }}
            >
              💔 {t('companions.resetYes') || 'リセットする'}
            </button>
            <button className="paywall-btn-secondary" onClick={() => { setShowResetFromChat(false); sendMessage(input || '...'); }}>
              {t('companions.resetStay') || 'やっぱりやめる'}
            </button>
          </div>
        </div>
      )}

      {/* Barometer Info Modal — v4.1 */}
      {showBarometerInfo && companion && !isAssistant && (() => {
        const cl = getRelationshipLevel(relPoints);
        const nl = getNextLevel(relPoints);
        const ptn = nl ? nl.minAffection - relPoints : 0;
        return (
        <div className="paywall-overlay" onClick={() => setShowBarometerInfo(false)}>
          <div className="barometer-info-modal" onClick={(e) => e.stopPropagation()}>
            <button className="paywall-close" onClick={() => setShowBarometerInfo(false)}>×</button>
            <h3>{t('companions.barometerTitle')?.replace('{name}', companion.name) || `あなたと${companion.name}の関係`}</h3>
            <p className="barometer-info-stage">{cl.emoji} {t(`companions.rel_${cl.id}`)}</p>

            {/* 💖 Affection */}
            <div className="barometer-info-section">
              <div className="barometer-info-axis-head"><span style={{ color: '#ec4899' }}>💖 {t('companions.rel_axis_affection')}</span> <strong style={{ color: '#ec4899' }}>{relPoints} / 1000</strong></div>
              <div className="comp-mobile-axis-track"><div className="comp-mobile-axis-fill" style={{ width: `${(relPoints / 1000) * 100}%`, background: '#ec4899' }} /></div>
              <p className="barometer-info-axis-desc">{t('companions.barometerAffDesc') || 'キャラがあなたを好きな気持ち。上げると見た目・シチュエーションが解放される。'}</p>
              <div className="barometer-info-methods">
                <span className="barometer-info-methods-label">{t('companions.barometerHowTo') || '上げ方'}:</span>
                <div className="barometer-info-method"><span>💬 褒める・気遣う</span><span className="barometer-info-delta">+5〜+15</span></div>
                <div className="barometer-info-method"><span>🎁 ギフトを贈る</span><span className="barometer-info-delta">+30</span></div>
                <div className="barometer-info-method"><span>📞 電話で話す</span><span className="barometer-info-delta">+20</span></div>
              </div>
              {nl && (
                <div className="barometer-info-next">
                  <span>あと <em>{ptn}</em>pt →</span> <strong>{t(`companions.rel_unlock_${nl.id}`)}</strong>
                </div>
              )}
            </div>

            {/* 💙 Trust */}
            <div className="barometer-info-section">
              <div className="barometer-info-axis-head"><span style={{ color: '#60a5fa' }}>💙 {t('companions.rel_axis_trust')}</span> <strong style={{ color: '#60a5fa' }}>{relTrust} / 100</strong></div>
              <div className="comp-mobile-axis-track"><div className="comp-mobile-axis-fill" style={{ width: `${relTrust}%`, background: '#60a5fa' }} /></div>
              <p className="barometer-info-axis-desc">{t('companions.barometerTrustDesc') || 'キャラが心を開いている度合い。上げると内面・秘密・本音が解放される。'}</p>
              <p className="barometer-info-warn">⚠️ {t('companions.barometerTrustWarn') || '上げるには時間と誠実さが必要。課金ではほぼ上がらない。'}</p>
              <div className="barometer-info-methods">
                <span className="barometer-info-methods-label">{t('companions.barometerHowTo') || '上げ方'}:</span>
                <div className="barometer-info-method"><span>💬 悩みを聞く・共感</span><span className="barometer-info-delta">+5〜+8</span></div>
                <div className="barometer-info-method"><span>📅 毎日会話する</span><span className="barometer-info-delta">+1/回</span></div>
                <div className="barometer-info-method"><span>💬 一貫性ある発言</span><span className="barometer-info-delta">+1〜+2</span></div>
              </div>
            </div>

            {/* 💛 Tension */}
            <div className="barometer-info-section">
              <div className="barometer-info-axis-head"><span style={{ color: '#fbbf24' }}>💛 {t('companions.rel_axis_tension')}</span> <strong style={{ color: '#fbbf24' }}>{relTension} / 100</strong></div>
              <div className="comp-mobile-axis-track"><div className="comp-mobile-axis-fill" style={{ width: `${relTension}%`, background: '#fbbf24' }} /></div>
              <p className="barometer-info-axis-desc">{t('companions.barometerTensionDesc') || '現在進行の感情の高ぶり。上げると色っぽさ・大胆さが上昇。'}</p>
              <p className="barometer-info-warn">📉 {t('companions.barometerTensionWarn') || '毎日自然に減衰する（-2/日）。放置すると冷める。'}</p>
              <div className="barometer-info-methods">
                <span className="barometer-info-methods-label">{t('companions.barometerHowTo') || '上げ方'}:</span>
                <div className="barometer-info-method"><span>💬 新しい話題</span><span className="barometer-info-delta">+5〜+8</span></div>
                <div className="barometer-info-method"><span>🚀 ブースト</span><span className="barometer-info-delta">+30</span></div>
                <div className="barometer-info-method"><span>📞 電話で話す</span><span className="barometer-info-delta">+10</span></div>
              </div>
            </div>

            {/* CTA */}
            <div className="barometer-info-cta">
              <span className="barometer-info-cta-label">💡 {t('companions.barometerCtaLabel') || 'すぐに進めたい？'}</span>
              <div className="barometer-info-cta-btns">
                <button onClick={() => { setShowBarometerInfo(false); spendCoins('gift'); }}>🎁 {t('companions.coinGift') || 'ギフト'}</button>
                <button onClick={() => { setShowBarometerInfo(false); spendCoins('boost'); }}>🚀 {t('companions.coinBoost') || 'ブースト'}</button>
              </div>
            </div>
          </div>
        </div>
        ); })()}

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
