'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/useTranslation';
import type { MediaFilter } from '@/lib/types';

interface RightPanelProps {
    onOneClickGenerate: () => void;
    onSamplePrompt: (prompt: string) => void;
    onActionInpaint: (imgUrl: string) => void;
    onActionFaceSwap: (imgUrl: string) => void;
    onActionRegenerate: (imgUrl: string, prompt: string) => void;
    isGenerating: boolean;
}

export default function RightPanel({
    onOneClickGenerate, onSamplePrompt,
    onActionInpaint, onActionFaceSwap, onActionRegenerate,
    isGenerating,
}: RightPanelProps) {
    const {
        chats, activeChatId, toggleFavorite,
        mediaFilter, setMediaFilter,
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

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTo({
                top: chatContainerRef.current.scrollHeight,
                behavior: 'smooth',
            });
        }
    }, [resultMessages.length, isGenerating]);

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

    const samplePrompts = [
        t('editor.welcomeSample1'),
        t('editor.welcomeSample2'),
        t('editor.welcomeSample3'),
    ];

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
                    /* Welcome Card */
                    <div className="editor-welcome-card">
                        <div className="welcome-icon">🎨</div>
                        <h2 className="welcome-title">{t('editor.welcomeTitle')}</h2>

                        <button
                            className="welcome-oneclick-btn"
                            onClick={onOneClickGenerate}
                            disabled={isGenerating}
                        >
                            ✨ {t('editor.welcomeOneClick')}
                        </button>

                        <p className="welcome-description">{t('editor.welcomeDescription')}</p>

                        <div className="welcome-divider" />

                        <p className="welcome-or-try">{t('editor.welcomeOrTry')}</p>

                        <div className="welcome-samples">
                            {samplePrompts.map((prompt, i) => (
                                <button
                                    key={i}
                                    className="welcome-sample-btn"
                                    onClick={() => onSamplePrompt(prompt)}
                                >
                                    💡 {prompt}
                                </button>
                            ))}
                        </div>
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
                                            onClick={() => setLightboxUrl(msg.imageUrl!)}
                                        />
                                        <div className="result-overlay">
                                            <div className="result-actions">
                                                <button
                                                    className={`result-action-btn ${msg.isFavorite ? 'favorite-active' : ''}`}
                                                    onClick={() => activeChatId && toggleFavorite(activeChatId, msg.id)}
                                                    title={t('actions.favorite')}
                                                >
                                                    {msg.isFavorite ? '❤️' : '🤍'}
                                                </button>
                                                <button
                                                    className="result-action-btn"
                                                    onClick={() => handleDownload(msg.imageUrl!)}
                                                    title={t('actions.download')}
                                                >
                                                    ⬇
                                                </button>
                                                <button
                                                    className="result-action-btn"
                                                    onClick={() => onActionInpaint(msg.imageUrl!)}
                                                    title={t('chat.actionInpaint')}
                                                >
                                                    🖌
                                                </button>
                                                <button
                                                    className="result-action-btn"
                                                    onClick={() => onActionFaceSwap(msg.imageUrl!)}
                                                    title={t('chat.actionFaceSwap')}
                                                >
                                                    🔄
                                                </button>
                                                <button
                                                    className="result-action-btn"
                                                    onClick={() => onActionRegenerate(msg.imageUrl!, msg.content.replace(/^Generated from: "(.*)"$/, '$1'))}
                                                    title={t('actions.regenerate')}
                                                >
                                                    🔃
                                                </button>
                                            </div>
                                        </div>
                                        <div
  className="result-time"
  title={(() => {
    const exp = new Date(msg.timestamp + 3600000);
    const minLeft = Math.round((msg.timestamp + 3600000 - Date.now()) / 60000);
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
                                {msg.videoUrl && (
                                    <div className="result-video-wrapper">
                                        <video src={msg.videoUrl} controls autoPlay loop muted />
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Generating Indicator */}
                        {isGenerating && (
                            <div className="editor-result-item generating-placeholder">
                                <div className="generating-indicator">
                                    <div className="generating-dots">
                                        <span /><span /><span />
                                    </div>
                                    <span className="generating-text">{t('editor.generating')}</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Lightbox */}
            {lightboxUrl && (
                <div
                    className="lightbox-overlay"
                    onClick={() => setLightboxUrl(null)}
                >
                    <img src={lightboxUrl} alt="Full size" className="lightbox-image" />
                    <button className="lightbox-close" onClick={() => setLightboxUrl(null)}>✕</button>
                    <button
                        className="lightbox-download"
                        onClick={(e) => { e.stopPropagation(); handleDownload(lightboxUrl); }}
                    >
                        ⬇ {t('actions.download')}
                    </button>
                </div>
            )}
        </section>
    );
}
