'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAppStore } from '@/lib/store';

interface TalkCharacter {
  id: string;
  name: string;
  description: string;
  avatar_url: string;
}

interface TalkMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface TalkSession {
  id: string;
  message_count: number;
  completed: boolean;
  streak_day: number;
  base_reward: number;
  bonus_reward: number;
}

interface Streak {
  current_streak: number;
  longest_streak: number;
  total_completed_days: number;
}

export default function TalkPage() {
  const { user } = useAppStore();
  const [character, setCharacter] = useState<TalkCharacter | null>(null);
  const [characters, setCharacters] = useState<TalkCharacter[]>([]);
  const [session, setSession] = useState<TalkSession | null>(null);
  const [messages, setMessages] = useState<TalkMessage[]>([]);
  const [streak, setStreak] = useState<Streak>({ current_streak: 0, longest_streak: 0, total_completed_days: 0 });
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showCharSelect, setShowCharSelect] = useState(false);
  const [showReward, setShowReward] = useState(false);
  const [rewardAmount, setRewardAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    loadSession();
    loadCharacters();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  async function loadCharacters() {
    const res = await fetch('/api/talk/character');
    const data = await res.json();
    setCharacters(data.characters ?? []);
  }

  async function loadSession() {
    setLoading(true);
    const res = await fetch(`/api/talk/session?tz=${encodeURIComponent(tz)}`, { headers });
    const data = await res.json();
    setSession(data.session);
    setMessages(data.messages ?? []);
    setCharacter(data.character);
    setStreak(data.streak);
    setLoading(false);
  }

  async function selectCharacter(charId: string) {
    await fetch('/api/talk/character', {
      method: 'POST',
      headers,
      body: JSON.stringify({ characterId: charId }),
    });
    setShowCharSelect(false);
    loadSession();
  }

  async function sendMessage() {
    if (!input.trim() || !session || sending) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setSending(true);

    try {
      const res = await fetch('/api/talk/message', {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: userMsg, sessionId: session.id, tz }),
      });
      const data = await res.json();

      if (data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      }

      setSession(prev => prev ? { ...prev, message_count: data.messageCount, completed: data.completed } : null);

      if (data.completed && data.rewardTotal > 0) {
        setRewardAmount(data.rewardTotal);
        setShowReward(true);
        setTimeout(() => setShowReward(false), 4000);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '…接続エラー。もう一度試してね。' }]);
    } finally {
      setSending(false);
    }
  }

  if (!user) {
    return (
      <div className="talk-page">
        <div className="talk-login-prompt">
          <h2>Daily Talk</h2>
          <p>ログインして毎日会話でクレジットをゲットしよう</p>
          <a href="/login" className="talk-login-btn">ログイン</a>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="talk-page"><div className="talk-loading">Loading...</div></div>;
  }

  return (
    <div className="talk-page">
      {/* Header */}
      <div className="talk-header">
        <div className="talk-header-left">
          {character && (
            <>
              <img src={character.avatar_url} alt={character.name} className="talk-avatar" />
              <div>
                <h2 className="talk-char-name">{character.name}</h2>
                <span className="talk-streak-badge">
                  Day {session?.streak_day ?? 1} · {session?.message_count ?? 0}/5 messages
                </span>
              </div>
            </>
          )}
        </div>
        <button className="talk-char-switch" onClick={() => setShowCharSelect(true)}>
          Change
        </button>
      </div>

      {/* Streak info */}
      <div className="talk-streak-bar">
        <span>🔥 Streak: {streak.current_streak} days</span>
        <span>Best: {streak.longest_streak}</span>
        <span>Reward: +{(session?.base_reward ?? 2) + (session?.bonus_reward ?? 0)} credits</span>
      </div>

      {/* Messages */}
      <div className="talk-messages" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="talk-empty">
            <p>Say hello to start today&apos;s conversation!</p>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} className={`talk-msg ${msg.role === 'user' ? 'talk-msg-user' : 'talk-msg-ai'}`}>
            {msg.role === 'assistant' && character && (
              <img src={character.avatar_url} alt="" className="talk-msg-avatar" />
            )}
            <div className="talk-msg-bubble">{msg.content}</div>
          </div>
        ))}
        {sending && (
          <div className="talk-msg talk-msg-ai">
            {character && <img src={character.avatar_url} alt="" className="talk-msg-avatar" />}
            <div className="talk-msg-bubble talk-typing">
              <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="talk-input-area">
        <input
          className="talk-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder={session?.completed ? "Today's goal complete! Keep chatting..." : "Type a message..."}
          disabled={sending}
        />
        <button className="talk-send-btn" onClick={sendMessage} disabled={sending || !input.trim()}>
          Send
        </button>
      </div>

      {/* Progress bar */}
      <div className="talk-progress">
        <div className="talk-progress-bar" style={{ width: `${Math.min(100, ((session?.message_count ?? 0) / 5) * 100)}%` }} />
        <span className="talk-progress-label">
          {session?.completed ? '✅ Complete!' : `${session?.message_count ?? 0}/5`}
        </span>
      </div>

      {/* Reward animation */}
      {showReward && (
        <div className="talk-reward-toast">
          🎉 +{rewardAmount} credits earned!
        </div>
      )}

      {/* Character select modal */}
      {showCharSelect && (
        <div className="talk-modal-overlay" onClick={() => setShowCharSelect(false)}>
          <div className="talk-modal" onClick={e => e.stopPropagation()}>
            <h3>Choose your companion</h3>
            <div className="talk-char-grid">
              {characters.map(c => (
                <button
                  key={c.id}
                  className={`talk-char-card ${character?.id === c.id ? 'active' : ''}`}
                  onClick={() => selectCharacter(c.id)}
                >
                  <img src={c.avatar_url} alt={c.name} />
                  <span className="talk-char-card-name">{c.name}</span>
                  <span className="talk-char-card-desc">{c.description}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
