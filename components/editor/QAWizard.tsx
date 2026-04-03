'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/useTranslation';
import type { AgeTag, EthnicityTag, SituationTag, StylePresetTag, OutfitTag, HairColorTag, HairStyleTag } from '@/lib/types';

// ── Question definitions ──

interface QAOption {
    emoji: string;
    labelKey: string;        // i18n key
    value: string | null;    // null = "おまかせ"
    nsfwOnly?: boolean;
}

interface QAQuestion {
    id: string;
    titleKey: string;        // i18n key
    options: QAOption[];
}

const Q_VIBE: QAQuestion = {
    id: 'Q_VIBE',
    titleKey: 'qa.vibeTitle',
    options: [
        { emoji: '🌙', labelKey: 'qa.vibeGlamorous', value: 'glamour' },
        { emoji: '☀️', labelKey: 'qa.vibeNatural', value: 'natural' },
        { emoji: '🌸', labelKey: 'qa.vibeDreamy', value: 'dreamy' },
        { emoji: '🎬', labelKey: 'qa.vibeCinematic', value: 'film' },
        { emoji: '✨', labelKey: 'qa.vibeAnime', value: 'anime' },
        { emoji: '📷', labelKey: 'qa.vibeRaw', value: 'raw' },
    ],
};

const Q_PERSON: QAQuestion = {
    id: 'Q_PERSON',
    titleKey: 'qa.personTitle',
    options: [
        { emoji: '🌸', labelKey: 'qa.personAsian', value: 'asian' },
        { emoji: '🌹', labelKey: 'qa.personEuropean', value: 'european' },
        { emoji: '💃', labelKey: 'qa.personLatina', value: 'latina' },
        { emoji: '🌍', labelKey: 'qa.personAfrican', value: 'african' },
        { emoji: '🌺', labelKey: 'qa.personSEAsian', value: 'southeast_asian' },
        { emoji: '🎭', labelKey: 'qa.omakase', value: null },
    ],
};

const Q_SCENE: QAQuestion = {
    id: 'Q_SCENE',
    titleKey: 'qa.sceneTitle',
    options: [
        { emoji: '🛏', labelKey: 'qa.sceneBedroom', value: 'bedroom' },
        { emoji: '🌿', labelKey: 'qa.sceneOutdoor', value: 'outdoor' },
        { emoji: '🚿', labelKey: 'qa.sceneBathroom', value: 'shower' },
        { emoji: '🏊', labelKey: 'qa.scenePool', value: 'pool' },
        { emoji: '💼', labelKey: 'qa.sceneOffice', value: 'office' },
        { emoji: '🏖', labelKey: 'qa.sceneBeach', value: 'beach' },
        { emoji: '📸', labelKey: 'qa.sceneStudio', value: 'studio' },
    ],
};

const Q_HAIR: QAQuestion = {
    id: 'Q_HAIR',
    titleKey: 'qa.hairTitle',
    options: [
        { emoji: '🖤', labelKey: 'qa.hairBlackLong', value: 'black_long' },
        { emoji: '💛', labelKey: 'qa.hairBlondeShort', value: 'blonde_short' },
        { emoji: '🤎', labelKey: 'qa.hairBrownWave', value: 'brown_wave' },
        { emoji: '❤️', labelKey: 'qa.hairRedPonytail', value: 'red_ponytail' },
        { emoji: '🩷', labelKey: 'qa.hairPinkTwin', value: 'pink_twin' },
        { emoji: '🎭', labelKey: 'qa.omakase', value: null },
    ],
};

const Q_LIGHTING: QAQuestion = {
    id: 'Q_LIGHTING',
    titleKey: 'qa.lightingTitle',
    options: [
        { emoji: '🌅', labelKey: 'qa.lightGolden', value: 'golden_hour' },
        { emoji: '🌙', labelKey: 'qa.lightNight', value: 'night_moody' },
        { emoji: '☀️', labelKey: 'qa.lightNatural', value: 'natural_daylight' },
        { emoji: '💡', labelKey: 'qa.lightStudio', value: 'studio' },
        { emoji: '🕯', labelKey: 'qa.lightCandle', value: 'candlelight' },
        { emoji: '🎭', labelKey: 'qa.omakase', value: null },
    ],
};

