'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/useTranslation';
import { AVAILABLE_MODELS } from '@/lib/types';
import type {
    AspectRatio, Resolution, AgeTag, PeopleCountTag, EthnicityTag,
    StylePresetTag, HairColorTag, HairStyleTag, CompositionTag, FetishTag,
    GenerationType,
} from '@/lib/types';
import InpaintModal from './InpaintModal';

interface UploadSlot {
    file: File;
    previewUrl: string;
    label: string;
    maskBase64?: string;
}

const MAX_UPLOADS = 4;

interface LeftPanelProps {
    inputText: string;
    setInputText: (v: string) => void;
    uploads: UploadSlot[];
    setUploads: React.Dispatch<React.SetStateAction<UploadSlot[]>>;
    faceSwapMode: boolean;
    setFaceSwapMode: (v: boolean) => void;
    inpaintMode: boolean;
    setInpaintMode: (v: boolean) => void;
    reposeMode: boolean;
    setReposeMode: (v: boolean) => void;
    showInpaintModal: boolean;
    setShowInpaintModal: (v: boolean) => void;
    onSubmit: (e: React.FormEvent) => void;
    isGenerating: boolean;
}

export default function LeftPanel({
    inputText, setInputText, uploads, setUploads,
    faceSwapMode, setFaceSwapMode, inpaintMode, setInpaintMode,
    reposeMode, setReposeMode, showInpaintModal, setShowInpaintModal,
    onSubmit, isGenerating,
}: LeftPanelProps) {
    const {
        settings, updateSettings, tagSettings, updateTagSettings,
        toggleFetishTag, user, setGenerationType,
    } = useAppStore();
    const { t } = useTranslation();

    const [showFaceSwapModal, setShowFaceSwapModal] = useState(false);
    const [showInpaintModal2, setShowInpaintModal2] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Collapsible sections - read from localStorage
    const [settingsExpanded, setSettingsExpanded] = useState(() => {
        if (typeof window === 'undefined') return false;
        return localStorage.getItem('editor.settings.expanded') === 'true';
    });
    const [tagsExpanded, setTagsExpanded] = useState(() => {
        if (typeof window === 'undefined') return false;
        return localStorage.getItem('editor.tags.expanded') === 'true';
    });

    // Placeholder animation
    const [placeholderIndex, setPlaceholderIndex] = useState(0);
    const [placeholderVisible, setPlaceholderVisible] = useState(true);
    const placeholderKeys = ['editor.placeholder1', 'editor.placeholder2', 'editor.placeholder3', 'editor.placeholder4'];

    useEffect(() => {
        const interval = setInterval(() => {
            setPlaceholderVisible(false);
            setTimeout(() => {
                setPlaceholderIndex((prev) => (prev + 1) % placeholderKeys.length);
                setPlaceholderVisible(true);
            }, 300);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    // Persist collapsible state
    useEffect(() => {
        localStorage.setItem('editor.settings.expanded', String(settingsExpanded));
    }, [settingsExpanded]);
    useEffect(() => {
        localStorage.setItem('editor.tags.expanded', String(tagsExpanded));
    }, [tagsExpanded]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
    }, [inputText]);

    // Consent state for img2img
    const [img2imgConsent, setImg2imgConsent] = useState<boolean[]>([false, false, false, false, false]);
    const allConsentChecked = img2imgConsent.every(Boolean);

    const isImageMode = ['txt2img', 'img2img', 'img_edit'].includes(settings.generationType);
    const isVideoMode = ['txt2vid', 'img2vid', 'ref2vid', 'vid2vid'].includes(settings.generationType);

    const filteredModels = AVAILABLE_MODELS.filter((m) =>
        isImageMode ? m.type === 'image' : m.type === 'video'
    );

    const aspectRatios: AspectRatio[] = ['1:1', '4:3', '3:4', '16:9', '9:16'];
    const resolutions: Resolution[] = ['512', '1024', '2K', '4K'];

    const aspectLabels: Record<string, string> = {
        '1:1': t('editor.aspectRatioValues.1:1'),
        '4:3': t('editor.aspectRatioValues.4:3'),
        '3:4': t('editor.aspectRatioValues.3:4'),
        '16:9': t('editor.aspectRatioValues.16:9'),
        '9:16': t('editor.aspectRatioValues.9:16'),
    };

    // Credit cost calculation
    let creditCost = settings.count * 1;
    if (isVideoMode) creditCost = settings.count * 5;
    else if (faceSwapMode) creditCost = settings.count * 5;
    else if (inpaintMode) creditCost = settings.count * 3;
    else if (settings.generationType === 'img2img') creditCost = settings.count * 2;

    const showAttach = !['txt2img', 'txt2vid'].includes(settings.generationType);

    // File handling
    const addFiles = (files: File[]) => {
        const remaining = MAX_UPLOADS - uploads.length;
        const toAdd = files.slice(0, remaining);
        const newSlots: UploadSlot[] = toAdd.map((file, i) => ({
            file,
            previewUrl: URL.createObjectURL(file),
            label: `画像${uploads.length + i + 1}`,
        }));

        if (uploads.length === 0 && toAdd.length > 0) {
            const firstFile = toAdd[0];
            const img = new Image();
            img.onload = () => {
                const ratio = img.width / img.height;
                let detected: AspectRatio = '1:1';
                if (ratio > 1.5) detected = '16:9';
                else if (ratio > 1.1) detected = '4:3';
                else if (ratio < 0.6) detected = '9:16';
                else if (ratio < 0.9) detected = '3:4';
                updateSettings({ aspectRatio: detected });
                URL.revokeObjectURL(img.src);
            };
            img.src = URL.createObjectURL(firstFile);
        }

        setUploads((prev) => [...prev, ...newSlots]);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        addFiles(Array.from(files));
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleRemoveUpload = (index: number) => {
        setUploads((prev) => {
            const updated = prev.filter((_, i) => i !== index);
            return updated.map((slot, i) => ({ ...slot, label: `画像${i + 1}` }));
        });
    };

    const handleSwapUploads = () => {
        if (uploads.length < 2) return;
        setUploads((prev) => {
            const swapped = [prev[1], prev[0], ...prev.slice(2)];
            return swapped.map((slot, i) => ({ ...slot, label: `画像${i + 1}` }));
        });
    };

    // Drop zone
    const [isDragOver, setIsDragOver] = useState(false);
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            addFiles(Array.from(e.dataTransfer.files));
            e.dataTransfer.clearData();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSubmit(e);
        }
    };

    const handleModeTabClick = (type: GenerationType) => {
        setGenerationType(type);
        setFaceSwapMode(false);
        setInpaintMode(false);
        setReposeMode(false);
    };

    return (
        <aside className="editor-left-panel">
            <div className="editor-left-scroll">


                {/* Face Swap Modal */}
                {showFaceSwapModal && (
                    <div className="editor-feature-modal-overlay" onClick={() => setShowFaceSwapModal(false)}>
                        <div className="editor-feature-modal" onClick={e => e.stopPropagation()}>
                            <button className="feature-modal-close" onClick={() => setShowFaceSwapModal(false)}>✕</button>
                            <div className="feature-modal-gif">
                                <div className="feature-modal-gif-placeholder">
                                    <span>🔄</span>
                                    <span>Face Swap Demo</span>
                                </div>
                            </div>
                            <h3 className="feature-modal-title">Face Swap</h3>
                            <p className="feature-modal-desc">
                                Upload a body image and a face image.<br />
                                AI will swap the face seamlessly.
                            </p>
                            <ul className="feature-modal-steps">
                                <li>① Upload body image</li>
                                <li>② Upload face image</li>
                                <li>③ Press Generate</li>
                            </ul>
                            <button
                                className="feature-modal-use-btn"
                                onClick={() => {
                                    setGenerationType('img2img');
                                    setFaceSwapMode(true);
                                    setInpaintMode(false);
                                    setReposeMode(false);
                                    setShowFaceSwapModal(false);
                                }}
                            >
                                🔄 Use Face Swap
                            </button>
                        </div>
                    </div>
                )}

                {/* Inpaint Modal */}
                {showInpaintModal2 && (
                    <div className="editor-feature-modal-overlay" onClick={() => setShowInpaintModal2(false)}>
                        <div className="editor-feature-modal" onClick={e => e.stopPropagation()}>
                            <button className="feature-modal-close" onClick={() => setShowInpaintModal2(false)}>✕</button>
                            <div className="feature-modal-gif">
                                <div className="feature-modal-gif-placeholder">
                                    <span>🖌️</span>
                                    <span>Inpaint Demo</span>
                                </div>
                            </div>
                            <h3 className="feature-modal-title">Inpaint (Nude Mode)</h3>
                            <p className="feature-modal-desc">
                                Upload an image and paint over the area<br />
                                you want AI to regenerate.
                            </p>
                            <ul className="feature-modal-steps">
                                <li>① Upload image</li>
                                <li>② Paint mask area</li>
                                <li>③ Press Generate</li>
                            </ul>
                            <button
                                className="feature-modal-use-btn"
                                onClick={() => {
                                    setGenerationType('img2img');
                                    setInpaintMode(true);
                                    setFaceSwapMode(false);
                                    setReposeMode(false);
                                    setShowInpaintModal2(false);
                                }}
                            >
                                🖌️ Use Inpaint
                            </button>
                        </div>
                    </div>
                )}

                {/* Input Area - varies by mode */}
                <div className="editor-input-section">
                    {/* Image upload for img2img / faceswap / inpaint */}
                    {showAttach && (
                        <div className="editor-upload-area">
                            {settings.generationType === 'img2img' && faceSwapMode ? (
                                <>
                                    <div
                                        className={`editor-upload-zone ${uploads.length > 0 ? 'has-image' : ''}`}
                                        onClick={() => !uploads[0] && fileInputRef.current?.click()}
                                    >
                                        {uploads[0] ? (
                                            <div className="editor-upload-preview">
                                                <img src={uploads[0].previewUrl} alt="Body" />
                                                <span className="editor-upload-badge">{t('chat.faceSwapBody')}</span>
                                                <button className="editor-upload-remove" onClick={(e) => { e.stopPropagation(); handleRemoveUpload(0); }}>✕</button>
                                            </div>
                                        ) : (
                                            <div className="editor-upload-empty">
                                                <span>⬆</span>
                                                <span>{t('chat.faceSwapBody')}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div
                                        className={`editor-upload-zone ${uploads.length > 1 ? 'has-image' : ''}`}
                                        onClick={() => !uploads[1] && fileInputRef.current?.click()}
                                    >
                                        {uploads[1] ? (
                                            <div className="editor-upload-preview">
                                                <img src={uploads[1].previewUrl} alt="Face" />
                                                <span className="editor-upload-badge">{t('chat.faceSwapFace')}</span>
                                                <button className="editor-upload-remove" onClick={(e) => { e.stopPropagation(); handleRemoveUpload(1); }}>✕</button>
                                            </div>
                                        ) : (
                                            <div className="editor-upload-empty">
                                                <span>⬆</span>
                                                <span>{t('chat.faceSwapFace')}</span>
                                            </div>
                                        )}
                                    </div>
                                    {uploads.length >= 2 && (
                                        <button className="editor-swap-btn" onClick={handleSwapUploads}>
                                            🔄 {t('chat.swapImages')}
                                        </button>
                                    )}
                                </>
                            ) : (
                                <div
                                    className={`editor-upload-zone full ${isDragOver ? 'drag-over' : ''} ${uploads.length > 0 ? 'has-image' : ''}`}
                                    onClick={() => uploads.length === 0 && fileInputRef.current?.click()}
                                    onDrop={handleDrop}
                                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                                    onDragLeave={() => setIsDragOver(false)}
                                >
                                    {uploads.length > 0 ? (
                                        <div className="editor-upload-preview">
                                            <img src={uploads[0].previewUrl} alt="Uploaded" />
                                            <button className="editor-upload-remove" onClick={(e) => { e.stopPropagation(); handleRemoveUpload(0); }}>✕</button>
                                            {inpaintMode && (
                                                <button
                                                    className="editor-mask-btn"
                                                    onClick={(e) => { e.stopPropagation(); setShowInpaintModal(true); }}
                                                >
                                                    🖌️ {t('chat.inpaintModalTitle')}
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="editor-upload-empty">
                                            <span>⬆</span>
                                            <span>{t('editor.upload')}</span>
                                            <span className="editor-upload-hint">JPG / PNG / WebP</span>
                                        </div>
                                    )}
                                </div>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                multiple={faceSwapMode}
                                hidden
                            />
                        </div>
                    )}

                    {/* Consent checkboxes for img2img modes */}
                    {showAttach && uploads.length > 0 && (
                        <div className="editor-consent-area">
                            {[0, 1, 2, 3, 4].map((i) => (
                                <label key={i} className="editor-consent-label">
                                    <input
                                        type="checkbox"
                                        checked={img2imgConsent[i]}
                                        onChange={(e) => {
                                            const next = [...img2imgConsent];
                                            next[i] = e.target.checked;
                                            setImg2imgConsent(next);
                                        }}
                                    />
                                    <span>{t(`img2imgConsent.term${i}`)}</span>
                                </label>
                            ))}
                        </div>
                    )}

                    {/* Prompt textarea */}
                    {!(faceSwapMode && settings.generationType === 'img2img') && (
                        <div className="editor-prompt-area">
                            <textarea
                                ref={textareaRef}
                                className="editor-prompt-input"
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={placeholderVisible ? t(placeholderKeys[placeholderIndex]) : ''}
                                rows={3}
                                style={{
                                    fontSize: '16px',
                                }}
                            />
                            <div className={`editor-placeholder-fade ${placeholderVisible ? 'visible' : ''}`} />
                        </div>
                    )}
                </div>
                {/* FaceSwap / Inpaint Feature Buttons - img2img mode only */}
                {settings.generationType !== 'txt2img' && (
                    <div className="editor-feature-btns">
                        <button
                            className={`editor-feature-btn ${faceSwapMode ? 'active' : ''}`}
                            onClick={() => setShowFaceSwapModal(true)}
                        >
                            <span className="feature-btn-icon">🔄</span>
                            <span className="feature-btn-label">Face Swap</span>
                            {faceSwapMode && <span className="feature-btn-active-dot" />}
                        </button>
                        <button
                            className={`editor-feature-btn ${inpaintMode ? 'active' : ''}`}
                            onClick={() => setShowInpaintModal2(true)}
                        >
                            <span className="feature-btn-icon">🖌️</span>
                            <span className="feature-btn-label">Inpaint</span>
                            {inpaintMode && <span className="feature-btn-active-dot" />}
                        </button>
                    </div>
                )}

                {/* Settings Section - Collapsible */}
                <div className="editor-collapsible-section">
                    <button
                        className="editor-collapsible-header"
                        onClick={() => setSettingsExpanded(!settingsExpanded)}
                        aria-expanded={settingsExpanded}
                    >
                        <span>{t('editor.settingsSection')}</span>
                        <span className={`editor-chevron ${settingsExpanded ? 'open' : ''}`}>▾</span>
                    </button>
                    {settingsExpanded && (
                        <div className="editor-collapsible-content">
                            {/* Model */}
                            <div className="control-group">
                                <label>{t('editor.model')}</label>
                                <select
                                    className="custom-select"
                                    value={settings.model}
                                    onChange={(e) => updateSettings({ model: e.target.value })}
                                >
                                    {filteredModels.some((m) => m.category === 'nsfw-realistic') && (
                                        <optgroup label="🔞 NSFW — Realistic">
                                            {filteredModels.filter((m) => m.category === 'nsfw-realistic').map((model) => (
                                                <option key={model.id} value={model.id}>{model.name}</option>
                                            ))}
                                        </optgroup>
                                    )}
                                    {filteredModels.filter((m) => m.type === 'video').length > 0 && (
                                        <optgroup label="🎬 Video Models">
                                            {filteredModels.filter((m) => m.type === 'video').map((model) => (
                                                <option key={model.id} value={model.id}>{model.name}</option>
                                            ))}
                                        </optgroup>
                                    )}
                                </select>
                            </div>

                            {/* Aspect Ratio */}
                            <div className="control-group">
                                <label>{t('editor.aspectRatio')}</label>
                                <div className="pill-grid">
                                    {aspectRatios.map((ratio) => (
                                        <button
                                            key={ratio}
                                            className={`pill ${settings.aspectRatio === ratio ? 'active' : ''}`}
                                            onClick={() => updateSettings({ aspectRatio: ratio })}
                                            style={{ display: 'flex', flexDirection: 'column', height: 'auto', padding: '8px 4px' }}
                                        >
                                            <span className="aspect-ratio-value">{ratio}</span>
                                            <span className="aspect-ratio-label">{aspectLabels[ratio]}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Resolution */}
                            <div className="control-group">
                                <label>{t('editor.resolution')}</label>
                                <div className="pill-grid">
                                    {resolutions.map((res) => {
                                        const isFree = !user || user.plan === 'free';
                                        const isLocked = isFree && res !== '512';
                                        return (
                                            <button
                                                key={res}
                                                className={`pill ${settings.resolution === res ? 'active' : ''} ${isLocked ? 'locked' : ''}`}
                                                onClick={() => {
                                                    if (isLocked) { alert(t('editor.resolutionLocked')); return; }
                                                    updateSettings({ resolution: res });
                                                }}
                                                style={isLocked ? { opacity: 0.5 } : {}}
                                            >
                                                {isLocked ? `🔒 ${res}` : res}
                                            </button>
                                        );
                                    })}
                                </div>
                                {(!user || user.plan === 'free') && (
                                    <p style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', marginTop: '6px' }}>
                                        {t('editor.resolutionFreeHint')}
                                    </p>
                                )}
                            </div>

                            {/* img2img Strength */}
                            {settings.generationType === 'img2img' && !faceSwapMode && !inpaintMode && (
                                <div className="control-group">
                                    <label>
                                        {t('editor.img2imgStrength')}: <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{settings.img2imgStrength ?? 0.35}</span>
                                    </label>
                                    <input
                                        type="range" min="0.1" max="0.8" step="0.05"
                                        value={settings.img2imgStrength ?? 0.35}
                                        onChange={(e) => updateSettings({ img2imgStrength: parseFloat(e.target.value) })}
                                        className="tag-slider" style={{ display: 'block', width: '100%' }}
                                    />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                                        <span>{t('editor.img2imgStrengthLow')}</span>
                                        <span>{t('editor.img2imgStrengthHigh')}</span>
                                    </div>
                                </div>
                            )}

                            {/* Nude Toggle (txt2img only) */}
                            {settings.generationType === 'txt2img' && (
                                <div className="control-group">
                                    <div className="toggle-row">
                                        <label>🔞 Nude</label>
                                        <label className="toggle-switch">
                                            <input
                                                type="checkbox"
                                                checked={settings.nudeMode ?? true}
                                                onChange={(e) => updateSettings({ nudeMode: e.target.checked })}
                                            />
                                            <span className="toggle-slider" />
                                        </label>
                                    </div>
                                </div>
                            )}

                            {/* Style Preset (txt2img only) */}
                            {isImageMode && settings.generationType === 'txt2img' && (
                                <div className="control-group">
                                    <label>{t('tags.styleTitle')}</label>
                                    <div className="pill-grid">
                                        {(['film', 'dreamy', 'natural', 'glamour', 'night', 'raw', 'anime'] as StylePresetTag[]).map((style) => {
                                            const emojiMap: Record<string, string> = { film: '🎞', dreamy: '✨', natural: '☀️', glamour: '🏖', night: '🌙', raw: '📷', anime: '🎨' };
                                            return (
                                                <button key={style} className={`pill ${tagSettings.stylePreset === style ? 'active' : ''}`}
                                                    onClick={() => updateTagSettings({ stylePreset: tagSettings.stylePreset === style ? undefined : style })}>
                                                    {emojiMap[style]} {t(`tags.style${style.charAt(0).toUpperCase() + style.slice(1)}`)}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Count */}
                            <div className="control-group">
                                <label>{t('editor.count')} (1-4)</label>
                                <div className="counter-control">
                                    <button className="counter-btn" onClick={() => updateSettings({ count: Math.max(1, settings.count - 1) })}>−</button>
                                    <span className="counter-value">{settings.count}</span>
                                    <button className="counter-btn" onClick={() => updateSettings({ count: Math.min(4, settings.count + 1) })}>＋</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Character Tags Section - Collapsible (txt2img only) */}
                {isImageMode && settings.generationType === 'txt2img' && (
                    <div className="editor-collapsible-section">
                        <button
                            className="editor-collapsible-header"
                            onClick={() => setTagsExpanded(!tagsExpanded)}
                            aria-expanded={tagsExpanded}
                        >
                            <span>{t('editor.characterTagsSection')}</span>
                            <span className={`editor-chevron ${tagsExpanded ? 'open' : ''}`}>▾</span>
                        </button>
                        {tagsExpanded && (
                            <div className="editor-collapsible-content">
                                {/* Age */}
                                <div className="control-group">
                                    <label>{t('tags.age')}</label>
                                    <div className="pill-grid">
                                        {(['20s_early', '20s_late', '30s', '40s'] as AgeTag[]).map((age) => {
                                            const labelMap: Record<string, string> = { '20s_early': 'age20sEarly', '20s_late': 'age20sLate', '30s': 'age30s', '40s': 'age40s' };
                                            return (
                                                <button key={age} className={`pill ${tagSettings.age === age ? 'active' : ''}`}
                                                    onClick={() => updateTagSettings({ age: tagSettings.age === age ? undefined : age })}>
                                                    {t(`tags.${labelMap[age]}`)}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* People Count */}
                                <div className="control-group">
                                    <label>{t('tags.peopleCount')}</label>
                                    <div className="pill-grid">
                                        {(['1', '2', 'multiple'] as PeopleCountTag[]).map((cnt) => (
                                            <button key={cnt} className={`pill ${tagSettings.peopleCount === cnt ? 'active' : ''}`}
                                                onClick={() => updateTagSettings({ peopleCount: tagSettings.peopleCount === cnt ? undefined : cnt })}>
                                                {t(`tags.people${cnt === '1' ? '1' : cnt === '2' ? '2' : 'Multiple'}`)}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Ethnicity */}
                                <div className="control-group">
                                    <label>{t('tags.ethnicity')}</label>
                                    <div className="pill-grid">
                                        {(['asian', 'european', 'american', 'southeast_asian', 'latina', 'african'] as EthnicityTag[]).map((eth) => {
                                            const keyMap: Record<string, string> = { asian: 'Asian', european: 'European', american: 'American', southeast_asian: 'SoutheastAsian', latina: 'Latina', african: 'African' };
                                            return (
                                                <button key={eth} className={`pill ${tagSettings.ethnicity === eth ? 'active' : ''}`}
                                                    onClick={() => updateTagSettings({ ethnicity: tagSettings.ethnicity === eth ? undefined : eth })}>
                                                    {t(`tags.eth${keyMap[eth]}`)}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Hair Color */}
                                <div className="control-group">
                                    <label>{t('tags.hairColor')}</label>
                                    <div className="pill-grid">
                                        {(['black_hair', 'brown_hair', 'blonde_hair', 'red_hair', 'pink_hair', 'silver_hair', 'blue_hair'] as HairColorTag[]).map((hc) => {
                                            const labelMap: Record<string, string> = { black_hair: 'Black', brown_hair: 'Brown', blonde_hair: 'Blonde', red_hair: 'Red', pink_hair: 'Pink', silver_hair: 'Silver', blue_hair: 'Blue' };
                                            return (
                                                <button key={hc} className={`pill ${tagSettings.hairColor === hc ? 'active' : ''}`}
                                                    onClick={() => updateTagSettings({ hairColor: tagSettings.hairColor === hc ? undefined : hc })}>
                                                    {t(`tags.hair${labelMap[hc]}`)}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Hair Style */}
                                <div className="control-group">
                                    <label>{t('tags.hairStyle')}</label>
                                    <div className="pill-grid">
                                        {(['long_straight', 'long_wavy', 'short_bob', 'ponytail', 'twin_tails', 'messy_bun', 'pixie_cut'] as HairStyleTag[]).map((hs) => {
                                            const labelMap: Record<string, string> = { long_straight: 'LongStraight', long_wavy: 'LongWavy', short_bob: 'ShortBob', ponytail: 'Ponytail', twin_tails: 'TwinTails', messy_bun: 'MessyBun', pixie_cut: 'PixieCut' };
                                            return (
                                                <button key={hs} className={`pill ${tagSettings.hairStyle === hs ? 'active' : ''}`}
                                                    onClick={() => updateTagSettings({ hairStyle: tagSettings.hairStyle === hs ? undefined : hs })}>
                                                    {t(`tags.hair${labelMap[hs]}`)}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Breast Size Slider */}
                                <div className="control-group">
                                    <label>{t('tags.breastSize')}: <span style={{ color: 'var(--primary)', fontWeight: 600 }}>
                                        {tagSettings.breastSize < 20 ? '🔹 Flat' :
                                            tagSettings.breastSize < 40 ? '🔸 Small' :
                                                tagSettings.breastSize < 60 ? '🟡 Medium' :
                                                    tagSettings.breastSize < 80 ? '🟠 Large' : '🔴 Huge'}
                                    </span></label>
                                    <input type="range" min="0" max="100" value={tagSettings.breastSize}
                                        onChange={(e) => updateTagSettings({ breastSize: parseInt(e.target.value) })}
                                        className="tag-slider" style={{ display: 'block', width: '100%' }} />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                                        <span>Flat</span><span>Small</span><span>Medium</span><span>Large</span><span>Huge</span>
                                    </div>
                                </div>

                                {/* Composition */}
                                <div className="control-group">
                                    <label>{t('tags.composition')}</label>
                                    <div className="pill-grid">
                                        {(['full_body', 'waist_up', 'bust', 'face_closeup'] as CompositionTag[]).map((comp) => {
                                            const keyMap: Record<string, string> = { full_body: 'FullBody', waist_up: 'WaistUp', bust: 'Bust', face_closeup: 'FaceCloseup' };
                                            return (
                                                <button key={comp} className={`pill ${tagSettings.composition === comp ? 'active' : ''}`}
                                                    onClick={() => updateTagSettings({ composition: tagSettings.composition === comp ? undefined : comp })}>
                                                    {t(`tags.comp${keyMap[comp]}`)}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Action / Pose */}
                                <div className="control-group">
                                    <label>{t('tags.fetish')}</label>
                                    <div className="pill-grid">
                                        {(['fellatio', 'cowgirl', 'insertion', 'kiss', 'missionary', 'doggy', 'standing', 'handjob', 'paizuri'] as FetishTag[]).map((f) => (
                                            <button key={f} className={`pill ${tagSettings.fetish.includes(f) ? 'active' : ''}`}
                                                onClick={() => toggleFetishTag(f)}>
                                                {t(`tags.fet${f.charAt(0).toUpperCase() + f.slice(1)}`)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Sticky Generate Button */}
            <div className="editor-generate-sticky">
                <button
                    className={`generate-btn ${isGenerating ? 'generating' : ''}`}
                    onClick={onSubmit}
                    disabled={isGenerating}
                >
                    {isGenerating ? t('editor.generating') : `✨ ${t('editor.generate')}`}
                    <span className="credit-cost">⚡ {creditCost} credits</span>
                </button>
                <div className="editor-estimate-time">
                    {t('editor.estimatedTime', { min: '10', max: '41' })}
                </div>
            </div>

            {/* Inpaint Modal */}
            {showInpaintModal && uploads[0] && (
                <InpaintModal
                    imageUrl={uploads[0].previewUrl}
                    onClose={() => setShowInpaintModal(false)}
                    onSave={(maskBase64) => {
                        setUploads((prev) => {
                            const updated = [...prev];
                            if (updated[0]) updated[0] = { ...updated[0], maskBase64 };
                            return updated;
                        });
                        setShowInpaintModal(false);
                    }}
                />
            )}
        </aside>
    );
}
