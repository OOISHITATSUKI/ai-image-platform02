import type { TagSettings } from './types';

const AGE_MAP: Record<string, string> = {
    '10s': '(18 year old girl:1.3), youthful face, young',
    '20s': '(25 year old woman:1.3), young adult',
    '30s': '(35 year old woman:1.3), mature beauty',
};

const ETHNICITY_MAP: Record<string, { prompt: string; negative?: string }> = {
    asian: {
        prompt: '(japanese woman:1.4), (japanese idol:1.3), (gravure idol:1.2), (asian:1.3), (fair skin:1.3), (pale skin:1.2), (light skin tone:1.3), realistic skin texture, natural skin, minor skin imperfections, soft studio lighting',
        negative: '(dark skin:1.4), (tan skin:1.3), (brown skin:1.3), (tanned:1.3), heavy makeup, artificial, 3d render',
    },
    european: {
        prompt: '(european woman:1.4), (caucasian:1.2)',
    },
    american: {
        prompt: '(american woman:1.4)',
    },
    southeast_asian: {
        prompt: '(southeast asian woman:1.4)',
    },
    latina: {
        prompt: '(latina woman:1.4)',
    },
    african: {
        prompt: '(african woman:1.4), (dark skin:1.2)',
    },
};

const BREAST_SIZE_MAP: Record<string, string> = {
    flat: '(flat chest:1.3)',
    small: '(small breasts:1.3)',
    medium: '(medium breasts:1.2)',
    large: '(large breasts:1.3)',
    huge: '(huge breasts:1.4), (massive breasts:1.2)',
};

const BREAST_POSITION_MAP: Record<string, string> = {
    cleavage: '(cleavage:1.2)',
    asymmetric: 'asymmetrical breasts',
    natural: '(natural breasts:1.1)',
    pushed_together: '(breasts pushed together:1.2)',
};

const COMPOSITION_MAP: Record<string, string> = {
    full_body: '(full body shot:1.3), standing, head to toe',
    waist_up: '(upper body:1.3), waist up',
    bust: '(portrait:1.2), bust shot, from chest up',
    face_closeup: '(face closeup:1.4), head portrait, detailed face, detailed eyes',
};

const FETISH_MAP: Record<string, string> = {
    fellatio: '(fellatio:1.4), oral sex, on knees',
    cowgirl: '(cowgirl position:1.4), straddling, riding',
    insertion: '(sex:1.4), (penetration:1.3), vaginal',
    kiss: '(kissing:1.3), passionate kiss, lips touching',
    missionary: '(missionary position:1.4), lying down, legs spread',
    doggy: '(doggy style:1.4), from behind, bent over',
    standing: '(standing sex:1.4), standing position',
    handjob: '(handjob:1.4), hand on penis',
    paizuri: '(paizuri:1.4), titfuck, breasts around penis',
};

export interface TagPromptResult {
    prompt: string;
    negativePrompt: string;
}

export function buildPromptFromTags(tags: TagSettings): string {
    return buildTagPromptResult(tags).prompt;
}

export function buildTagPromptResult(tags: TagSettings): TagPromptResult {
    const parts: string[] = [];
    const negativeParts: string[] = [];

    // People count first (affects scene composition)
    if (tags.peopleCount === '2') {
        parts.push('(2girls:1.4), (two women:1.3)');
        // Remove "multiple faces" from default negative when 2+ people
    } else if (tags.peopleCount === 'multiple') {
        parts.push('(multiple girls:1.4), (group:1.3), several women');
    } else if (tags.peopleCount === '1') {
        parts.push('(1girl:1.2), solo');
    }

    // Age
    if (tags.age && AGE_MAP[tags.age]) parts.push(AGE_MAP[tags.age]);

    // Ethnicity (high priority — includes skin tone)
    if (tags.ethnicity && ETHNICITY_MAP[tags.ethnicity]) {
        const eth = ETHNICITY_MAP[tags.ethnicity];
        parts.push(eth.prompt);
        if (eth.negative) negativeParts.push(eth.negative);
    }

    // Breast size
    if (tags.breastSize < 20) parts.push(BREAST_SIZE_MAP.flat);
    else if (tags.breastSize < 40) parts.push(BREAST_SIZE_MAP.small);
    else if (tags.breastSize < 60) parts.push(BREAST_SIZE_MAP.medium);
    else if (tags.breastSize < 80) parts.push(BREAST_SIZE_MAP.large);
    else parts.push(BREAST_SIZE_MAP.huge);

    // Breast position
    if (tags.breastPosition && BREAST_POSITION_MAP[tags.breastPosition]) {
        parts.push(BREAST_POSITION_MAP[tags.breastPosition]);
    }

    // Photorealism
    if (tags.photorealism === 'photorealistic') {
        parts.push('(photorealistic:1.4), (RAW photo:1.3), (Fujifilm XT4:1.2), 85mm lens f/1.8, bokeh, film grain, (highly detailed skin:1.3), skin pores, Peach fuzz, natural lighting, professional photography, masterpiece');
    } else if (tags.photorealism === 'realistic') {
        parts.push('(realistic:1.3), detailed');
    }

    // Composition
    if (tags.composition && COMPOSITION_MAP[tags.composition]) {
        parts.push(COMPOSITION_MAP[tags.composition]);
    }

    // Fetish / Action — higher priority with stronger weights
    if (tags.fetish.length > 0) {
        tags.fetish.forEach((f) => {
            if (FETISH_MAP[f]) parts.push(FETISH_MAP[f]);
        });
        // If action requires 2 people but count is 1, auto-imply
        const requiresTwoPeople = ['fellatio', 'cowgirl', 'insertion', 'kiss', 'missionary', 'doggy', 'standing', 'handjob', 'paizuri'];
        if (tags.fetish.some(f => requiresTwoPeople.includes(f)) && (!tags.peopleCount || tags.peopleCount === '1')) {
            parts.push('(1boy:1.2), (1girl:1.2), (couple:1.2)');
        }
    }

    return {
        prompt: parts.filter(Boolean).join(', '),
        negativePrompt: negativeParts.filter(Boolean).join(', '),
    };
}
