'use client';

import TutorialModal from './TutorialModal';
import type { TutorialStep } from './TutorialModal';

const STEPS: TutorialStep[] = [
    { icon: '📤', titleKey: 'inpaintTutorial.step1Title', descKey: 'inpaintTutorial.step1Desc' },
    { icon: '🖌️', titleKey: 'inpaintTutorial.step2Title', descKey: 'inpaintTutorial.step2Desc' },
    { icon: '✨', titleKey: 'inpaintTutorial.step3Title', descKey: 'inpaintTutorial.step3Desc' },
];

export default function InpaintTutorialModal() {
    return (
        <TutorialModal
            titleKey="inpaintTutorial.title"
            steps={STEPS}
            cookieKey="inpaint_tutorial_shown"
            ctaKey="inpaintTutorial.cta"
            globalOpenKey="__openInpaintTutorial"
        />
    );
}
