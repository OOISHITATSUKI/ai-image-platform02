import type { TagSettings } from './types';

const AGE_MAP: Record<string, string> = {
    '20s_early': '(20 year old woman:1.3), youthful, fresh face, young adult',
    '20s_late': '(27 year old woman:1.3), young adult, mature beauty',
    '30s': '(35 year old woman:1.3), mature beauty, elegant',
    '40s': '(42 year old woman:1.3), mature, sophisticated, graceful',
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


const STYLE_MAP: Record<string, { prompt: string; negative?: string }> = {
    film: {
        prompt: '(film grain:1.3), (Kodak Portra 400:1.2), (natural lighting:1.2), (retro color grading:1.2), warm tones, cinematic, 35mm photograph, analog, golden hour light, soft shadows',
        negative: '(digital:1.2), (sharp:1.1), (clean:1.1), oversaturated',
    },
    dreamy: {
        prompt: '(soft focus:1.3), (ethereal:1.3), (bokeh:1.4), (lens flare:1.2), (dreamy atmosphere:1.3), pastel tones, glowing light, magical, hazy, soft diffusion, backlit',
        negative: '(harsh lighting:1.2), (sharp:1.2), (high contrast:1.2)',
    },
    natural: {
        prompt: '(natural lighting:1.4), (morning light:1.3), (transparent skin:1.2), (dewy skin:1.2), fresh, clean, minimal makeup, soft window light, airy, bright',
        negative: '(artificial lighting:1.2), (studio:1.1), (dramatic:1.1), heavy makeup',
    },
    glamour: {
        prompt: '(glamour photography:1.3), (vivid colors:1.2), (golden hour:1.3), (sun-kissed:1.2), vibrant, beach, outdoor, bright, saturated, fashion photography, editorial',
        negative: '(dull:1.2), (dark:1.2), (indoor:1.1), (gloomy:1.2)',
    },
    night: {
        prompt: '(night scene:1.3), (neon lights:1.2), (moody:1.3), (cinematic lighting:1.3), dark atmosphere, city lights, dramatic shadows, blue hour, ambient glow',
        negative: '(daylight:1.3), (bright:1.2), (natural light:1.2), (sunny:1.3)',
    },
    raw: {
        prompt: '(RAW photo:1.4), (DSLR:1.3), (unedited:1.2), Canon EOS R5, 85mm f/1.4, shallow depth of field, documentary style, no filter, natural colors, authentic',
        negative: '(filtered:1.2), (edited:1.2), (retouched:1.2), (artistic:1.1)',
    },
    anime: {
        prompt: '(anime style:1.4), (illustration:1.3), (cel shading:1.2), vibrant colors, clean lines, detailed eyes, anime girl, manga style',
        negative: '(photorealistic:1.4), (RAW photo:1.3), (realistic:1.3), (photograph:1.3), (skin pores:1.3)',
    },
};

const HAIR_COLOR_MAP: Record<string, string> = {
    black_hair: '(black hair:1.3), dark hair',
    brown_hair: '(brown hair:1.3), chestnut hair',
    blonde_hair: '(blonde hair:1.3), golden hair',
    red_hair: '(red hair:1.3), ginger hair',
    pink_hair: '(pink hair:1.3), pastel pink hair',
    silver_hair: '(silver hair:1.3), platinum hair, white hair',
    blue_hair: '(blue hair:1.3), vivid blue hair',
};

const HAIR_STYLE_MAP: Record<string, string> = {
    long_straight: '(long straight hair:1.3), sleek hair, flowing hair',
    long_wavy: '(long wavy hair:1.3), flowing curls, soft waves',
    short_bob: '(short bob:1.3), bob cut, chin-length hair',
    ponytail: '(ponytail:1.3), hair tied up, high ponytail',
    twin_tails: '(twin tails:1.3), pigtails, two ponytails',
    messy_bun: '(messy bun:1.3), hair bun, casual updo',
    pixie_cut: '(pixie cut:1.3), short hair, cropped hair',
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

    // Style Preset (highest priority — affects overall look)
    if (tags.stylePreset && STYLE_MAP[tags.stylePreset]) {
        const style = STYLE_MAP[tags.stylePreset];
        parts.unshift(style.prompt);
        if (style.negative) negativeParts.push(style.negative);
    }

    // Age
    if (tags.age && AGE_MAP[tags.age]) parts.push(AGE_MAP[tags.age]);

    // Hair Color
    if (tags.hairColor && HAIR_COLOR_MAP[tags.hairColor]) {
        parts.push(HAIR_COLOR_MAP[tags.hairColor]);
    }

    // Hair Style
    if (tags.hairStyle && HAIR_STYLE_MAP[tags.hairStyle]) {
        parts.push(HAIR_STYLE_MAP[tags.hairStyle]);
    }

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