const Q_OUTFIT: QAQuestion = {
    id: 'Q_OUTFIT',
    titleKey: 'qa.outfitTitle',
    options: [
        { emoji: '👙', labelKey: 'qa.outfitSwimsuit', value: 'swimsuit' },
        { emoji: '🎀', labelKey: 'qa.outfitLingerie', value: 'lingerie', nsfwOnly: true },
        { emoji: '👗', labelKey: 'qa.outfitDress', value: 'dress' },
        { emoji: '👕', labelKey: 'qa.outfitCasual', value: 'casual' },
        { emoji: '🔞', labelKey: 'qa.outfitNude', value: 'nude', nsfwOnly: true },
        { emoji: '🎭', labelKey: 'qa.omakase', value: null },
    ],
};

const Q_AGE: QAQuestion = {
    id: 'Q_AGE',
    titleKey: 'qa.ageTitle',
    options: [
        { emoji: '🌸', labelKey: 'qa.ageEarly20s', value: '20s_early' },
        { emoji: '✨', labelKey: 'qa.ageLate20s', value: '20s_late' },
        { emoji: '💄', labelKey: 'qa.age30s', value: '30s' },
        { emoji: '👑', labelKey: 'qa.age40s', value: '40s' },
        { emoji: '🎭', labelKey: 'qa.omakase', value: null },
    ],
};

const ALL_QUESTIONS = [Q_VIBE, Q_PERSON, Q_SCENE, Q_HAIR, Q_LIGHTING, Q_OUTFIT, Q_AGE];

