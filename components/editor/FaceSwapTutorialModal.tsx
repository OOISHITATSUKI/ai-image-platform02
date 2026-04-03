'use client';

import TutorialModal from './TutorialModal';
import type { TutorialStep } from './TutorialModal';

const STEPS: TutorialStep[] = [
    { icon: '📤', titleKey: 'faceSwapTutorial.step1Title', descKey: 'faceSwapTutorial.step1Desc' },
    { icon: '👤', titleKey: 'faceSwapTutorial.step2Title', descKey: 'faceSwapTutorial.step2Desc' },
    { icon: '✨', titleKey: 'faceSwapTutorial.step3Title', descKey: 'faceSwapTutorial.step3Desc' },
];

export default function FaceSwapTutorialModal() {
    return (
        <TutorialModal
            titleKey="faceSwapTutorial.title"
            steps={STEPS}
            cookieKey="faceswap_tutorial_shown"
            ctaKey="faceSwapTutorial.cta"
            globalOpenKey="__openFaceSwapTutorial"
        />
    );
}
