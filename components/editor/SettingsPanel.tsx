'use client';

import React from 'react';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/useTranslation';
import { AVAILABLE_MODELS } from '@/lib/types';
import type { AspectRatio, Resolution, AgeTag, PeopleCountTag, EthnicityTag, PhotorealismTag, CompositionTag, BreastPositionTag, FetishTag, StylePresetTag, HairColorTag, HairStyleTag } from '@/lib/types';

export default function SettingsPanel() {
    const { settings, updateSettings, isGenerating, settingsPanelVisible, toggleSettingsPanel, tagSettings, updateTagSettings, toggleFetishTag, user } = useAppStore();
    const { t } = useTranslation();

    const isImageMode = ['txt2img', 'img2img', 'img_edit', 'face_swap', 'inpaint'].includes(settings.generationType);
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
        face_swap: `${t('create.faceSwap')} [${t('common.paid')}]`,
        inpaint: `${t('create.undress')} [${t('common.paid')}]`,
        txt2vid: t('create.txt2vid'),
        img2vid: t('create.img2vid'),
        ref2vid: t('create.ref2vid'),
        vid2vid: t('create.vid2vid'),
    };

    const aspectLabels: Record<string, string> = {
        '1:1': t('editor.aspectRatioValues.1:1'),
        '4:3': t('editor.aspectRatioValues.4:3'),
        '3:4': t('editor.aspectRatioValues.3:4'),
        '16:9': t('editor.aspectRatioValues.16:9'),
        '9:16': t('editor.aspectRatioValues.9:16'),
    };



    const creditCost = isVideoMode ? settings.count * 5 : settings.count * 2;

    return (
        <aside className={`settings-panel ${!settingsPanelVisible ? 'hidden' : ''}`}>
            <div className="settings-panel-header">
                <h3>{modeLabels[settings.generationType] ?? t('editor.settings')}</h3>
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
                                        if (isLocked) {
                                            alert(t('editor.resolutionLocked'));
                                            return;
                                        }
                                        updateSettings({ resolution: res });
                                    }}
                                    style={isLocked ? { opacity: 0.5, position: 'relative' } : {}}
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


                {/* ── Style Preset (txt2img only) ── */}
                {isImageMode && settings.generationType === 'txt2img' && (
                    <>
                        <div className="control-group-divider" />
                        <div className="control-group-section-title">{t('tags.styleTitle')}</div>
                        <div className="control-group">
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
                    </>
                )}

                {/* ── Character Tags (txt2img only) ── */}
                {isImageMode && settings.generationType === 'txt2img' && (
                    <>
                        <div className="control-group-divider" />
                        <div className="control-group-section-title">{t('tags.sectionTitle')}</div>

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
                            <div style={{ padding: '8px 0' }}>
                                <input type="range" min="0" max="100" value={tagSettings.breastSize}
                                    onChange={(e) => updateTagSettings({ breastSize: parseInt(e.target.value) })}
                                    className="tag-slider" style={{ display: 'block', width: '100%' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-tertiary)', marginTop: '4px', padding: '0 2px' }}>
                                    <span>Flat</span><span>Small</span><span>Medium</span><span>Large</span><span>Huge</span>
                                </div>
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

                    </>
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
