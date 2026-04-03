'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/useTranslation';
import type { MediaFilter } from '@/lib/types';

const GUEST_TIPS = [
    'No watermark for registered users',
    'Save and download your creations',
    '20 free credits on signup',
    'Just email + password — 10 seconds',
];

function GuestLoadingTip() {
    const [tipIndex, setTipIndex] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => {
            setTipIndex(i => (i + 1) % GUEST_TIPS.length);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="guest-loading-tip" style={{ marginTop: 16, textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: 4 }}>💡 Did you know?</div>
            <div style={{ fontSize: '0.85rem', color: '#a78bfa' }}>
                ✅ {GUEST_TIPS[tipIndex]}
            </div>
            <a href="/register" style={{ fontSize: '0.8rem', color: '#7c5cfc', textDecoration: 'none', marginTop: 6, display: 'inline-block' }}>
                → Unlock for Free (10 seconds)
            </a>
        </div>
    );
}

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

function GuestImageCountdown({ createdAt }: { createdAt: number }) {
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 60_000);
        return () => clearInterval(interval);
    }, []);

    const expiresAt = createdAt + TWENTY_FOUR_HOURS_MS;
    const remaining = expiresAt - now;

    if (remaining <= 0) {
        return (
            <div style={{ padding: '6px 10px', background: '#dc262622', borderRadius: 6, fontSize: '0.75rem', color: '#f87171' }}>
                This image has expired
            </div>
        );
    }

    const hours = Math.floor(remaining / 3_600_000);
    const minutes = Math.floor((remaining % 3_600_000) / 60_000);
    const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    // Color based on urgency
    const urgencyColor = hours < 1 ? '#f87171' : hours < 6 ? '#fbbf24' : '#94a3b8';
    const urgencyBg = hours < 1 ? '#dc262615' : hours < 6 ? '#f59e0b12' : '#64748b10';

    return (
        <div style={{
            padding: '6px 10px',
            background: urgencyBg,
            borderRadius: 6,
            fontSize: '0.73rem',
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
        }}>
            <span style={{ color: urgencyColor }}>
                {'⏰'} Deleted in {timeStr}
            </span>
            <a
                href="/register"
                onClick={(e) => {
                    e.stopPropagation();
                    fetch('/api/guest/event', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ eventType: 'countdown_unlock_click' }),
                    }).catch(() => {});
                }}
                style={{
                    color: '#7c5cfc',
                    textDecoration: 'none',
                    fontWeight: 600,
                    fontSize: '0.73rem',
                }}
            >
                {'🔓'} Unlock forever — Free, 10s
            </a>
        </div>
    );
}

interface RightPanelProps {
    onOneClickGenerate: () => void;
    onSamplePrompt: (prompt: string) => void;
    onActionInpaint: (imgUrl: string) => void;
    onActionFaceSwap: (imgUrl: string) => void;
    onActionRegenerate: (imgUrl: string, prompt: string) => void;
    onSuggestionSelect?: (suggestion: string, type: 'A' | 'B' | 'C') => void;
    isGenerating: boolean;
}

