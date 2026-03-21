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

const SITUATION_MAP: Record<string, string> = {
    bedroom: 'in bedroom',
    shower: 'in shower',
    pool: 'at pool',
    beach: 'on beach',
    office: 'in office',
    gym: 'at gym',
    onsen: 'in japanese onsen hot spring',
    outdoor: 'outdoors',
    studio: 'in photo studio',
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
    fellatio: '(fellatio:1.7), (oral sex:1.6), (blowjob:1.5), (penis in mouth:1.5), (sucking:1.4), kneeling between legs, mouth wide open, tongue out, looking up at viewer, hands on thighs, head between legs, (from above angle:1.3), saliva',
    cowgirl: '(girl on top:1.7), (straddling:1.6), (riding position:1.6), (woman on top sex:1.5), (sitting on penis:1.5), legs apart straddling hips, hips grinding down, (vaginal penetration:1.5), bouncing, hands on chest, face to face, front view, sweat',
    insertion: '(vaginal penetration:1.7), (sex:1.7), (penis inside vagina:1.6), (insertion:1.5), (spread legs:1.4), hips touching, bodies pressed together, moaning expression, arched back, sweat, intimate skin contact',
    kiss: '(passionate kissing:1.5), (deep kiss:1.4), (tongue kiss:1.3), (two distinct faces in profile:1.4), (side view of faces:1.3), lips touching, eyes closed, embracing tightly, holding each other, romantic, (two separate heads:1.3), upper body shot',
    missionary: '(missionary position:1.7), (missionary sex:1.7), (woman lying on back:1.6), (man on top of woman:1.6), (legs spread wide:1.5), (between her legs:1.5), (vaginal penetration:1.5), hips between thighs, arms wrapped around man, ankles crossed behind back, bed sheets, pillow, from above angle, eye contact, skin contact',
    doggy: '(doggy style sex:1.7), (from behind:1.7), (rear entry:1.6), (bent over:1.6), (on all fours:1.5), (ass up face down:1.5), hands gripping hips, back arched deeply, (rear view:1.4), knees on bed, looking back over shoulder, sweat on back',
    standing: '(standing sex:1.7), (standing penetration:1.6), (leg lifted up:1.5), (pressed against wall:1.5), one leg hooked around waist, arms around shoulders, face to face, full body, upright position, (wall sex:1.4), weight against wall',
    handjob: '(handjob:1.7), (hand on penis:1.6), (stroking penis:1.5), (fingers wrapped around shaft:1.4), pumping motion, sitting beside, looking at viewer, arm extended, wrist motion',
    paizuri: '(paizuri:1.7), (titfuck:1.7), (penis between breasts:1.6), (breast squeeze:1.5), (breasts wrapped around shaft:1.5), pressing breasts together with hands, cleavage, looking down at penis, kneeling position',
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
        // If action requires 2 people, auto-imply male+female couple
        const requiresTwoPeople = ['fellatio', 'cowgirl', 'insertion', 'kiss', 'missionary', 'doggy', 'standing', 'handjob', 'paizuri'];
        if (tags.fetish.some(f => requiresTwoPeople.includes(f))) {
            highPriorityParts.push('(1boy:1.4), (1girl:1.3), (couple:1.4), (man and woman:1.3), (2people:1.3)');
        }
    }

    // ── CHARACTER: People count ──
    // Skip solo/1girl if action already implies couple
    const hasCouple = tags.fetish.length > 0 && tags.fetish.some(f =>
        ['fellatio', 'cowgirl', 'insertion', 'kiss', 'missionary', 'doggy', 'standing', 'handjob', 'paizuri'].includes(f)
    );
    if (hasCouple) {
        // Couple action already added 1boy+1girl tags in high priority — skip conflicting people tags
    } else if (tags.peopleCount === '2') {
        characterParts.push('(2girls:1.4), (two women:1.3)');
    } else if (tags.peopleCount === 'multiple') {
        characterParts.push('(multiple girls:1.4), (group:1.3), several women');
    } else if (tags.peopleCount === '1') {
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

    // Situation / Scene
    if (tags.situation && SITUATION_MAP[tags.situation]) {
        characterParts.push(SITUATION_MAP[tags.situation]);
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
