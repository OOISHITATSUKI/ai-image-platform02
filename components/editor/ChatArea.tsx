'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/useTranslation';
import type { MediaFilter } from '@/lib/types';

// ── Uploaded image slot ──
interface UploadSlot {
    file: File;
    previewUrl: string;
    label: string;
}

const MAX_UPLOADS = 4;

export default function ChatArea() {
    const {
        chats,
        activeChatId,
        createChat,
        addMessage,
        toggleFavorite,
        mediaFilter,
        setMediaFilter,
        isGenerating,
        setIsGenerating,
        settings,
        settingsPanelVisible,
        toggleSettingsPanel,
    } = useAppStore();

    const { t } = useTranslation();
    const [inputText, setInputText] = useState('');
    // BUG-02: multi-image support
    const [uploads, setUploads] = useState<UploadSlot[]>([]);
    const [faceSwapMode, setFaceSwapMode] = useState(false);
    const [generationError, setGenerationError] = useState<string | null>(null);
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const activeChat = chats.find((c) => c.id === activeChatId) || null;

    // Show attach for modes that need images
    const showAttach = !['txt2img', 'txt2vid'].includes(settings.generationType);

    const filters: { key: MediaFilter; label: string }[] = [
        { key: 'all', label: t('chat.filterAll') },
        { key: 'images', label: t('chat.filterImages') },
        { key: 'videos', label: t('chat.filterVideos') },
        { key: 'favorites', label: `♥ ${t('chat.filterFavorites')}` },
    ];

    // Filter messages based on active filter
    const filteredMessages = activeChat?.messages.filter((msg) => {
        if (mediaFilter === 'all') return true;
        if (mediaFilter === 'images') return msg.imageUrl;
        if (mediaFilter === 'videos') return msg.videoUrl;
        if (mediaFilter === 'favorites') return msg.isFavorite;
        return true;
    }) ?? [];

    // Auto-scroll on new messages
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTo({
                top: chatContainerRef.current.scrollHeight,
                behavior: 'smooth',
            });
        }
    }, [activeChat?.messages.length, isGenerating]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
    }, [inputText]);

    // BUG-01: Reset input when switching chats
    useEffect(() => {
        setInputText('');
        setUploads([]);
        setGenerationError(null);
    }, [activeChatId]);

    // Clear files when switching to text-only mode
    useEffect(() => {
        if (!showAttach && uploads.length > 0) {
            cleanupUploads();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [settings.generationType]);

    // ── File handling ──

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        const remaining = MAX_UPLOADS - uploads.length;
        const toAdd = Array.from(files).slice(0, remaining);
        const newSlots: UploadSlot[] = toAdd.map((file, i) => ({
            file,
            previewUrl: URL.createObjectURL(file),
            label: `画像${uploads.length + i + 1}`,
        }));
        setUploads((prev) => [...prev, ...newSlots]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleRemoveUpload = (index: number) => {
        setUploads((prev) => {
            const updated = prev.filter((_, i) => i !== index);
            // Re-label
            return updated.map((slot, i) => ({ ...slot, label: `画像${i + 1}` }));
        });
    };

    const cleanupUploads = () => {
        uploads.forEach((s) => URL.revokeObjectURL(s.previewUrl));
        setUploads([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // BUG-03: Convert image to PNG via Canvas (handles WebP, AVIF, BMP, etc.)
    const convertImageToPng = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject(new Error('Canvas not supported'));
                ctx.drawImage(img, 0, 0);
                const dataUrl = canvas.toDataURL('image/png');
                const base64 = dataUrl.split(',')[1];
                resolve(base64);
            };
            img.onerror = () => reject(new Error('Failed to decode image'));
            img.src = URL.createObjectURL(file);
        });
    };

    // Convert File to base64 string — auto-converts non-JPG/PNG via Canvas
    const fileToBase64 = async (file: File): Promise<string> => {
        const safeTypes = ['image/jpeg', 'image/png'];
        if (!safeTypes.includes(file.type)) {
            // Auto-convert WebP, AVIF, BMP, etc. to PNG
            return convertImageToPng(file);
        }
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result as string;
                const base64 = result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    // BUG-03: Friendly error messages
    const friendlyError = (raw: string): string => {
        if (raw.includes('INVALID_IMAGE_FORMAT')) {
            return '❌ この画像形式には対応していません。\n対応形式：JPG、PNG\n対処法：画像をJPGまたはPNGに変換してから再度アップロードしてください。';
        }
        return raw;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim() && uploads.length === 0) return;

        setGenerationError(null);

        // Ensure we have a chat
        let chatId = activeChatId;
        if (!chatId) {
            chatId = createChat();
        }

        // Add user message (show first uploaded image as preview)
        addMessage(chatId, {
            role: 'user',
            content: inputText.trim(),
            imageUrl: uploads[0]?.previewUrl ?? undefined,
            isFavorite: false,
        });

        const userPrompt = inputText.trim();
        const currentUploads = [...uploads];
        setInputText('');
        setUploads([]);
        if (fileInputRef.current) fileInputRef.current.value = '';

        // Check generation type
        const isImageGeneration = ['txt2img', 'img2img', 'img_edit'].includes(settings.generationType);
        const isVideoGeneration = ['txt2vid', 'img2vid', 'ref2vid', 'vid2vid'].includes(settings.generationType);

        setIsGenerating(true);

        if (isImageGeneration) {
            try {
                // Convert files to base64 for img2img / img_edit
                let imageBase64: string | undefined;
                let additionalImages: string[] | undefined;
                if (currentUploads.length > 0 && settings.generationType !== 'txt2img') {
                    imageBase64 = await fileToBase64(currentUploads[0].file);
                    if (currentUploads.length > 1) {
                        additionalImages = await Promise.all(
                            currentUploads.slice(1).map((s) => fileToBase64(s.file))
                        );
                    }
                }

                const res = await fetch('/api/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        prompt: userPrompt,
                        modelId: settings.model,
                        generationType: settings.generationType,
                        aspectRatio: settings.aspectRatio,
                        resolution: settings.resolution,
                        count: settings.count,
                        qualityPreset: settings.qualityPreset,
                        imageBase64,
                        additionalImages,
                        faceSwapMode,
                    }),
                });

                const data = await res.json();

                if (!res.ok || data.error) {
                    throw new Error(data.error || `API error: ${res.status}`);
                }

                // Add AI response for each generated image
                const images = data.images || [];
                if (images.length === 0) {
                    throw new Error('No images returned from API');
                }

                for (const img of images) {
                    addMessage(chatId, {
                        role: 'assistant',
                        content: `Generated from: "${userPrompt || 'uploaded reference'}"`,
                        imageUrl: img.url,
                        generationType: settings.generationType,
                        model: settings.model,
                        isFavorite: false,
                        settings: { ...settings },
                    });
                }
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : 'Unknown error';
                const friendly = friendlyError(errorMsg);
                setGenerationError(friendly);
                addMessage(chatId, {
                    role: 'assistant',
                    content: `❌ Generation failed: ${friendly}`,
                    isFavorite: false,
                });
            }
        } else if (isVideoGeneration) {
            // Video generation is still mock for now
            await new Promise((r) => setTimeout(r, 2500 + Math.random() * 2000));
            addMessage(chatId, {
                role: 'assistant',
                content: `Here's your video based on: "${userPrompt || 'uploaded reference'}" (mock — video API not yet connected)`,
                videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                generationType: settings.generationType,
                model: settings.model,
                isFavorite: false,
                settings: { ...settings },
            });
        }

        setIsGenerating(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    const formatTime = (ts: number) => {
        const d = new Date(ts);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Download an image from a URL as PNG via server-side proxy
    const handleDownload = (url: string) => {
        // Direct download via a hidden anchor tag.
        // This is the most reliable way to preserve the filename and extension
        // provided by the server headers (Content-Disposition).
        const downloadUrl = `/api/download?url=${encodeURIComponent(url)}`;
        const a = document.createElement('a');
        a.href = downloadUrl;
        // The 'download' attribute here is a fallback, 
        // the server header 'Content-Disposition' will take precedence.
        a.setAttribute('download', '');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <section className="chat-area">
            {/* Filter Tabs + Settings Toggle */}
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
                {!settingsPanelVisible && (
                    <button
                        className="settings-toggle-btn"
                        onClick={toggleSettingsPanel}
                        style={{ marginLeft: 'auto' }}
                    >
                        ⚙️ {t('editor.showSettings')}
                    </button>
                )}
            </div>

            {/* Error Banner */}
            {generationError && (
                <div style={{
                    padding: '10px 16px',
                    background: 'rgba(255,60,60,0.15)',
                    borderBottom: '1px solid rgba(255,60,60,0.3)',
                    color: '#ff6b6b',
                    fontSize: '0.85rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    whiteSpace: 'pre-line',
                }}>
                    <span>{generationError}</span>
                    <button
                        onClick={() => setGenerationError(null)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#ff6b6b',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            flexShrink: 0,
                        }}
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Messages */}
            <div className="chat-messages" ref={chatContainerRef}>
                {!activeChat || filteredMessages.length === 0 ? (
                    <div className="chat-empty-state">
                        <div className="empty-icon">🎨</div>
                        <h3>{t('chat.empty')}</h3>
                        <p>{t('chat.emptyDesc')}</p>
                    </div>
                ) : (
                    filteredMessages.map((msg) => (
                        <div key={msg.id} className={`message-bubble ${msg.role}`}>
                            <div className="message-role">
                                {msg.role === 'user' ? 'You' : 'AI'}
                            </div>
                            <div className="message-body">
                                {msg.content && <div>{msg.content}</div>}
                                {msg.translatedPrompt && msg.role === 'assistant' && (
                                    <div style={{
                                        fontSize: '0.75rem',
                                        color: 'var(--text-tertiary)',
                                        marginTop: 6,
                                        fontStyle: 'italic',
                                    }}>
                                        Prompt: {msg.translatedPrompt}
                                    </div>
                                )}
                                {msg.imageUrl && (
                                    <div className="message-image-wrapper">
                                        <img
                                            src={msg.imageUrl}
                                            alt="Generated content"
                                            style={{ maxWidth: msg.role === 'user' ? 200 : 400, cursor: 'pointer' }}
                                            onClick={() => setLightboxUrl(msg.imageUrl!)}
                                        />
                                        <button
                                            className="image-download-btn"
                                            onClick={(e) => { e.stopPropagation(); handleDownload(msg.imageUrl!); }}
                                            title="Download"
                                        >
                                            ⬇
                                        </button>
                                    </div>
                                )}
                                {msg.videoUrl && (
                                    <video
                                        src={msg.videoUrl}
                                        controls
                                        autoPlay
                                        loop
                                        muted
                                        style={{ maxWidth: 500 }}
                                    />
                                )}
                            </div>
                            <div className="message-meta">
                                <span>{formatTime(msg.timestamp)}</span>
                                {msg.model && <span>• {msg.model}</span>}
                                {msg.generationType && <span>• {msg.generationType}</span>}
                            </div>
                            {msg.role === 'assistant' && (
                                <div className="message-actions">
                                    <button
                                        className={`msg-action-btn ${msg.isFavorite ? 'favorite-active' : ''}`}
                                        onClick={() => activeChatId && toggleFavorite(activeChatId, msg.id)}
                                    >
                                        {msg.isFavorite ? '❤️' : '🤍'} {t('actions.favorite')}
                                    </button>
                                    {msg.imageUrl && (
                                        <button className="msg-action-btn">🎬 {t('actions.generateVideo')}</button>
                                    )}
                                    {msg.videoUrl && (
                                        <button className="msg-action-btn">🖼️ {t('actions.generateImage')}</button>
                                    )}
                                    <button className="msg-action-btn">🔄 {t('actions.regenerate')}</button>
                                    <button className="msg-action-btn">✏️ {t('actions.edit')}</button>
                                </div>
                            )}
                        </div>
                    ))
                )}

                {/* Generating Indicator */}
                {isGenerating && (
                    <div className="generating-indicator">
                        <div className="generating-dots">
                            <span /><span /><span />
                        </div>
                        <span className="generating-text">{t('editor.generating')}</span>
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="chat-input-container">
                <div className="chat-input-wrapper">
                    {/* BUG-02: Multi-image upload thumbnails */}
                    {uploads.length > 0 && (
                        <div className="upload-thumbnails">
                            {uploads.map((slot, i) => (
                                <div key={i} className="upload-thumb">
                                    <img src={slot.previewUrl} alt={slot.label} />
                                    <span className="upload-thumb-label">{slot.label}</span>
                                    <button
                                        className="upload-thumb-remove"
                                        onClick={() => handleRemoveUpload(i)}
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Attach + input row */}
                    {showAttach && (
                        <div className="chat-input-tools">
                            <button
                                className="input-tool-btn"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploads.length >= MAX_UPLOADS}
                            >
                                📎 {t('chat.attachFile')} ({uploads.length}/{MAX_UPLOADS})
                            </button>
                            <button
                                className={`input-tool-btn face-swap-btn ${faceSwapMode ? 'active' : ''}`}
                                onClick={() => setFaceSwapMode((v) => !v)}
                                title={t('chat.faceSwap')}
                            >
                                🔄 {t('chat.faceSwap')}
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleFileChange}
                                hidden
                            />
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ position: 'relative' }}>
                        <textarea
                            ref={textareaRef}
                            className="chat-textarea"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={faceSwapMode && uploads.length > 0
                                ? t('chat.faceSwapHint')
                                : uploads.length > 0
                                    ? t('chat.imageRefHint')
                                    : t('chat.placeholder')
                            }
                            rows={1}
                            disabled={isGenerating}
                        />
                        <button
                            type="submit"
                            className="send-btn"
                            disabled={isGenerating || (!inputText.trim() && uploads.length === 0)}
                        >
                            ▶
                        </button>
                    </form>
                </div>
            </div>

            {/* Lightbox Overlay */}
            {lightboxUrl && (
                <div className="lightbox-overlay" onClick={() => setLightboxUrl(null)}>
                    <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
                        <img src={lightboxUrl} alt="Full size" />
                        <div className="lightbox-actions">
                            <button
                                className="lightbox-btn lightbox-download"
                                onClick={() => handleDownload(lightboxUrl)}
                            >
                                ⬇ Download
                            </button>
                            <button
                                className="lightbox-btn lightbox-close"
                                onClick={() => setLightboxUrl(null)}
                            >
                                ✕ Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