function getRandomQuestions(): QAQuestion[] {
    const shuffled = [...ALL_QUESTIONS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
}

// ── Hair combo mapping ──
const HAIR_MAP: Record<string, { color: HairColorTag; style: HairStyleTag }> = {
    black_long: { color: 'black_hair', style: 'long_straight' },
    blonde_short: { color: 'blonde_hair', style: 'short_bob' },
    brown_wave: { color: 'brown_hair', style: 'long_wavy' },
    red_ponytail: { color: 'red_hair', style: 'ponytail' },
    pink_twin: { color: 'pink_hair', style: 'twin_tails' },
};

// ── Lighting → prompt text ──
const LIGHTING_EN: Record<string, string> = {
    golden_hour: 'golden hour lighting, warm sunset glow',
    night_moody: 'night time, moody dark lighting',
    natural_daylight: 'natural daylight, bright and clear',
    studio: 'professional studio lighting',
    candlelight: 'warm candlelight, intimate atmosphere',
};
const LIGHTING_JA: Record<string, string> = {
    golden_hour: 'ゴールデンアワー、夕焼けの暖かい光',
    night_moody: '夜、ムーディーな暗い照明',
    natural_daylight: '自然光、明るく透明感のある',
    studio: 'プロフェッショナルなスタジオライト',
    candlelight: 'キャンドルライト、親密な雰囲気',
};

// ── Props ──

interface QAWizardProps {
    isNsfw: boolean;
    onComplete: (answers: Record<string, string | null>, promptText: string) => void;
    onGenerate?: () => void;
    onOpenTags?: () => void;
    onOpenSettings?: () => void;
    onDismissToPrompt?: () => void;
}

export interface QAData {
    answers: Record<string, string | null>;
    questions: string[];
    completed: boolean;
    skippedCount: number;
}

export default function QAWizard({ isNsfw, onComplete, onGenerate, onOpenTags, onOpenSettings, onDismissToPrompt }: QAWizardProps) {
    const { updateTagSettings } = useAppStore();
    const { t } = useTranslation();
    const locale = useAppStore((s) => s.locale);

    const [questions, setQuestions] = useState(() => getRandomQuestions());
    const [currentStep, setCurrentStep] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string | null>>({});
    const [completed, setCompleted] = useState(false);
    const [skippedCount, setSkippedCount] = useState(0);
    const [selectedValue, setSelectedValue] = useState<string | null | undefined>(undefined);
    const [slideDir, setSlideDir] = useState<'right' | 'left'>('right');
    const [animating, setAnimating] = useState(false);
    const prevStepRef = useRef(0);

    const currentQ = questions[currentStep] || null;

    // Filter NSFW-only options when SFW
    const filteredOptions = useMemo(() => {
        if (!currentQ) return [];
        return currentQ.options.filter((o) => isNsfw || !o.nsfwOnly);
    }, [currentQ, isNsfw]);

    // Apply answer to tags
    const applyToTags = useCallback((qId: string, value: string | null) => {
        if (!value) return;
        switch (qId) {
            case 'Q_VIBE':
                updateTagSettings({ stylePreset: value as StylePresetTag });
                break;
            case 'Q_PERSON':
                updateTagSettings({ ethnicity: value as EthnicityTag });
                break;
            case 'Q_SCENE':
                updateTagSettings({ situation: value as SituationTag });
                break;
            case 'Q_HAIR': {
                const hair = HAIR_MAP[value];
                if (hair) updateTagSettings({ hairColor: hair.color, hairStyle: hair.style });
                break;
            }
            case 'Q_OUTFIT':
                updateTagSettings({ outfit: value as OutfitTag });
                break;
            case 'Q_AGE':
                updateTagSettings({ age: value as AgeTag });
                break;
            // Q_LIGHTING is handled via prompt text only
        }
    }, [updateTagSettings]);

    // Build prompt from all answers
    const buildPrompt = useCallback((allAnswers: Record<string, string | null>): string => {
        const isJa = locale === 'ja';
        const parts: string[] = [];

        // Vibe
        const vibeMap: Record<string, [string, string]> = {
            glamour: ['glamorous', 'グラマラス'],
            natural: ['natural', 'ナチュラル'],
            dreamy: ['dreamy', 'ドリーミー'],
            film: ['cinematic', 'シネマティック'],
            anime: ['anime style', 'アニメスタイル'],
            raw: ['raw photo', 'ロウフォト'],
        };
        if (allAnswers.Q_VIBE && vibeMap[allAnswers.Q_VIBE]) {
            parts.push(vibeMap[allAnswers.Q_VIBE][isJa ? 1 : 0]);
        }

        // Person
        const personMap: Record<string, [string, string]> = {
            asian: ['Asian woman', 'アジア系女性'],
            european: ['European woman', 'ヨーロッパ系女性'],
            latina: ['Latina woman', 'ラテン系女性'],
            african: ['African woman', 'アフリカ系女性'],
            southeast_asian: ['Southeast Asian woman', '東南アジア系女性'],
        };
        if (allAnswers.Q_PERSON && personMap[allAnswers.Q_PERSON]) {
            parts.push(personMap[allAnswers.Q_PERSON][isJa ? 1 : 0]);
        } else {
            parts.push(isJa ? '美しい女性' : 'beautiful woman');
        }

        // Scene
        const sceneMap: Record<string, [string, string]> = {
            bedroom: ['bedroom', 'ベッドルーム'],
            outdoor: ['outdoors', '屋外'],
            shower: ['bathroom', 'バスルーム'],
            pool: ['pool', 'プール'],
            office: ['office', 'オフィス'],
            beach: ['beach', 'ビーチ'],
            studio: ['studio', 'スタジオ'],
        };
        if (allAnswers.Q_SCENE && sceneMap[allAnswers.Q_SCENE]) {
            parts.push(sceneMap[allAnswers.Q_SCENE][isJa ? 1 : 0]);
        }

        // Lighting
        if (allAnswers.Q_LIGHTING) {
            const lightMap = isJa ? LIGHTING_JA : LIGHTING_EN;
            if (lightMap[allAnswers.Q_LIGHTING]) parts.push(lightMap[allAnswers.Q_LIGHTING]);
        }

        // Outfit
        const outfitMap: Record<string, [string, string]> = {
            swimsuit: ['swimsuit', '水着'],
            lingerie: ['lingerie', 'ランジェリー'],
            dress: ['elegant dress', 'エレガントなドレス'],
            casual: ['casual outfit', 'カジュアル'],
            nude: ['nude', 'ヌード'],
        };
        if (allAnswers.Q_OUTFIT && outfitMap[allAnswers.Q_OUTFIT]) {
            parts.push(outfitMap[allAnswers.Q_OUTFIT][isJa ? 1 : 0]);
        }

        // Age
        const ageMap: Record<string, [string, string]> = {
            '20s_early': ['early 20s', '20代前半'],
            '20s_late': ['late 20s', '20代後半'],
            '30s': ['30s', '30代'],
            '40s': ['40s', '40代'],
        };
        if (allAnswers.Q_AGE && ageMap[allAnswers.Q_AGE]) {
            parts.push(ageMap[allAnswers.Q_AGE][isJa ? 1 : 0]);
        }

        // Hair
        const hairMap: Record<string, [string, string]> = {
            black_long: ['black long hair', '黒髪ロング'],
            blonde_short: ['blonde short hair', 'ブロンドショート'],
            brown_wave: ['brown wavy hair', 'ブラウンウェーブ'],
            red_ponytail: ['red ponytail', 'レッドポニーテール'],
            pink_twin: ['pink twin tails', 'ピンクツインテール'],
        };
        if (allAnswers.Q_HAIR && hairMap[allAnswers.Q_HAIR]) {
            parts.push(hairMap[allAnswers.Q_HAIR][isJa ? 1 : 0]);
        }

        return parts.join(isJa ? '、' : ', ');
    }, [locale]);

    const advanceStep = useCallback((newAnswers: Record<string, string | null>, nextStep: number) => {
        setSlideDir('right');
        setAnimating(true);
        setTimeout(() => {
            if (nextStep >= questions.length) {
                setCompleted(true);
                const prompt = buildPrompt(newAnswers);
                onComplete(newAnswers, prompt);
            } else {
                prevStepRef.current = currentStep;
                setCurrentStep(nextStep);
            }
            setSelectedValue(undefined);
            setAnimating(false);
        }, 350);
    }, [questions.length, currentStep, buildPrompt, onComplete]);

    const handleSelect = (value: string | null) => {
        if (!currentQ || animating) return;
        setSelectedValue(value);
        const newAnswers = { ...answers, [currentQ.id]: value };
        setAnswers(newAnswers);
        applyToTags(currentQ.id, value);
        advanceStep(newAnswers, currentStep + 1);
    };

    const handleSkip = () => {
        if (!currentQ || animating) return;
        setSkippedCount((c) => c + 1);
        const newAnswers = { ...answers, [currentQ.id]: null };
        setAnswers(newAnswers);
        advanceStep(newAnswers, currentStep + 1);
    };

    const handleEditAnswer = (step: number) => {
        setSlideDir('left');
        setAnimating(true);
        setTimeout(() => {
            prevStepRef.current = currentStep;
            setCurrentStep(step);
            setCompleted(false);
            setAnimating(false);
        }, 200);
    };

    // Reset wizard for new round
    const handleRestart = () => {
        setQuestions(getRandomQuestions());
        setCurrentStep(0);
        setAnswers({});
        setCompleted(false);
        setSkippedCount(0);
        setSelectedValue(undefined);
    };

    // Completed state
    if (completed) {
        return (
            <div className="qa-done-panel">
                {/* Floating particles */}
                <div className="qa-particles qa-particles-done">
                    <div className="qa-particle qa-p1" />
                    <div className="qa-particle qa-p2" />
                    <div className="qa-particle qa-p3" />
                    <div className="qa-particle qa-p4" />
                    <div className="qa-particle qa-p5" />
                    <div className="qa-particle qa-p6" />
                    <div className="qa-particle qa-p7" />
                    <div className="qa-particle qa-p8" />
                </div>

                <div className="qa-done-header">
                    <span className="qa-done-icon">✦</span>
                    <span className="qa-done-title">{t('qa.completed')}</span>
                </div>

                {/* Selected answers */}
                <div className="qa-done-badges">
                    {questions.map((q) => {
                        const ans = answers[q.id];
                        const opt = q.options.find((o) => o.value === ans);
                        if (!opt) return null;
                        return (
                            <span key={q.id} className="qa-done-badge">
                                {opt.emoji} {t(opt.labelKey)}
                            </span>
                        );
                    })}
                </div>

                <div className="qa-done-desc">{t('qa.doneDesc')}</div>

                {/* Action buttons */}
                <div className="qa-done-actions">
                    <button className="qa-done-action" onClick={onDismissToPrompt}>
                        ✏️ {t('qa.editPrompt')}
                    </button>
                    <button className="qa-done-action" onClick={onOpenTags}>
                        👤 {t('qa.openTags')}
                    </button>
                    <button className="qa-done-action" onClick={onOpenSettings}>
                        ⚙️ {t('qa.openSettings')}
                    </button>
                </div>

                {/* Generate button */}
                <button className="qa-done-generate" onClick={onGenerate}>
                    ✦ {t('qa.generateNow')}
                </button>

                {/* Restart */}
                <button className="qa-done-restart" onClick={handleRestart}>
                    ↺ {t('qa.restart')}
                </button>
            </div>
        );
    }

    if (!currentQ) return null;

    // Color theme per question type
    const themeMap: Record<string, string> = {
        Q_VIBE: 'purple', Q_PERSON: 'pink', Q_SCENE: 'blue',
        Q_HAIR: 'pink', Q_LIGHTING: 'purple', Q_OUTFIT: 'pink', Q_AGE: 'blue',
    };
    const theme = themeMap[currentQ.id] || 'purple';

    return (
        <div className={`qa-wizard qa-theme-${theme}`}>
            {/* Floating particles */}
            <div className="qa-particles">
                <div className="qa-particle qa-p1" />
                <div className="qa-particle qa-p2" />
                <div className="qa-particle qa-p3" />
                <div className="qa-particle qa-p4" />
                <div className="qa-particle qa-p5" />
                <div className="qa-particle qa-p6" />
                <div className="qa-particle qa-p7" />
                <div className="qa-particle qa-p8" />
                <div className="qa-particle qa-p9" />
                <div className="qa-particle qa-p10" />
            </div>

            {/* Header label */}
            <div className="qa-header-label">✦ {t('qa.headerLabel')}</div>

            {/* Progress dots */}
            <div className="qa-progress">
                {questions.map((_, i) => (
                    <div key={i} className={`qa-progress-dot ${i < currentStep ? 'done' : i === currentStep ? 'active' : ''}`}>
                        {i < currentStep && <span className="qa-progress-check">✓</span>}
                    </div>
                ))}
                <span className="qa-progress-text">Q{currentStep + 1} / {questions.length}</span>
            </div>

            {/* Previous answers (clickable to edit) */}
            {currentStep > 0 && (
                <div className="qa-prev-answers">
                    {questions.slice(0, currentStep).map((q, i) => {
                        const ans = answers[q.id];
                        const opt = q.options.find((o) => o.value === ans);
                        return (
                            <button key={q.id} className="qa-prev-chip" onClick={() => handleEditAnswer(i)}>
                                <span>{opt?.emoji || '🎭'}</span>
                                <span>{opt ? t(opt.labelKey) : t('qa.skipped')}</span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Current question with slide animation */}
            <div
                key={currentStep}
                className={`qa-question qa-slide-${slideDir}`}
            >
                <h3 className="qa-question-title">
                    <span className="qa-question-num">Q{currentStep + 1}.</span> {t(currentQ.titleKey)}
                </h3>
                <div className="qa-options-grid">
                    {filteredOptions.map((opt) => {
                        const isSelected = selectedValue === opt.value;
                        return (
                            <button
                                key={opt.value ?? 'omakase'}
                                className={`qa-option-card ${isSelected ? 'selected' : ''}`}
                                onClick={() => handleSelect(opt.value)}
                                disabled={animating}
                            >
                                <span className="qa-option-emoji">{opt.emoji}</span>
                                <span className="qa-option-label">{t(opt.labelKey)}</span>
                            </button>
                        );
                    })}
                </div>
                <button className="qa-skip-btn" onClick={handleSkip} disabled={animating}>
                    {t('qa.skip')} →
                </button>
            </div>
        </div>
    );
}

// Export for data tracking
export function getQAData(
    answers: Record<string, string | null>,
    questions: string[],
    skippedCount: number,
    completed: boolean
): QAData {
    return { answers, questions, completed, skippedCount };
}
