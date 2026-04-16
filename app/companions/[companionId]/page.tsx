'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import {
  getCompanionById,
  FREE_MESSAGE_LIMIT,
  PRESET_MESSAGES,
  XP_PER_MESSAGE,
  isLiveActionAvailable,
  type Companion,
} from '@/lib/companions';
import { getUserCompanionById } from '@/lib/userCompanions';
import PaywallModal from '@/components/companions/PaywallModal';

interface Message {
  role: 'user' | 'assistant';
  content: string;
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
  const companionId = params.companionId as string;

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

  // Nude Assistant is now open to everyone; free users hit the normal
  // FREE_MESSAGE_LIMIT gate after 10 turns, and the system prompt naturally
  // nudges them toward upgrading during the conversation.

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
          messages: updated.slice(-20),
          userMessage: text.trim(),
          recentMessages: recent,
        }),
      });

      if (!res.ok) throw new Error('API error');

      const data = await res.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
      pushRecentMessage(text.trim());

      if (!isPaid && userMsgCount + 1 >= FREE_MESSAGE_LIMIT) {
        setPaywallType('chat_limit');
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: "Sorry, I'm having trouble responding right now. Try again! 💕" },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handlePreset = (preset: typeof PRESET_MESSAGES[number]) => {
    if ('isPaywalled' in preset && preset.isPaywalled) {
      setPaywallType('photo');
      return;
    }
    sendMessage(preset.message);
  };

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
        <div className="comp-mode-toggle">
          <span className="mode-toggle-btn active">💬 Chat</span>
          {isLiveActionAvailable(companion) && (
            <Link href={`/companions/${companionId}/live`} className="mode-toggle-btn">🔴 Live</Link>
          )}
        </div>
        {!isAssistant && (
          <button className="comp-chat-call-btn" onClick={() => setPaywallType('call')}>📞</button>
        )}
      </div>

      <div className="comp-chat-body-wrap">
        {/* Chat Column */}
        <div className="comp-chat-main">
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
                <div className="comp-msg-bubble">{msg.content}</div>
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
            {PRESET_MESSAGES.map((p) => (
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
              <span>{userMsgCount}/{FREE_MESSAGE_LIMIT} free messages</span>
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
              placeholder={isLimited ? 'Upgrade to keep chatting...' : `Write a message...`}
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
              <span className="comp-gallery-v2">V2</span>
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
            <button className="comp-call-btn-green" onClick={() => setPaywallType('call')}>
              📞 Call Me
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
    </div>
  );
}
