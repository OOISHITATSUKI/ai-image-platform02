'use client';

import React from 'react';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/useTranslation';
import { AVAILABLE_MODELS } from '@/lib/types';
import type { AspectRatio, Resolution } from '@/lib/types';

export default function SettingsPanel() {
    const { settings, updateSettings, isGenerating, settingsPanelVisible, toggleSettingsPanel } = useAppStore();
    const { t } = useTranslation();

    const isImageMode = ['txt2img', 'img2img', 'img_edit'].includes(settings.generationType);
    const isVideoMode = ['txt2vid', 'img2vid', 'ref2vid', 'vid2vid'].includes(settings.generationType);

    const filteredModels = AVAILABLE_MODELS.filter((m) =>
        isImageMode ? m.type === 'image' : m.type === 'video'
    );

    const aspectRatios: AspectRatio[] = ['1:1', '4:3', '3:4', '16:9', '9:16', '21:9'];
    const resolutions: Resolution[] = ['512', '1024', '2K', '4K'];
    const durations = [3, 5, 8, 10, 15, 20];

    const modeLabels: Record<string, string> = {
        txt2img: t('create.txt2img'),
        img2img: t('create.img2img'),
        img_edit: t('create.imgEdit'),
        txt2vid: t('create.txt2vid'),
        img2vid: t('create.img2vid'),
        ref2vid: t('create.ref2vid'),
        vid2vid: t('create.vid2vid'),
    };



    const creditCost = isVideoMode ? settings.count * 5 : settings.count * 1;

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
                        {/* SFW Models */}
                        <optgroup label="SFW Models">
                            {filteredModels.filter((m) => !m.nsfw && m.apiType !== 'seedream').map((model) => (
                                <option key={model.id} value={model.id}>
                                    {model.name}
                                </option>
                            ))}
                        </optgroup>
                        {/* Seedream Models */}
                        {filteredModels.some((m) => m.apiType === 'seedream') && (
                            <optgroup label="✨ Seedream">
                                {filteredModels.filter((m) => m.apiType === 'seedream').map((model) => (
                                    <option key={model.id} value={model.id}>
                                        ✨ {model.name}
                                    </option>
                                ))}
                            </optgroup>
                        )}
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
                        {/* NSFW Anime Models */}
                        {filteredModels.some((m) => m.category === 'nsfw-anime') && (
                            <optgroup label="🔞 NSFW — Anime">
                                {filteredModels.filter((m) => m.category === 'nsfw-anime').map((model) => (
                                    <option key={model.id} value={model.id}>
                                        {model.name}
                                    </option>
                                ))}
                            </optgroup>
                        )}
                    </select>
                </div>

                {/* Quality Preset */}
                {isImageMode && (
                    <div className="control-group">
                        <label>Quality (Ultra Fixed)</label>
                        <div className="quality-preset-grid" style={{ gridTemplateColumns: '1fr' }}>
                            {([
                                { key: 'ultra', icon: '💎', label: 'Ultra High Quality', desc: 'Max detail & sharp focus' },
                            ] as const).map((preset) => (
                                <button
                                    key={preset.key}
                                    className="quality-preset-btn active"
                                    onClick={() => updateSettings({ qualityPreset: 'ultra' })}
                                    style={{ cursor: 'default' }}
                                >
                                    <span className="preset-icon">{preset.icon}</span>
                                    <span className="preset-label">{preset.label}</span>
                                    <span className="preset-desc">{preset.desc}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Aspect Ratio */}
                <div className="control-group">
                    <label>{t('editor.aspectRatio')}</label>
                    <div className="pill-grid">
                        {aspectRatios.map((ratio) => (
                            <button
                                key={ratio}
                                className={`pill ${settings.aspectRatio === ratio ? 'active' : ''}`}
                                onClick={() => updateSettings({ aspectRatio: ratio })}
                            >
                                {ratio}
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

                {/* Count */}
                <div className="control-group">
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

                <div className="settings-panel-footer-info" style={{ marginTop: 'auto', paddingTop: '20px', fontSize: '0.8rem', color: 'var(--text-tertiary)', textAlign: 'center' }}>
                    {isVideoMode ? t('editor.vidNotice') : t('editor.imgNotice')}
                </div>
            </div>
        </aside>
    );
}
