'use client';

import React, { useRef, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/useTranslation';
import type { FetishTag } from '@/lib/types';

const ACTION_IDS: { id: FetishTag; emoji: string; tagKey: string }[] = [
    { id: 'fellatio',   emoji: '💋', tagKey: 'tags.fetFellatio' },
    { id: 'cowgirl',    emoji: '🔥', tagKey: 'tags.fetCowgirl' },
    { id: 'missionary', emoji: '❤️', tagKey: 'tags.fetMissionary' },
    { id: 'doggy',      emoji: '🌙', tagKey: 'tags.fetDoggy' },
    { id: 'standing',   emoji: '⚡', tagKey: 'tags.fetStanding' },
    { id: 'kiss',       emoji: '😘', tagKey: 'tags.fetKiss' },
    { id: 'handjob',    emoji: '🤲', tagKey: 'tags.fetHandjob' },
    { id: 'paizuri',    emoji: '💎', tagKey: 'tags.fetPaizuri' },
    { id: 'insertion',  emoji: '🎯', tagKey: 'tags.fetInsertion' },
];

const DURATION_OPTIONS = [
    { value: 5, label: '5s', credits: 10 },
    { value: 8, label: '8s', credits: 16 },
];

export default function Img2VidPanel() {
    const { settings, updateSettings, isGenerating, setIsGenerating, tagSettings, toggleFetishTag, user, setImg2vidImageUrl, img2vidImageUrl, addMessage, activeChatId, createChat } = useAppStore();
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const { t } = useTranslation();

    const handleGenerate = async () => {
        if (!uploadedImageUrl || !selectedAction || isGenerating) return;
        setIsGenerating(true);
        setErrorMsg(null);
        setVideoUrl(null);
        try {
            const token = window.localStorage.getItem('auth_token') ?? '';
            const actionTag = selectedAction ? ({
                fellatio: 'blowjob, oral sex',
                cowgirl: 'cowgirl position, riding on top',
                insertion: 'penetration, vaginal insertion',
                kiss: 'passionate kissing',
                missionary: 'missionary position',
                doggy: 'doggy style, from behind',
                standing: 'standing sex position',
                handjob: 'handjob, stroking penis',
                paizuri: 'paizuri, titjob',
            } as Record<string, string>)[selectedAction.id] : '';

            const res = await fetch('/api/video', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify({
                    imageBase64: img2vidImageUrl ?? '',
                    prompt: '',
                    actionTag,
                    duration: settings.duration ?? 5,
                    model: 'wan-2.1',
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                setErrorMsg(data.error || t('vid.generateFailed'));
            } else {
                setVideoUrl(data.videoUrl);
                const chatId = activeChatId || createChat();
                addMessage(chatId, {
                    role: 'assistant',
                    content: '',
                    videoUrl: data.videoUrl,
                    generationType: 'img2vid',
                    model: settings.model,
                    isFavorite: false,
                    settings: { ...settings },
                });
            }
        } catch (err) {
            setErrorMsg(t('vid.errorOccurred'));
        } finally {
            setIsGenerating(false);
        }
    };

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
    const [stripFirst, setStripFirst] = useState(false);
    const [addSound, setAddSound] = useState(false);
    const [showActionModal, setShowActionModal] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);

    const selectedAction = ACTION_IDS.find(a => tagSettings.fetish.includes(a.id));
    const canGenerate = !!uploadedImageUrl;

    const handleFile = (file: File) => {
        if (!file.type.startsWith('image/')) return;
        const url = URL.createObjectURL(file);
        setUploadedImageUrl(url);
        updateSettings({ referenceImageUrl: url });
        const reader = new FileReader();
        reader.onload = (e) => setImg2vidImageUrl(e.target?.result as string ?? null);
        reader.readAsDataURL(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
    };

    const handleRemoveImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setUploadedImageUrl(null);
        updateSettings({ referenceImageUrl: undefined });
        setImg2vidImageUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleActionSelect = (id: FetishTag) => {
        tagSettings.fetish.forEach(f => { if (f !== id) toggleFetishTag(f); });
        if (!tagSettings.fetish.includes(id)) toggleFetishTag(id);
        setShowActionModal(false);
    };

    return (
        <>
            <aside className="img2vid-panel">
                <div className="vid-model-header">
                    <div className="vid-model-thumbnail">
                        <div className="vid-model-thumbnail-overlay" />
                        <div className="vid-play-icon">▶</div>
                    </div>
                    <div className="vid-model-info">
                        <span className="vid-model-label">{t('editor.model')}</span>
                        <span className="vid-model-name">▷ {t('vid.modelName')}</span>
                    </div>
                    <button className="vid-model-chevron">∨</button>
                </div>

                <div className="img2vid-panel-scroll">
                    <div
                        className={`vid-upload-zone ${isDragOver ? 'drag-over' : ''} ${uploadedImageUrl ? 'has-image' : ''}`}
                        onClick={() => !uploadedImageUrl && fileInputRef.current?.click()}
                        onDrop={handleDrop}
                        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                        onDragLeave={() => setIsDragOver(false)}
                    >
                        {uploadedImageUrl ? (
                            <div className="vid-upload-preview">
                                <img src={uploadedImageUrl} alt="uploaded" className="vid-upload-img" />
                                <div className="vid-upload-overlay" />
                                <button className="vid-upload-remove" onClick={handleRemoveImage}>✕</button>
                                <div className="vid-upload-badge">✓ {t('vid.uploaded')}</div>
                            </div>
                        ) : (
                            <div className="vid-upload-empty">
                                <div className="vid-upload-icon">↑</div>
                                <div className="vid-upload-text">{t('vid.upload')}</div>
                                <div className="vid-upload-sub">JPG / PNG / WebP</div>
                            </div>
                        )}
                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} hidden />
                    </div>

                    <div className="vid-option-row vid-action-row" onClick={() => setShowActionModal(true)} style={{ cursor: 'pointer' }}>
                        <div className="vid-option-left">
                            <span className="vid-option-icon">🎬</span>
                            <span className="vid-option-label">
                                {selectedAction ? (
                                    <span style={{ color: 'var(--text-accent)' }}>{selectedAction.emoji} {t(selectedAction.tagKey)}</span>
                                ) : (
                                    <span>{t('vid.actionPose')} <span style={{ color: 'var(--error)', fontSize: '0.72rem', marginLeft: '4px' }}>{t('vid.required')}</span></span>
                                )}
                            </span>
                        </div>
                        <span className="vid-option-chevron">∨</span>
                    </div>

                    <div className="vid-option-row">
                        <div className="vid-option-left">
                            <span className="vid-option-icon">👙</span>
                            <span className="vid-option-label">{t('vid.stripFirst')}</span>
                        </div>
                        <button className={`vid-toggle ${stripFirst ? 'on' : ''}`} onClick={() => setStripFirst(!stripFirst)}>
                            <span className="vid-toggle-thumb" />
                        </button>
                    </div>

                    <div className="vid-option-row">
                        <div className="vid-option-left">
                            <span className="vid-option-icon">⏱</span>
                            <span className="vid-option-label">{t('vid.duration')}</span>
                        </div>
                        <div className="vid-duration-group">
                            {DURATION_OPTIONS.map(d => (
                                <button key={d.value} className={`vid-duration-btn ${settings.duration === d.value ? 'active' : ''}`} onClick={() => updateSettings({ duration: d.value })}>
                                    {d.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="vid-option-row" style={{ opacity: 0.4, pointerEvents: 'none' }}>
                        <div className="vid-option-left">
                            <span className="vid-option-icon">✨</span>
                            <span className="vid-option-label">{t('vid.enhancement')}</span>
                        </div>
                        <span className="vid-option-chevron">∨</span>
                    </div>

                    <div className="vid-option-row">
                        <div className="vid-option-left">
                            <span className="vid-option-icon">🔊</span>
                            <span className="vid-option-label">{t('vid.addSound')}</span>
                        </div>
                        <button className={`vid-toggle ${addSound ? 'on' : ''}`} onClick={() => setAddSound(!addSound)}>
                            <span className="vid-toggle-thumb" />
                        </button>
                    </div>

                    <div className="vid-option-row vid-prompt-row">
                        <div className="vid-option-left" style={{ width: '100%', flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span className="vid-option-icon">✏️</span>
                                <span className="vid-option-label">{t('vid.editPrompt')}</span>
                            </div>
                            <textarea
                                className="vid-prompt-textarea"
                                placeholder={t('vid.promptPlaceholder')}
                                rows={3}
                                style={{ width: '100%' }}
                            />
                        </div>
                    </div>

                    <div className="vid-actions">
                        <button
                            className={"vid-generate-btn" + (canGenerate && !isGenerating ? " active" : "")}
                            disabled={!canGenerate || isGenerating}
                            onClick={handleGenerate}
                        >
                            {isGenerating ? t('vid.generating') : `✨ ${t('vid.generate')}`}
                        </button>
                    </div>
                    {!uploadedImageUrl && <p className="vid-hint">↑ {t('vid.uploadHint')}</p>}
                    {uploadedImageUrl && !selectedAction && <p className="vid-hint vid-hint--warn">↑ {t('vid.selectAction')}</p>}
                    {errorMsg && <p className="vid-hint vid-hint--warn">⚠️ {errorMsg}</p>}

                </div>
            </aside>

            {showActionModal && (
                <div className="vid-modal-backdrop" onClick={() => setShowActionModal(false)}>
                    <div className="vid-modal" onClick={e => e.stopPropagation()}>
                        <div className="vid-modal-header">
                            <span>🎬 {t('vid.actionPose')}</span>
                            <button className="vid-modal-close" onClick={() => setShowActionModal(false)}>✕</button>
                        </div>
                        <div className="vid-modal-body">
                            {ACTION_IDS.map(action => {
                                const isSelected = tagSettings.fetish.includes(action.id);
                                return (
                                    <button key={action.id} className={`vid-action-item ${isSelected ? 'selected' : ''}`} onClick={() => handleActionSelect(action.id)}>
                                        <span className="vid-action-emoji">{action.emoji}</span>
                                        <span className="vid-action-label">{t(action.tagKey)}</span>
                                        <span className="vid-action-badge">{t('vid.free')}</span>
                                        {isSelected && <span className="vid-action-check">✓</span>}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="vid-modal-footer">
                            <span className="vid-modal-count">{t('vid.selectedCount', { count: String(tagSettings.fetish.length) })}</span>
                            <button className="vid-modal-done" onClick={() => setShowActionModal(false)}>{t('vid.done')}</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
