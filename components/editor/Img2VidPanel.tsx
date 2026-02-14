'use client';

import React, { useRef, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/useTranslation';

export default function Img2VidPanel() {
    const { settings, updateSettings, isGenerating } = useAppStore();
    const { t } = useTranslation();

    const firstFrameRef = useRef<HTMLInputElement>(null);
    const lastFrameRef = useRef<HTMLInputElement>(null);

    const [firstFrameUrl, setFirstFrameUrl] = useState<string | null>(null);
    const [lastFrameUrl, setLastFrameUrl] = useState<string | null>(null);
    const [motionPrompt, setMotionPrompt] = useState('');

    const handleFirstFrameUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setFirstFrameUrl(url);
            updateSettings({ referenceImageUrl: url });
        }
    };

    const handleLastFrameUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setLastFrameUrl(URL.createObjectURL(file));
        }
    };

    const handleSwapFrames = () => {
        const temp = firstFrameUrl;
        setFirstFrameUrl(lastFrameUrl);
        setLastFrameUrl(temp);
        if (lastFrameUrl) {
            updateSettings({ referenceImageUrl: lastFrameUrl });
        }
    };

    const handleRemoveFirstFrame = () => {
        setFirstFrameUrl(null);
        updateSettings({ referenceImageUrl: undefined });
        if (firstFrameRef.current) firstFrameRef.current.value = '';
    };

    const handleRemoveLastFrame = () => {
        setLastFrameUrl(null);
        if (lastFrameRef.current) lastFrameRef.current.value = '';
    };

    const creditCost = settings.count * 5;

    return (
        <aside className="img2vid-panel">
            <div className="img2vid-panel-header">
                <h3>{t('create.img2vid')}</h3>
            </div>

            <div className="img2vid-panel-scroll">
                {/* Frames Row */}
                <div className="frames-row">
                    {/* First Frame (Required) */}
                    <div className="frame-zone">
                        <div className="frame-zone-title">{t('editor.firstFrame')}</div>
                        {firstFrameUrl ? (
                            <div style={{ position: 'relative' }}>
                                <img src={firstFrameUrl} alt="First frame" className="frame-preview" />
                                <button
                                    onClick={handleRemoveFirstFrame}
                                    style={{
                                        position: 'absolute',
                                        top: 4,
                                        right: 4,
                                        width: 22,
                                        height: 22,
                                        borderRadius: '50%',
                                        background: 'rgba(0,0,0,0.7)',
                                        color: '#fff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.65rem',
                                        cursor: 'pointer',
                                        border: 'none',
                                    }}
                                >
                                    ✕
                                </button>
                            </div>
                        ) : (
                            <>
                                <button className="frame-btn" onClick={() => { }}>
                                    🖼️ {t('editor.fromLibrary')}
                                </button>
                                <button className="frame-btn" onClick={() => firstFrameRef.current?.click()}>
                                    📤 {t('editor.upload')}
                                </button>
                            </>
                        )}
                        <input
                            ref={firstFrameRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFirstFrameUpload}
                            hidden
                        />
                    </div>

                    {/* Swap Button */}
                    <button className="swap-btn" onClick={handleSwapFrames} title={t('editor.swapFrames')}>
                        ⇄
                    </button>

                    {/* Last Frame (Optional) */}
                    <div className="frame-zone">
                        <div className="frame-zone-title">{t('editor.lastFrame')}</div>
                        <div className="frame-zone-subtitle">({t('editor.lastFrameOptional')})</div>
                        {lastFrameUrl ? (
                            <div style={{ position: 'relative' }}>
                                <img src={lastFrameUrl} alt="Last frame" className="frame-preview" />
                                <button
                                    onClick={handleRemoveLastFrame}
                                    style={{
                                        position: 'absolute',
                                        top: 4,
                                        right: 4,
                                        width: 22,
                                        height: 22,
                                        borderRadius: '50%',
                                        background: 'rgba(0,0,0,0.7)',
                                        color: '#fff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.65rem',
                                        cursor: 'pointer',
                                        border: 'none',
                                    }}
                                >
                                    ✕
                                </button>
                            </div>
                        ) : (
                            <>
                                <button className="frame-btn" onClick={() => { }}>
                                    🖼️ {t('editor.fromLibrary')}
                                </button>
                                <button className="frame-btn" onClick={() => lastFrameRef.current?.click()}>
                                    📤 {t('editor.upload')}
                                </button>
                            </>
                        )}
                        <input
                            ref={lastFrameRef}
                            type="file"
                            accept="image/*"
                            onChange={handleLastFrameUpload}
                            hidden
                        />
                    </div>
                </div>

                {/* Motion Prompt */}
                <div className="control-group">
                    <textarea
                        className="motion-textarea"
                        value={motionPrompt}
                        onChange={(e) => setMotionPrompt(e.target.value)}
                        placeholder={t('editor.motionPrompt')}
                        rows={5}
                    />
                    <button className="optimize-btn">
                        ✨ {t('editor.optimize')}
                    </button>
                </div>

                <div style={{ clear: 'both' }} />

                {/* Generate Button */}
                <button
                    className={`generate-button ${isGenerating ? 'generating' : ''}`}
                    disabled={isGenerating}
                >
                    {isGenerating ? (
                        <>
                            <span className="generating-dots">
                                <span /><span /><span />
                            </span>
                            {t('editor.generating')}
                        </>
                    ) : (
                        <>
                            ✨ {t('editor.generate')}
                        </>
                    )}
                    <div className="credit-cost">({creditCost} {t('credits.label')})</div>
                </button>
            </div>
        </aside>
    );
}
