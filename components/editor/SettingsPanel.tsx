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

    const aspectRatios: AspectRatio[] = ['4:3', '3:4', '16:9', '9:16'];
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

                {/* Character Tags (txt2img only — not shown for img2img) */}
                {isImageMode && settings.generationType === 'txt2img' && (
                    <>
                        <div className="control-group-divider" />
                        <div className="control-group-section-title">{t('tags.sectionTitle')}</div>

                        {/* Age */}
                        <div className="control-group">
                            <label>{t('tags.age')}</label>
                            <div className="pill-grid">
                                {(['20s', '30s'] as AgeTag[]).map((age) => (
                                    <button
                                        key={age}
                                        className={`pill ${tagSettings.age === age ? 'active' : ''}`}
                                        onClick={() => updateTagSettings({ age: tagSettings.age === age ? undefined : age })}
                                    >
                                        {t(`tags.age${age.charAt(0).toUpperCase() + age.slice(1)}`)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* People Count */}
                        <div className="control-group">
                            <label>{t('tags.peopleCount')}</label>
                            <div className="pill-grid">
                                {(['1', '2', 'multiple'] as PeopleCountTag[]).map((cnt) => (
                                    <button
                                        key={cnt}
                                        className={`pill ${tagSettings.peopleCount === cnt ? 'active' : ''}`}
                                        onClick={() => updateTagSettings({ peopleCount: tagSettings.peopleCount === cnt ? undefined : cnt })}
                                    >
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
                                    const keyMap: Record<string, string> = {
                                        asian: 'Asian',
                                        european: 'European', american: 'American',
                                        southeast_asian: 'SoutheastAsian', latina: 'Latina', african: 'African',
                                    };
                                    return (
                                        <button
                                            key={eth}
                                            className={`pill ${tagSettings.ethnicity === eth ? 'active' : ''}`}
                                            onClick={() => updateTagSettings({ ethnicity: tagSettings.ethnicity === eth ? undefined : eth })}
                                        >
                                            {t(`tags.eth${keyMap[eth]}`)}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Breast Size Slider */}
                        <div className="control-group">
                            <label>{t('tags.breastSize')}: <span style={{
                                color: 'var(--primary)',
                                fontWeight: 600,
                            }}>
                                {tagSettings.breastSize < 20 ? '🔹 Flat' :
                                    tagSettings.breastSize < 40 ? '🔸 Small' :
                                        tagSettings.breastSize < 60 ? '🟡 Medium' :
                                            tagSettings.breastSize < 80 ? '🟠 Large' :
                                                '🔴 Huge'}
                            </span></label>
                            <div style={{ padding: '8px 0' }}>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={tagSettings.breastSize}
                                    onChange={(e) => updateTagSettings({ breastSize: parseInt(e.target.value) })}
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
                                    <span>Flat</span>
                                    <span>Small</span>
                                    <span>Medium</span>
                                    <span>Large</span>
                                    <span>Huge</span>
                                </div>
                            </div>
                        </div>

                        {/* Breast Position */}
                        <div className="control-group">
                            <label>{t('tags.breastPosition')}</label>
                            <div className="pill-grid">
                                {(['cleavage', 'asymmetric', 'natural', 'pushed_together'] as BreastPositionTag[]).map((bp) => {
                                    const keyMap: Record<string, string> = {
                                        cleavage: 'Cleavage', asymmetric: 'Asymmetric',
                                        natural: 'Natural', pushed_together: 'PushedTogether',
                                    };
                                    return (
                                        <button
                                            key={bp}
                                            className={`pill ${tagSettings.breastPosition === bp ? 'active' : ''}`}
                                            onClick={() => updateTagSettings({ breastPosition: tagSettings.breastPosition === bp ? undefined : bp })}
                                        >
                                            {t(`tags.bp${keyMap[bp]}`)}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Photorealism */}
                        <div className="control-group">
                            <label>{t('tags.photorealism')}</label>
                            <div className="pill-grid">
                                {(['photorealistic', 'realistic'] as PhotorealismTag[]).map((pr) => (
                                    <button
                                        key={pr}
                                        className={`pill ${tagSettings.photorealism === pr ? 'active' : ''}`}
                                        onClick={() => updateTagSettings({ photorealism: tagSettings.photorealism === pr ? undefined : pr })}
                                    >
                                        {t(`tags.pr${pr.charAt(0).toUpperCase() + pr.slice(1)}`)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Composition */}
                        <div className="control-group">
                            <label>{t('tags.composition')}</label>
                            <div className="pill-grid">
                                {(['full_body', 'waist_up', 'bust', 'face_closeup'] as CompositionTag[]).map((comp) => {
                                    const keyMap: Record<string, string> = {
                                        full_body: 'FullBody', waist_up: 'WaistUp',
                                        bust: 'Bust', face_closeup: 'FaceCloseup',
                                    };
                                    return (
                                        <button
                                            key={comp}
                                            className={`pill ${tagSettings.composition === comp ? 'active' : ''}`}
                                            onClick={() => updateTagSettings({ composition: tagSettings.composition === comp ? undefined : comp })}
                                        >
                                            {t(`tags.comp${keyMap[comp]}`)}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Fetish / Action (multi-select) */}
                        <div className="control-group">
                            <label>{t('tags.fetish')}</label>
                            <div className="pill-grid">
                                {(['fellatio', 'cowgirl', 'insertion', 'kiss', 'missionary', 'doggy', 'standing', 'handjob', 'paizuri'] as FetishTag[]).map((f) => (
                                    <button
                                        key={f}
                                        className={`pill ${tagSettings.fetish.includes(f) ? 'active' : ''}`}
                                        onClick={() => toggleFetishTag(f)}
                                    >
                                        {t(`tags.fet${f.charAt(0).toUpperCase() + f.slice(1)}`)}
                                    </button>
                                ))}
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
