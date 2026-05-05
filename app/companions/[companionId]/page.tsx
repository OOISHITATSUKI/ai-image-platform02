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
import { logCompanionEventClient } from '@/lib/companion-analytics-client';
import { COMPANION_EVENTS, PAYWALL_TRIGGERS } from '@/lib/companion-constants';
import { safeStorage, MAX_CHAT_MESSAGES } from '@/lib/safe-storage';
import EmotionVideoPanel from '@/components/companions/EmotionVideoPanel';

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
  emotionVideoUrl?: string;
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
  // 'undefined' = still loading from DB, 'null' = truly not found
  const [companion, setCompanion] = useState<Companion | null | undefined>(() => {
    if (companionId.startsWith('user-')) return undefined; // will load in useEffect
    const hardcoded = getCompanionById(companionId);
    return hardcoded !== undefined ? hardcoded : undefined; // undefined = loading
  });
  const [companionReady, setCompanionReady] = useState(false);

  useEffect(() => {
    if (companionId.startsWith('user-')) {
      const userComp = getUserCompanionById(companionId);
      setCompanion(userComp ?? null);
      setCompanionReady(true);
      return;
    }
    // Fetch latest from DB so Admin edits reflect instantly
    fetch(`/api/companions/${companionId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.companion) setCompanion(data.companion as Companion);
        else if (!getCompanionById(companionId)) setCompanion(null);
        setCompanionReady(true);
      })
      .catch(() => {
        if (!getCompanionById(companionId)) setCompanion(null);
        setCompanionReady(true);
      });
  }, [companionId]);

  const { user } = useAppStore();
  const isPaid = !!user && user.plan !== 'free';
  const isAssistant = !!companion?.isAssistant;

  const chatStorageKey = `chat_history_${companionId}`;
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = safeStorage.getItem(chatStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as Message[];
        // Strip expired image URLs (photos auto-delete after 1h)
        return parsed.slice(-MAX_CHAT_MESSAGES).map(m => ({ ...m, imageUrl: undefined, imageLoading: false }));
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

  // Credit spend helper (unified — replaces coins)
  const spendCredits = async (action: 'gift' | 'boost') => {
    const token = localStorage.getItem('auth_token');
    if (!token) { setShowGuestLimit(true); return; }
    const res = await fetch('/api/companion-coins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ companionId, action }),
    });
    const d = await res.json();
    if (d.error === 'insufficient_credits') { setShowCreditShop(true); return; }
    if (d.affection !== undefined) setRelPoints(d.affection);
    else if (d.points !== undefined) setRelPoints(d.points);
    if (d.balance !== undefined && user) useAppStore.setState({ user: { ...user, credits: d.balance } });
    const el = document.createElement('div');
    el.className = action === 'gift' ? 'coin-gift-animation' : 'coin-boost-animation';
    el.textContent = action === 'gift' ? '🎁 +20' : '🚀 +100';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1800);
  };
  const [showCreditShop, setShowCreditShop] = useState(false);

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

  // Emotion video state
  const [currentEmotion, setCurrentEmotion] = useState('greeting');
  const [emotionVideos, setEmotionVideos] = useState<Record<string, { video_url: string; variation_index: number; unlock_level: number; weight: number }[]>>({});

  // Log session start event
  useEffect(() => {
    if (!companion) return;
    logCompanionEventClient({
      eventType: COMPANION_EVENTS.SESSION_START,
      characterId: companion.id,
      metadata: { entry_point: 'direct_url' },
    });
  }, [companion?.id]);

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

  // Fetch emotion videos on mount
  useEffect(() => {
    if (!companion || companion.isAssistant) return;
    fetch(`/api/companion-emotions?companionId=${companionId}`)
      .then((r) => r.json())
      .then((d) => { if (d.emotions) setEmotionVideos(d.emotions); })
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
      safeStorage.removeItem(chatStorageKey);
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
      const raw = safeStorage.getItem(recentMessagesKey);
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
      safeStorage.setItem(recentMessagesKey, JSON.stringify(updated));
    } catch {}
  };

  const userMsgCount = messages.filter((m) => m.role === 'user').length;
  const isLimited = !isPaid && userMsgCount >= FREE_MESSAGE_LIMIT;

  // Persist messages to localStorage (keep last 20, text only — no images/blobs)
  useEffect(() => {
    if (messages.length > 0) {
      const toSave = messages.slice(-MAX_CHAT_MESSAGES).map(({ role, content }) => ({ role, content }));
      safeStorage.setItem(chatStorageKey, JSON.stringify(toSave));
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
    if (!companion || !companionReady || greetingSent.current) return;
    const saved = typeof window !== 'undefined' ? safeStorage.getItem(chatStorageKey) : null;
    if (saved) return;
    if (!companion.firstMessage && !companion.greetingSequence?.length) return;
    greetingSent.current = true;

    // LINE-style greeting sequence: render blocks as multiple messages with delay
    if (companion.greetingSequence && companion.greetingSequence.length > 0) {
      const seq = companion.greetingSequence;
      const msgs: Message[] = [];
      for (const block of seq) {
        if (block.type === 'text' && block.content) {
          msgs.push({ role: 'assistant', content: block.content });
        } else if (block.type === 'image' && block.content) {
          msgs.push({ role: 'assistant', content: '', imageUrl: block.content });
        } else if (block.type === 'video' && block.content) {
          msgs.push({ role: 'assistant', content: '', emotionVideoUrl: block.content });
        }
      }
      // Show messages one by one with delay for natural feel
      let shown = 0;
      const showNext = () => {
        shown++;
        setMessages(msgs.slice(0, shown));
        if (shown < msgs.length) setTimeout(showNext, 600);
      };
      if (msgs.length > 0) showNext();
      return;
    }

    // Fallback: AI-generated greeting
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

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
        setMessages([{ role: 'assistant', content: data?.reply || companion.firstMessage! }]);
        if (data?.emotion) setCurrentEmotion(data.emotion);
      })
      .catch(() => {
        setMessages([{ role: 'assistant', content: companion.firstMessage! }]);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companionReady]);

  // Auto-send story comment if arriving from Stories
  const storyCommentSent = useRef(false);
  const pendingStoryComment = searchParams.get('storyComment');
  const pendingRef = useRef(pendingStoryComment);
  pendingRef.current = pendingStoryComment;

  // Preset messages — level-aware romance psychology presets
  // Assistant: FAQ + flirty presets based on closeness (message count)
  const assistFaqPresets = [
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
  ];
  // Lv1: Ice-breakers — empathy & similarity (ミラーリング, 共感)
  const assistFlirtLv1 = [
    { label: t('companions.assistFlirtType'), message: t('companions.assistFlirtTypeMsg') },
    { label: t('companions.assistFlirtAge'), message: t('companions.assistFlirtAgeMsg') },
    { label: t('companions.assistFlirtMirror'), message: t('companions.assistFlirtMirrorMsg') },
    { label: t('companions.assistFlirtCompliment'), message: t('companions.assistFlirtComplimentMsg') },
  ];
  // Lv2: Building tension — push-pull, scarcity (押して引く, 希少性)
  const assistFlirtLv2 = [
    { label: t('companions.assistFlirtBf'), message: t('companions.assistFlirtBfMsg') },
    { label: t('companions.assistFlirtPhoto'), message: t('companions.assistFlirtPhotoMsg') },
    { label: t('companions.assistFlirtPushPull'), message: t('companions.assistFlirtPushPullMsg') },
    { label: t('companions.assistFlirtScarcity'), message: t('companions.assistFlirtScarcityMsg') },
    { label: t('companions.assistFlirtGap'), message: t('companions.assistFlirtGapMsg') },
  ];
  // Lv3: Deep connection — reciprocity, jealousy, protection (好意の返報性, 嫉妬, 庇護欲)
  const assistFlirtLv3 = [
    { label: t('companions.assistFlirtDate'), message: t('companions.assistFlirtDateMsg') },
    { label: t('companions.assistFlirtJealous'), message: t('companions.assistFlirtJealousMsg') },
    { label: t('companions.assistFlirtReciprocity'), message: t('companions.assistFlirtReciprocityMsg') },
    { label: t('companions.assistFlirtProtect'), message: t('companions.assistFlirtProtectMsg') },
    { label: t('companions.assistFlirtNight'), message: t('companions.assistFlirtNightMsg') },
  ];

  const [assistPresetSeed, setAssistPresetSeed] = useState(0);
  const [assistantPresets, setAssistantPresets] = useState<{label: string; message: string}[]>([]);
  useEffect(() => {
    const closeness = Math.min(Math.floor(messages.filter(m => m.role === 'user').length), 100);
    // Level-aware: unlock deeper flirty presets as closeness grows
    let flirtPool = [...assistFlirtLv1];
    if (closeness >= 15) flirtPool = [...flirtPool, ...assistFlirtLv2];
    if (closeness >= 35) flirtPool = [...flirtPool, ...assistFlirtLv3];
    // Mix: 1 FAQ + 2 flirty (weighted toward romance as closeness grows)
    const shuffledFaq = [...assistFaqPresets].sort(() => Math.random() - 0.5);
    const shuffledFlirt = [...flirtPool].sort(() => Math.random() - 0.5);
    const faqCount = closeness >= 30 ? 0 : 1;
    const picked = [
      ...shuffledFaq.slice(0, faqCount),
      ...shuffledFlirt.slice(0, 3 - faqCount),
    ].sort(() => Math.random() - 0.5);
    setAssistantPresets(picked.slice(0, 3));
  }, [assistPresetSeed, messages.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Companion presets — level-aware based on relPoints (affection)
  // Lv1 (0-149): Gentle approach — empathy, compliments, mirroring
  const companionPresetsLv1 = [
    { label: t('companions.presetSecret'), message: t('companions.presetSecretMsg') },
    { label: t('companions.presetMiss'), message: t('companions.presetMissMsg') },
    { label: t('companions.presetConfession'), message: t('companions.presetConfessionMsg') },
    { label: t('companions.presetVulnerable'), message: t('companions.presetVulnerableMsg') },
    { label: t('companions.presetPhoto'), message: t('companions.presetPhotoMsg') },
  ];
  // Lv2 (150-399): Push-pull, teasing, jealousy
  const companionPresetsLv2 = [
    { label: t('companions.presetPushPull'), message: t('companions.presetPushPullMsg') },
    { label: t('companions.presetTease'), message: t('companions.presetTeaseMsg') },
    { label: t('companions.presetJealousy'), message: t('companions.presetJealousyMsg') },
    { label: t('companions.presetNightWhisper'), message: t('companions.presetNightWhisperMsg') },
    { label: t('companions.presetWearing'), message: t('companions.presetWearingMsg') },
  ];
  // Lv3 (400+): Deep intimacy — dominance, exclusivity, bold
  const companionPresetsLv3 = [
    { label: t('companions.presetDominant'), message: t('companions.presetDominantMsg') },
    { label: t('companions.presetExclusive'), message: t('companions.presetExclusiveMsg') },
    { label: t('companions.presetBold'), message: t('companions.presetBoldMsg') },
  ];

  const getCompanionPresets = () => {
    let pool = [...companionPresetsLv1];
    if (relPoints >= 150) pool = [...pool, ...companionPresetsLv2];
    if (relPoints >= 400) pool = [...pool, ...companionPresetsLv3];
    return pool.sort(() => Math.random() - 0.5).slice(0, 5);
  };

  const presetMessages = isAssistant ? assistantPresets : getCompanionPresets();

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
        if (data.error === 'insufficient_credits') {
          setShowCreditShop(true);
          setMessages((prev) => prev.slice(0, -1));
          return;
        }
        throw new Error(data.error || 'API error');
      }

      // Update emotion for video panel + resolve video URL for chat bubble
      let emotionVideoUrlForChat: string | undefined;
      if (data.emotion && !isAssistant) {
        const prevEmotion = currentEmotion;
        setCurrentEmotion(data.emotion);

        // Only attach emotion video to chat if emotion changed AND no photo is being sent
        if (data.emotion !== prevEmotion && !data.photoPrompt) {
          const videos = (emotionVideos[data.emotion] ?? []);
          if (videos.length > 0) {
            const picked = videos[Math.floor(Math.random() * videos.length)];
            emotionVideoUrlForChat = picked.video_url;
          }
        }
      }

      // Update dynamic quick replies (deduplicate)
      if (Array.isArray(data.suggestedReplies) && data.suggestedReplies.length > 0) {
        const seen = new Set<string>();
        const deduped = data.suggestedReplies.filter((r: string) => {
          // Exact match dedup
          if (seen.has(r)) return false;
          // Fuzzy dedup: first 3 chars match
          const prefix = r.replace(/[\s\p{Emoji}]/gu, '').slice(0, 3);
          if (prefix && seen.has(prefix)) return false;
          seen.add(r);
          if (prefix) seen.add(prefix);
          return true;
        });
        setDynamicReplies(deduped.slice(0, 3));
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
        // Text first
        setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
        // Emotion video arrives with delay (natural feel)
        if (emotionVideoUrlForChat) {
          setTimeout(() => {
            setMessages((prev) => [...prev, { role: 'assistant', content: '', emotionVideoUrl: emotionVideoUrlForChat }]);
          }, 1500);
        }
      }
      pushRecentMessage(text.trim());
      if (isAssistant) setAssistPresetSeed(s => s + 1);

      // Deduct credits locally if chat cost credits
      if (data.creditCost && data.creditCost > 0 && user) {
        useAppStore.getState().deductCredits(data.creditCost);
      }

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

  // ── Early returns AFTER all Hooks (React Rules of Hooks) ──
  if (companion === undefined) {
    return (
      <div className="comp-chat-page">
        <div className="comp-chat-notfound">
          <div style={{ fontSize: '1.5rem', opacity: 0.5 }}>...</div>
        </div>
      </div>
    );
  }
  if (companion === null) {
    return (
      <div className="comp-chat-page">
        <div className="comp-chat-notfound">
          <h2>{t('companions.notFound')}</h2>
          <Link href="/companions" className="comp-btn-primary">{t('companions.browse')}</Link>
        </div>
      </div>
    );
  }

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
            </span>
            {isAssistant && (() => {
              const closeness = Math.min(Math.floor(messages.filter(m => m.role === 'user').length), 100);
              const stages = [
                { min: 50, emoji: '✨', label: t('companions.assistStage5') || 'Best friends' },
                { min: 30, emoji: '💕', label: t('companions.assistStage4') || 'Close' },
                { min: 15, emoji: '💬', label: t('companions.assistStage3') || 'Friendly' },
                { min: 5, emoji: '😊', label: t('companions.assistStage2') || 'Comfortable' },
                { min: 0, emoji: '👋', label: t('companions.assistStage1') || 'First meeting' },
              ];
              const stage = stages.find(s => closeness >= s.min) || stages[stages.length - 1];
              return (
                <button
                  onClick={(e) => { e.stopPropagation(); setShowAssistCloseness(true); }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)',
                    borderRadius: 20, padding: '2px 10px 2px 6px', cursor: 'pointer',
                    fontSize: '0.7rem', fontWeight: 600, color: '#a78bfa',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {stage.emoji} {stage.label}
                </button>
              );
            })()}
          </div>
        </div>
        <div className="comp-header-right">
          {isLiveActionAvailable(companion) && (
            <Link href={`/companions/${companionId}/live`} className="comp-header-live-btn">Live</Link>
          )}
          {!isAssistant && (
            <div className="comp-header-coin-badge" onClick={() => setShowCreditShop(true)}>
              <span className="comp-header-coin-icon">⚡</span>
              <span className="comp-header-coin-num">{user?.credits ?? 0}</span>
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
                {/* Text bubble — skip if content is empty (image/video-only message) */}
                {msg.content && (
                  <div className={`comp-msg ${msg.role === 'user' ? 'comp-msg-user' : 'comp-msg-ai'}`}>
                    {msg.role === 'assistant' && (
                      <AvatarFace companion={companion} className="comp-msg-avatar" />
                    )}
                    <div className="comp-msg-bubble">{msg.role === 'assistant' ? renderMessageContent(msg.content) : msg.content}</div>
                  </div>
                )}

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

                {/* Emotion video — separate bubble (only when no photo) */}
                {msg.emotionVideoUrl && !msg.imageUrl && (
                  <div className="comp-msg comp-msg-ai">
                    <AvatarFace companion={companion} className="comp-msg-avatar" />
                    <div className="comp-emotion-video-bubble">
                      <video
                        src={msg.emotionVideoUrl}
                        autoPlay muted loop playsInline
                        className="comp-emotion-video-msg"
                      />
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
          {isAssistant && (() => {
            const closeness = Math.min(Math.floor(messages.filter(m => m.role === 'user').length), 100);
            const stages = [
              { min: 50, emoji: '✨', label: t('companions.assistStage5') || 'Best friends' },
              { min: 30, emoji: '💕', label: t('companions.assistStage4') || 'Close' },
              { min: 15, emoji: '💬', label: t('companions.assistStage3') || 'Friendly' },
              { min: 5, emoji: '😊', label: t('companions.assistStage2') || 'Comfortable' },
              { min: 0, emoji: '👋', label: t('companions.assistStage1') || 'First meeting' },
            ];
            const stage = stages.find(s => closeness >= s.min) || stages[stages.length - 1];
            return (
              <div className="comp-mobile-barometer" style={{ padding: '8px 16px', cursor: 'pointer' }} onClick={() => setShowAssistCloseness(true)}>
                <div className="comp-mobile-bar-info" style={{ justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.75rem', color: '#a78bfa', fontWeight: 600 }}>
                    {stage.emoji} {stage.label}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {closeness}/100
                  </span>
                </div>
                <div className="comp-mobile-axis-track" style={{ marginTop: 4 }}>
                  <div className="comp-mobile-axis-fill" style={{
                    width: `${closeness}%`,
                    background: 'linear-gradient(90deg, #a78bfa, #f472b6)',
                    transition: 'width 0.5s ease',
                  }} />
                </div>
              </div>
            );
          })()}

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
                <button type="button" className="comp-input-icon-btn" onClick={() => spendCredits('gift')} title={t('companions.coinGift')}>
                  🎁<span className="comp-input-icon-badge">20</span>
                </button>
                <button type="button" className="comp-input-icon-btn comp-input-icon-boost" onClick={() => spendCredits('boost')} title={t('companions.coinBoost')}>
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

          {/* Credit balance — top left */}
          {!isAssistant && (
            <div className="comp-char-coins" onClick={() => setShowCreditShop(true)}>
              <span style={{ fontSize: '0.85rem' }}>⚡</span>
              <span className="comp-char-coins-num">{user?.credits ?? 0}</span>
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
              {/* Name + relationship badge */}
              <div className="comp-char-bottom-header">
                <div className="comp-char-bottom-name">
                  <h3>{companion.name} <span className="comp-char-bottom-age">{companion.age}</span></h3>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <button className="comp-char-bottom-stage" onClick={(e) => { e.stopPropagation(); setShowRoadmap(true); }}>
                      {cl.emoji} {t(`companions.rel_${cl.id}`)} <span className="comp-char-bottom-stage-arrow">▾</span>
                    </button>
                    {companion.profile && (
                      <button className="comp-char-detail-toggle" onClick={(e) => { e.stopPropagation(); setShowProfile(!showProfile); }}>
                        {showProfile ? '✕' : 'ℹ'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Collapsible profile details */}
              {showProfile && companion.profile && (
                <div className="comp-char-bottom-profile-expand">
                  <span>📍 {t('companions.profileHometown') || 'From'}: {companion.profile.hometown}</span>
                  <span>💼 {t('companions.profileOccupation') || 'Job'}: {companion.profile.occupation}</span>
                  {companion.profile.hobbies && <span>✨ {t('companions.profileHobbies') || 'Hobbies'}: {companion.profile.hobbies}</span>}
                  {companion.profile.favoriteFood && <span>🍽️ {t('companions.profileFood') || 'Likes'}: {companion.profile.favoriteFood}</span>}
                  {companion.profile.music && <span>🎵 {t('companions.profileMusic') || 'Music'}: {companion.profile.music}</span>}
                  {companion.profile.catchphrase && <span>💬 &ldquo;{companion.profile.catchphrase}&rdquo;</span>}
                </div>
              )}

              {/* 3-axis barometer — always visible */}
              <div className="comp-char-bottom-axes" onClick={() => setShowBarometerInfo(true)} style={{ cursor: 'pointer' }}>
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

              {/* Next unlock hint — live badge style */}
              {nl && (
                <div className="comp-char-bottom-unlock-live">
                  <span className="comp-char-unlock-live-badge">
                    <span className="comp-char-unlock-live-dot" />
                    NEXT
                  </span>
                  <span className="comp-char-unlock-live-text">
                    <em>{ptn}pt</em> {t(`companions.rel_unlock_${nl.id}`)}
                  </span>
                </div>
              )}
              {!nl && (
                <div className="comp-char-bottom-unlock-live">
                  <span className="comp-char-unlock-live-badge" style={{ background: 'rgba(168,85,247,0.3)', borderColor: 'rgba(168,85,247,0.6)' }}>
                    <span className="comp-char-unlock-live-dot" style={{ background: '#a855f7' }} />
                    MAX
                  </span>
                  <span className="comp-char-unlock-live-text">💎 {t('companions.rel_max')}</span>
                </div>
              )}
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
              <button
                onClick={() => {
                  if (confirm(t('companions.assistResetConfirm') || 'Reset chat history and closeness? This cannot be undone.')) {
                    setMessages([]);
                    safeStorage.removeItem(`chat_history_${companion.id}`);
                    setAssistPresetSeed(s => s + 1);
                    setShowAssistCloseness(false);
                  }
                }}
                style={{
                  marginTop: 16, width: '100%', padding: '8px 0', borderRadius: 8,
                  border: '1px solid rgba(239,68,68,0.3)', background: 'transparent',
                  color: '#f87171', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600,
                }}
              >
                🗑️ {t('companions.assistResetBtn') || 'Reset Chat & Closeness'}
              </button>
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

      {/* Credit Shop Modal */}
      {showCreditShop && (
        <div className="paywall-overlay" onClick={() => setShowCreditShop(false)}>
          <div className="coin-shop-modal" onClick={(e) => e.stopPropagation()}>
            <button className="paywall-close" onClick={() => setShowCreditShop(false)}>×</button>
            <h3>{t('companions.creditShopTitle') || 'Get Credits'}</h3>
            <p className="coin-shop-desc">{t('companions.creditShopDesc') || 'Credits let you send gifts, boost your relationship, unlock NSFW content, and more.'}</p>
            <div className="coin-shop-packs">
              {[
                { credits: 60, price: '$4.99', tag: '' },
                { credits: 150, price: '$9.99', tag: t('companions.creditShopPopular') || 'Popular' },
                { credits: 350, price: '$19.99', tag: t('companions.creditShopBest') || 'Best Value' },
              ].map((pack) => (
                <button key={pack.credits} className={`coin-shop-pack ${pack.tag ? 'coin-shop-pack-highlight' : ''}`} onClick={() => {
                  window.open('/pricing', '_blank');
                }}>
                  {pack.tag && <span className="coin-shop-pack-tag">{pack.tag}</span>}
                  <span className="coin-shop-pack-coins">{pack.credits} credits</span>
                  <span className="coin-shop-pack-price">{pack.price}</span>
                </button>
              ))}
            </div>
            <div className="coin-shop-balance">
              {t('companions.creditShopCurrent') || 'Current balance'}: {user?.credits ?? 0} {t('pricing.credits') || 'credits'}
            </div>
            {/* Subscribe link (subtle) */}
            <div style={{ marginTop: 10, textAlign: 'center' }}>
              <a
                href="/pricing"
                style={{
                  fontSize: '0.72rem', color: '#f87171', textDecoration: 'none',
                }}
              >
                {t('companions.creditShopSubCta') || 'View Plans →'}
              </a>
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
                <button onClick={() => { setShowBarometerInfo(false); spendCredits('gift'); }}>🎁 {t('companions.coinGift') || 'ギフト'}</button>
                <button onClick={() => { setShowBarometerInfo(false); spendCredits('boost'); }}>🚀 {t('companions.coinBoost') || 'ブースト'}</button>
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
