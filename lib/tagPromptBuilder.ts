import type { TagSettings } from './types';

const AGE_MAP: Record<string, string> = {
    '10s': '(18 year old girl:1.3), youthful face, young',
    '20s': '(25 year old woman:1.3), young adult',
    '30s': '(35 year old woman:1.3), mature beauty',
};

const ETHNICITY_MAP: Record<string, { prompt: string; negative?: string }> = {
    asian: {
        prompt: '(japanese woman:1.4), (asian:1.3), (fair skin:1.3), (pale skin:1.2), (light skin tone:1.3), realistic skin texture, natural skin, (minor skin imperfections:1.2), (natural freckles:0.3), soft natural lighting',
        negative: '(dark skin:1.4), (tan skin:1.3), (brown skin:1.3), (tanned:1.3), heavy makeup, artificial, 3d render, (plastic skin:1.3), (airbrushed:1.3)',
    },
    european: {
        prompt: '(european woman:1.4), (caucasian:1.2), natural skin texture, (subtle freckles:0.5)',
        negative: '(plastic skin:1.3), (airbrushed:1.3)',
    },
    american: {
        prompt: '(american woman:1.4), natural skin texture',
        negative: '(plastic skin:1.3), (airbrushed:1.3)',
    },
    southeast_asian: {
        prompt: '(southeast asian woman:1.4), natural skin texture',
        negative: '(plastic skin:1.3), (airbrushed:1.3)',
    },
    latina: {
        prompt: '(latina woman:1.4), (warm skin tone:1.2), natural skin texture',
        negative: '(plastic skin:1.3), (airbrushed:1.3)',
    },
    african: {
        prompt: '(african woman:1.4), (dark skin:1.2), (rich skin tone:1.2), natural skin texture',
        negative: '(plastic skin:1.3), (airbrushed:1.3)',
    },
};

const HAIR_COLOR_MAP: Record<string, string> = {
    black_hair: '(black hair:1.3)',
    brown_hair: '(brown hair:1.3)',
    blonde_hair: '(blonde hair:1.3)',
    red_hair: '(red hair:1.3)',
    pink_hair: '(pink hair:1.3)',
    silver_hair: '(silver hair:1.3), (gray hair:1.1)',
    blue_hair: '(blue hair:1.3)',
};

const HAIR_STYLE_MAP: Record<string, string> = {
    long_straight: '(long straight hair:1.3), (sleek hair:1.1)',
    long_wavy: '(long wavy hair:1.3), (flowing hair:1.1)',
    short_bob: '(short bob haircut:1.3), (chin length hair:1.1)',
    ponytail: '(ponytail:1.3), (hair tied back:1.1)',
    twin_tails: '(twin tails:1.3), (pigtails:1.2)',
    messy_bun: '(messy bun:1.3), (hair up:1.1)',
    pixie_cut: '(pixie cut:1.3), (very short hair:1.2)',
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
    full_body: '(full body shot:1.4), (head to toe:1.3), showing feet, wide shot',
    waist_up: '(upper body:1.3), waist up',
    bust: '(portrait:1.2), bust shot, from chest up',
    face_closeup: '(face closeup:1.4), head portrait, detailed face, detailed eyes',
};

const COMPOSITION_NEGATIVE_MAP: Record<string, string> = {
    full_body: '(closeup:1.3), (portrait:1.2), (cropped:1.3), (upper body only:1.2)',
    waist_up: '(full body:1.2), (feet:1.1)',
    bust: '(full body:1.2), (legs:1.1), (feet:1.1)',
    face_closeup: '(full body:1.3), (legs:1.2), (feet:1.2), (wide shot:1.2)',
};

const FETISH_MAP: Record<string, string> = {
    fellatio: '(fellatio:1.5), (oral sex:1.4), (blowjob:1.4), kneeling, mouth open, (penis in mouth:1.3), looking up at viewer, hands on thighs, submissive pose, from above angle',
    cowgirl: '(girl on top:1.5), (straddling:1.5), (riding:1.4), (woman on top sex position:1.4), sitting on lap, legs apart, hips grinding, face to face, front view, (vaginal penetration:1.3), intimate',
    insertion: '(vaginal penetration:1.5), (sex:1.5), (insertion:1.4), spread legs, (penis inside:1.3), moaning expression, arched back, intimate contact, sweat',
    kiss: '(passionate kissing:1.5), (deep kiss:1.4), (tongue kiss:1.3), lips touching, eyes closed, embracing, holding each other, romantic, face closeup, intertwined bodies',
    missionary: '(missionary position:1.5), (lying on back:1.4), (legs spread:1.4), (man on top:1.3), arms around neck, bed, pillow, from above angle, eye contact, intimate',
    doggy: '(doggy style:1.5), (from behind:1.5), (bent over:1.4), (rear view:1.3), on all fours, hands on hips, back arched, ass up, face down, looking back',
    standing: '(standing sex:1.5), (standing position:1.4), (leg lifted:1.3), against wall, one leg up, arms around shoulders, face to face, full body, upright penetration',
    handjob: '(handjob:1.5), (hand on penis:1.4), (stroking:1.3), fingers wrapped around shaft, sitting beside, looking at viewer, gentle grip, arm extended',
    paizuri: '(paizuri:1.5), (titfuck:1.5), (breasts around penis:1.4), (breast squeeze:1.3), pressing breasts together, cleavage, looking down, kneeling, penis between breasts',
};

export interface TagPromptResult {
    prompt: string;
    negativePrompt: string;
}

export function buildPromptFromTags(tags: TagSettings): string {
    return buildTagPromptResult(tags).prompt;
}