export default function RightPanel({
    onOneClickGenerate, onSamplePrompt,
    onActionInpaint, onActionFaceSwap, onActionRegenerate,
    onSuggestionSelect,
    isGenerating,
}: RightPanelProps) {
    const {
        chats, activeChatId, toggleFavorite,
        mediaFilter, setMediaFilter,
        isAuthenticated,
    } = useAppStore();
    const { t } = useTranslation();

    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    const activeChat = chats.find((c) => c.id === activeChatId) || null;

    const filters: { key: MediaFilter; label: string }[] = [
        { key: 'all', label: t('chat.filterAll') },
        { key: 'images', label: t('chat.filterImages') },
        { key: 'videos', label: t('chat.filterVideos') },
        { key: 'favorites', label: `♥ ${t('chat.filterFavorites')}` },
    ];

    const filteredMessages = activeChat?.messages.filter((msg) => {
        if (mediaFilter === 'all') return true;
        if (mediaFilter === 'images') return msg.imageUrl;
        if (mediaFilter === 'videos') return msg.videoUrl;
        if (mediaFilter === 'favorites') return msg.isFavorite;
        return true;
    }) ?? [];

    // Only show AI messages with images/videos in the results panel
    const resultMessages = filteredMessages.filter(
        (msg) => msg.role === 'assistant' && (msg.imageUrl || msg.videoUrl)
    );

    const hasResults = resultMessages.length > 0;

    // Suggestions moved to LeftPanel

    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

    const handleDownload = (url: string) => {
        const isDataUri = url.startsWith('data:');
        if (isDataUri) {
            const a = document.createElement('a');
            a.href = url;
            a.download = `ai_image_${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } else {
            const proxyUrl = `/api/download?url=${encodeURIComponent(url)}`;
            const a = document.createElement('a');
            a.href = proxyUrl;
            a.download = `ai_image_${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    };

    const formatTime = (ts: number) => {
        const d = new Date(ts);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const SAMPLE_IMAGES = [
        '/hero/card2-after.webp',
        '/hero/card4-after.webp',
        '/hero/card5-after.webp',
        '/hero/mihon_after.webp',
    ];

    const [sampleLoadErrors, setSampleLoadErrors] = useState<Set<number>>(new Set());

    const handleEmptyStateCta = useCallback(() => {
        // Focus left panel prompt input or wizard
        const promptInput = document.querySelector('.editor-left-panel textarea, .editor-left-panel input[type="text"]') as HTMLElement | null;
        const wizard = document.querySelector('.editor-left-panel') as HTMLElement | null;
        if (promptInput) {
            promptInput.focus();
            promptInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (wizard) {
            wizard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, []);

    return (
        <section className="editor-right-panel">
            {/* Filter Tabs */}
            <div className="chat-filter-tabs">
                {filters.map((f) => (
                    <button
                        key={f.key}
                        className={`filter-tab ${mediaFilter === f.key ? 'active' : ''}`}
                        onClick={() => setMediaFilter(f.key)}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Results Area */}
            <div className="editor-results" ref={chatContainerRef}>
                {!hasResults && !isGenerating ? (
                    /* Empty State with blurred sample images */
                    <div className="editor-welcome-card">
                        <div className="welcome-samples-grid">
                            {SAMPLE_IMAGES.map((src, i) => (
                                <div key={i} className="welcome-sample-cell">
                                    {sampleLoadErrors.has(i) ? (
                                        <div className="welcome-sample-placeholder" />
                                    ) : (
                                        <img
                                            src={src}
                                            alt=""
                                            className="welcome-sample-img"
                                            onError={() => setSampleLoadErrors(prev => new Set(prev).add(i))}
                                        />
                                    )}
                                </div>
                            ))}
                            <div className="welcome-samples-overlay">
                                <span className="welcome-samples-badge">
                                    {t('editor.emptyBadge')}
                                </span>
                                <span className="welcome-samples-sub">
                                    {t('editor.emptySub')}
                                </span>
                            </div>
                        </div>

                        <button
                            className="welcome-cta-btn"
                            onClick={handleEmptyStateCta}
                        >
                            {t('editor.emptyCta')}
                        </button>
                        <p className="welcome-cta-note">
                            {t('editor.emptyCtaNote')}
                        </p>
                    </div>
                ) : (
                    /* Results Grid */
                    <div className="editor-results-grid">
                        {resultMessages.map((msg) => (
                            <div key={msg.id} className="editor-result-item">
                                {msg.imageUrl && (
                                    <div className="result-image-wrapper">
                                        <img
                                            src={msg.imageUrl}
                                            alt="Generated"
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => setLightboxUrl(msg.imageUrl!)}
                                        />
                                        <div
                                            className="result-overlay"
                                            onClick={isMobile ? undefined : () => setLightboxUrl(msg.imageUrl!)}
                                        >
                                            <div className="result-actions">
                                                <button
                                                    className="result-action-btn"
                                                    onPointerDown={(e) => e.stopPropagation()}
                                                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); setLightboxUrl(msg.imageUrl!); }}
                                                    title={t('actions.expand') || 'Expand'}
                                                >
                                                    🔍
                                                </button>
                                                <button
                                                    className="result-action-btn"
                                                    onPointerDown={(e) => e.stopPropagation()}
                                                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); activeChatId && toggleFavorite(activeChatId, msg.id); }}
                                                    title={t('actions.favorite')}
                                                >
                                                    {msg.isFavorite ? '❤️' : '🤍'}
                                                </button>
                                                {isAuthenticated ? (
                                                    <button
                                                        className="result-action-btn"
                                                        onPointerDown={(e) => e.stopPropagation()}
                                                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleDownload(msg.imageUrl!); }}
                                                        title={t('actions.download')}
                                                    >
                                                        ⬇
                                                    </button>
                                                ) : (
                                                    <button
                                                        className="result-action-btn"
                                                        onPointerDown={(e) => e.stopPropagation()}
                                                        onClick={(e) => {
                                                            e.stopPropagation(); e.preventDefault();
                                                            fetch('/api/guest/event', {
                                                                method: 'POST',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({ eventType: 'unlock_click' }),
                                                            }).catch(() => {});
                                                            window.location.href = '/register';
                                                        }}
                                                        title="Unlock to download"
                                                        style={{ fontSize: '0.65rem' }}
                                                    >
                                                        🔓
                                                    </button>
                                                )}
                                                <button
                                                    className="result-action-btn"
                                                    onPointerDown={(e) => e.stopPropagation()}
                                                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); onActionInpaint(msg.imageUrl!); }}
                                                    title={t('chat.actionInpaint')}
                                                >
                                                    🖌
                                                </button>
                                                <button
                                                    className="result-action-btn"
                                                    onPointerDown={(e) => e.stopPropagation()}
                                                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); onActionFaceSwap(msg.imageUrl!); }}
                                                    title={t('chat.actionFaceSwap')}
                                                >
                                                    🔄
                                                </button>
                                                <button
                                                    className="result-action-btn"
                                                    onPointerDown={(e) => e.stopPropagation()}
                                                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); onActionRegenerate(msg.imageUrl!, msg.content.replace(/^Generated from: "(.*)"$/, '$1')); }}
                                                    title={t('actions.regenerate')}
                                                >
                                                    🔃
                                                </button>
                                            </div>
                                        </div>
                                        <div
  className="result-time"
  title={(() => {
    const ttl = isAuthenticated ? 3600000 : TWENTY_FOUR_HOURS_MS;
    const exp = new Date(msg.timestamp + ttl);
    const minLeft = Math.round((msg.timestamp + ttl - Date.now()) / 60000);
    return minLeft > 0
      ? t('editor.imageExpiresAt', { time: exp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })
        + ' · ' + t('editor.imageExpiresIn', { min: String(minLeft) })
      : t('editor.imageExpiresAt', { time: exp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
  })()}
>
  {formatTime(msg.timestamp)}
</div>
                                    </div>
                                )}
                                {!isAuthenticated && msg.imageUrl && msg.role === 'assistant' && (
                                    <GuestImageCountdown createdAt={msg.timestamp} />
                                )}
                                {msg.videoUrl && (
                                    <div className="result-video-wrapper">
                                        <video src={msg.videoUrl} controls autoPlay loop muted />
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Generating Indicator */}
                        {isGenerating && (
                            <div style={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                minHeight: '300px', gap: '16px', padding: '40px 20px',
                                background: 'var(--bg-card, #1a1a2e)', borderRadius: '16px',
                                border: '1px solid rgba(124,92,252,0.3)',
                            }}>
                                <div style={{
                                    width: 56, height: 56,
                                    border: '4px solid rgba(124,92,252,0.2)',
                                    borderTopColor: '#7c5cfc',
                                    borderRadius: '50%',
                                    animation: 'spin 0.8s linear infinite',
                                }} />
                                <p style={{ color: '#e0e0e8', fontSize: '1.1rem', fontWeight: 700, margin: 0, textAlign: 'center' }}>
                                    {t('editor.generating')}
                                </p>
                                <p style={{ color: '#8b8ba7', fontSize: '0.82rem', margin: 0, textAlign: 'center' }}>
                                    AI is creating your image... (~15-40 sec)
                                </p>
                                {!isAuthenticated && <GuestLoadingTip />}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Lightbox */}
            {lightboxUrl && (
                <div className="lightbox-overlay" onClick={() => setLightboxUrl(null)}>
                    <button
                        className="lightbox-back-btn"
                        onClick={() => setLightboxUrl(null)}
                    >
                        ← {t('actions.back') || 'Back'}
                    </button>
                    <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
                        <img src={lightboxUrl} alt="Full size" />
                        <div className="lightbox-actions">
                            {isAuthenticated ? (
                                <button
                                    className="lightbox-btn lightbox-download"
                                    onClick={() => handleDownload(lightboxUrl)}
                                >
                                    ⬇ {t('actions.download')}
                                </button>
                            ) : (
                                <button
                                    className="lightbox-btn lightbox-download"
                                    onClick={() => {
                                        fetch('/api/guest/event', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ eventType: 'unlock_click' }),
                                        }).catch(() => {});
                                        window.location.href = '/register';
                                    }}
                                    style={{ background: 'linear-gradient(135deg, #7c5cfc, #6366f1)' }}
                                >
                                    🔓 Unlock This Image — Free, 10 seconds
                                </button>
                            )}
                            <button
                                className="lightbox-btn lightbox-close"
                                onClick={() => setLightboxUrl(null)}
                            >
                                ✕ {t('auth.closeModal')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
