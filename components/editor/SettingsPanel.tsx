'use client';

import React from 'react';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/useTranslation';
import { AVAILABLE_MODELS } from '@/lib/types';
import type { AspectRatio, Resolution, AgeTag, PeopleCountTag, EthnicityTag, PhotorealismTag, CompositionTag, BreastPositionTag, FetishTag } from '@/lib/types';

export default function SettingsPanel() {
    const { settings, updateSettings, isGenerating, settingsPanelVisible, toggleSettingsPanel, tagSettings, updateTagSettings, toggleFetishTag } = useAppStore();
    const { t } = useTranslation();

    const isImageMode = ['txt2img', 'img2img', 'img_edit'].includes(settings.generationType);
    const isVideoMode = ['txt2vid', 'img2vid', 'ref2vid', 'vid2vid'].includes(settings.generationType);

    const filteredModels = AVAILABLE_MODELS.filter((m) =>
        isImageMode ? m.type === 'image' : m.type === 'video'
    );

    const aspectRatios: AspectRatio[] = ['1:1', '4:3', '3:4', '16:9', '9:16'];
    const resolutions: Resolution[] = ['512', '1024', '2K', '4K'];
    const durations = [3, 5, 8, 10, 15, 20];

    const modeLabels: Record<string, string> = {
        txt2img: t('create.txt2img'),
        img2img: `${t('create.img2img')} [${t('common.paid')}]`,
        img_edit: `${t('create.imgEdit')} [${t('common.paid')}]`,
        txt2vid: t('create.txt2vid'),
        img2vid: t('create.img2vid'),
        ref2vid: t('create.ref2vid'),
        vid2vid: t('create.vid2vid'),
    };

    const aspectLabels: Record<string, string> = {
        '1:1': '正方形',
        '4:3': '横 / 風景',
        '3:4': '縦 / 上半身',
        '16:9': 'ワイド',
        '9:16': '縦長 / 全身',
    };



    const creditCost = isVideoMode ? settings.count * 5 : settings.count * 2;

    return (
        <aside className={`settings-panel ${!settingsPanelVisible ? 'hidden' : ''}`}>
            <div className="settings-panel-header">
                <h3>{modeLabels[settings.generationType] ?? t('editor.settings')}</h3>
                <button
                    className="settings-toggle-btn"
                    onClick={toggleSettingsPanel}
                    title={t('editor.hide')}
                >
                    ✕
                </button>
            </div>

            <div className="settings-panel-scroll">


                {/* Model Selection */}
                <div className="control-group">
                    <label>{t('editor.model')}</label>
                    <select
                        className="custom-select"
                        value={settings.model}
                        onChange={(e) => updateSettings({ model: e.target.value })}
                    >
                        {/* NSFW Realistic Models */}
                        {filteredModels.some((m) => m.category === 'nsfw-realistic') && (
                            <optgroup label="🔞 NSFW — Realistic">
                                {filteredModels.filter((m) => m.category === 'nsfw-realistic').map((model) => (
                                    <option key={model.id} value={model.id}>
                                        {model.name}
                                    </option>
                                ))}
                            </optgroup>
                        )}
                        {/* Video Models */}
                        {filteredModels.filter((m) => m.type === 'video').length > 0 && (
                            <optgroup label="🎬 Video Models">
                                {filteredModels.filter((m) => m.type === 'video').map((model) => (
                                    <option key={model.id} value={model.id}>
                                        {model.name}
                                    </option>
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
                                <span>{ratio}</span>
                                <span className="pill-hint">{aspectLabels[ratio]}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Resolution */}
                <div className="control-group">
                    <label>{t('editor.resolution')}</label>
                    <div className="pill-grid">
                        {resolutions.map((res) => (
                            <button
                                key={res}
                                className={`pill ${settings.resolution === res ? 'active' : ''}`}
                                onClick={() => updateSettings({ resolution: res })}
                            >
                                {res}
                            </button>
                        ))}
                    </div>
                </div>

                {/* img2img Strength Slider */}
                {settings.generationType === 'img2img' && (
                    <div className="control-group">
                        <label>
                            {t('editor.img2imgStrength')}: <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{settings.img2imgStrength ?? 0.35}</span>
                        </label>
                        <div style={{ padding: '8px 0' }}>
                            <input
                                type="range"
                                min="0.1"
                                max="0.8"
                                step="0.05"
                                value={settings.img2imgStrength ?? 0.35}
                                onChange={(e) => updateSettings({ img2imgStrength: parseFloat(e.target.value) })}
                                className="tag-slider"
                                style={{ display: 'block', width: '100%' }}
                            />
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: '0.65rem',
                                color: 'var(--text-tertiary)',
                                marginTop: '4px',
                                padding: '0 2px',
                            }}>
                                <span>{t('editor.img2imgStrengthLow')}</span>
                                <span>{t('editor.img2imgStrengthHigh')}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Duration (Video only) */}
                {isVideoMode && (
                    <div className="control-group">
                        <label>{t('editor.duration')}</label>
                        <div className="pill-grid">
                            {durations.map((d) => (
                                <button
                                    key={d}
                                    className={`pill ${settings.duration === d ? 'active' : ''}`}
                                    onClick={() => updateSettings({ duration: d })}
                                >
                                    {d}s
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Camera Fixed (Video only) */}
                {isVideoMode && (
                    <div className="control-group toggle-row">
                        <label style={{ marginBottom: 0 }}>{t('editor.cameraFixed')}</label>
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={settings.cameraFixed}
                                onChange={(e) => updateSettings({ cameraFixed: e.target.checked })}
                            />
                            <span className="toggle-slider" />
                        </label>
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

                {/* Count — at the bottom so users set it last */}
                <div className="control-group" style={{ marginTop: 16 }}>
                    <label>{t('editor.count')} (1-4)</label>
                    <div className="counter-control">
                        <button
                            className="counter-btn"
                            onClick={() => updateSettings({ count: Math.max(1, settings.count - 1) })}
                        >
                            −
                        </button>
                        <span className="counter-value">{settings.count}</span>
                        <button
                            className="counter-btn"
                            onClick={() => updateSettings({ count: Math.min(4, settings.count + 1) })}
                        >
                            ＋
                        </button>
                    </div>
                </div>

                <div className="settings-panel-footer-info" style={{ marginTop: 'auto', paddingTop: '20px', fontSize: '0.8rem', color: 'var(--text-tertiary)', textAlign: 'center' }}>
                    {isVideoMode ? t('editor.vidNotice') : t('editor.imgNotice')}
                </div>
            </div>
        </aside>
    );
}