export function buildTagPromptResult(tags: TagSettings): TagPromptResult {
    // Priority order: composition/action first (most likely to be ignored by SD if placed late)
    // then character identity tags, then style tags
    const highPriorityParts: string[] = [];   // composition, action/pose
    const characterParts: string[] = [];       // people count, age, ethnicity, body
    const styleParts: string[] = [];           // photorealism, quality
    const negativeParts: string[] = [];

    // ── Determine effective composition based on action ──
    // Some actions require specific compositions — override user setting when conflicting
    const fullBodyActions = ['standing', 'cowgirl', 'missionary', 'doggy', 'insertion'];
    const waistUpActions = ['fellatio', 'handjob', 'paizuri'];
    const hasFullBodyAction = tags.fetish.length > 0 && tags.fetish.some(f => fullBodyActions.includes(f));
    const hasWaistUpAction = tags.fetish.length > 0 && tags.fetish.some(f => waistUpActions.includes(f));

    let effectiveComposition = tags.composition;
    if (hasFullBodyAction) {
        // These actions need full body — override any closeup/bust/waist
        effectiveComposition = 'full_body';
    } else if (hasWaistUpAction && (tags.composition === 'face_closeup' || tags.composition === 'bust')) {
        // These actions need at least waist up — override face closeup and bust
        effectiveComposition = 'waist_up';
    }

    // ── HIGH PRIORITY: Composition (shot type) ──
    if (effectiveComposition && COMPOSITION_MAP[effectiveComposition]) {
        highPriorityParts.push(COMPOSITION_MAP[effectiveComposition]);
        // Only add composition negatives when no action is set (avoid conflicts)
        if (!tags.fetish.length && COMPOSITION_NEGATIVE_MAP[effectiveComposition]) {
            negativeParts.push(COMPOSITION_NEGATIVE_MAP[effectiveComposition]);
        }
    }

    // ── HIGH PRIORITY: Fetish / Action / Pose ──
    if (tags.fetish.length > 0) {
        tags.fetish.forEach((f) => {
            if (FETISH_MAP[f]) highPriorityParts.push(FETISH_MAP[f]);
        });
        // If action requires 2 people but count is 1, auto-imply
        const requiresTwoPeople = ['fellatio', 'cowgirl', 'insertion', 'kiss', 'missionary', 'doggy', 'standing', 'handjob', 'paizuri'];
        if (tags.fetish.some(f => requiresTwoPeople.includes(f)) && (!tags.peopleCount || tags.peopleCount === '1')) {
            highPriorityParts.push('(1boy:1.2), (1girl:1.2), (couple:1.2)');
        }
    }

    // ── CHARACTER: People count ──
    // Skip solo/1girl if action already implies couple
    const hasCouple = tags.fetish.length > 0 && tags.fetish.some(f =>
        ['fellatio', 'cowgirl', 'insertion', 'kiss', 'missionary', 'doggy', 'standing', 'handjob', 'paizuri'].includes(f)
    );
    if (tags.peopleCount === '2') {
        characterParts.push('(2girls:1.4), (two women:1.3)');
    } else if (tags.peopleCount === 'multiple') {
        characterParts.push('(multiple girls:1.4), (group:1.3), several women');
    } else if (tags.peopleCount === '1' && !hasCouple) {
        characterParts.push('(1girl:1.2), solo');
    }

    // Age
    if (tags.age && AGE_MAP[tags.age]) characterParts.push(AGE_MAP[tags.age]);

    // Ethnicity (high priority — includes skin tone)
    if (tags.ethnicity && ETHNICITY_MAP[tags.ethnicity]) {
        const eth = ETHNICITY_MAP[tags.ethnicity];
        characterParts.push(eth.prompt);
        if (eth.negative) negativeParts.push(eth.negative);
    }

    // Hair color
    if (tags.hairColor && HAIR_COLOR_MAP[tags.hairColor]) {
        characterParts.push(HAIR_COLOR_MAP[tags.hairColor]);
    }

    // Hair style
    if (tags.hairStyle && HAIR_STYLE_MAP[tags.hairStyle]) {
        characterParts.push(HAIR_STYLE_MAP[tags.hairStyle]);
    }

    // Breast size
    if (tags.breastSize < 20) characterParts.push(BREAST_SIZE_MAP.flat);
    else if (tags.breastSize < 40) characterParts.push(BREAST_SIZE_MAP.small);
    else if (tags.breastSize < 60) characterParts.push(BREAST_SIZE_MAP.medium);
    else if (tags.breastSize < 80) characterParts.push(BREAST_SIZE_MAP.large);
    else characterParts.push(BREAST_SIZE_MAP.huge);

    // Breast position
    if (tags.breastPosition && BREAST_POSITION_MAP[tags.breastPosition]) {
        characterParts.push(BREAST_POSITION_MAP[tags.breastPosition]);
    }

    // ── STYLE: Photorealism ──
    if (tags.photorealism === 'photorealistic') {
        styleParts.push(
            '(photorealistic:1.4), (RAW photo:1.3), (DSLR:1.2), 85mm lens, f/2.8, ' +
            'shallow depth of field, bokeh, film grain, ' +
            '(realistic skin texture:1.3), (visible skin pores:1.2), (natural skin imperfections:1.2), ' +
            '(subtle skin blemishes:1.1), (fine body hair:1.1), ' +
            'natural lighting, soft shadows, masterpiece'
        );
    } else if (tags.photorealism === 'realistic') {
        styleParts.push('(realistic:1.3), (natural skin:1.2), detailed');
    }

    // Combine: high priority → character → style
    const allParts = [...highPriorityParts, ...characterParts, ...styleParts];

    return {
        prompt: allParts.filter(Boolean).join(', '),
        negativePrompt: negativeParts.filter(Boolean).join(', '),
    };
}
