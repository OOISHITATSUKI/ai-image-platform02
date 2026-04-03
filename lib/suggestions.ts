// ============================================================
// Rule-based suggestion engine with i18n support
// ============================================================

const KEYWORD_MAP_EN = {
    scene: ['bedroom', 'outdoor', 'bathroom', 'pool', 'office', 'studio', 'beach', 'shower', 'gym', 'onsen', 'cafe', 'garden'],
    style: ['glamorous', 'natural', 'dreamy', 'cinematic', 'anime', 'raw', 'film', 'night'],
    lighting: ['soft', 'studio', 'natural', 'candlelight', 'night', 'sunset', 'golden hour', 'neon'],
    outfit: ['lingerie', 'swimsuit', 'nude', 'casual', 'dress', 'bikini', 'uniform', 'fantasy outfit'],
    mood: ['smiling', 'serious', 'playful', 'seductive', 'mysterious', 'cheerful'],
} as const;

const KEYWORD_MAP_JA = {
    scene: ['ベッドルーム', '屋外', 'バスルーム', 'プール', 'オフィス', 'スタジオ', 'ビーチ', 'シャワー', 'ジム', '温泉', 'カフェ', '庭'],
    style: ['グラマラス', 'ナチュラル', 'ドリーミー', 'シネマティック', 'アニメ', 'ロウ', 'フィルム', 'ナイト'],
    lighting: ['柔らかい', 'スタジオ', '自然光', 'キャンドル', '夜', '夕焼け', 'ゴールデンアワー', 'ネオン'],
    outfit: ['ランジェリー', '水着', 'ヌード', 'カジュアル', 'ドレス', 'ビキニ', '制服', 'ファンタジー衣装'],
    mood: ['笑顔', '真剣', 'セクシー', '誘惑的', 'ミステリアス', '明るい'],
} as const;

type Category = keyof typeof KEYWORD_MAP_EN;

function extractKeywords(prompt: string, isJa: boolean): Record<Category, string[]> {
    const lower = prompt.toLowerCase();
    const map = isJa ? KEYWORD_MAP_JA : KEYWORD_MAP_EN;
    const found: Record<Category, string[]> = {
        scene: [], style: [], lighting: [], outfit: [], mood: [],
    };

    for (const [cat, keywords] of Object.entries(map)) {
        for (const kw of keywords) {
            if (lower.includes(kw.toLowerCase()) || prompt.includes(kw)) {
                found[cat as Category].push(kw);
            }
        }
    }
    return found;
}

function pickRandom<T>(arr: readonly T[], exclude: T[] = []): T {
    const filtered = arr.filter((item) => !exclude.includes(item));
    if (filtered.length === 0) return arr[Math.floor(Math.random() * arr.length)];
    return filtered[Math.floor(Math.random() * filtered.length)];
}

function buildVariation(keywords: Record<Category, string[]>, isJa: boolean): string {
    const map = isJa ? KEYWORD_MAP_JA : KEYWORD_MAP_EN;
    const newLighting = pickRandom(map.lighting, keywords.lighting);
    const scene = keywords.scene[0] || (isJa ? 'ベッドルーム' : 'bedroom');
    const style = keywords.style[0] || (isJa ? 'グラマラス' : 'glamorous');
    const outfit = keywords.outfit[0] || (isJa ? 'ランジェリー' : 'lingerie');
    return isJa
        ? `${style}な女性、${outfit}、${scene}、${newLighting}照明、繊細な肌の質感`
        : `${style} woman in ${outfit}, ${scene}, ${newLighting} lighting, detailed skin texture`;
}

function buildExpansion(keywords: Record<Category, string[]>, isJa: boolean): string {
    const map = isJa ? KEYWORD_MAP_JA : KEYWORD_MAP_EN;
    const newScene = pickRandom(map.scene, keywords.scene);
    const newMood = pickRandom(map.mood, keywords.mood);
    const style = keywords.style[0] || (isJa ? 'ナチュラル' : 'natural');
    const outfit = keywords.outfit[0] || (isJa ? 'カジュアル' : 'casual');
    return isJa
        ? `${style}な女性、${outfit}、${newScene}、${newMood}、シネマティックな構図`
        : `${style} woman in ${outfit}, ${newScene}, ${newMood}, cinematic composition`;
}

function buildContrast(keywords: Record<Category, string[]>, isJa: boolean): string {
    const map = isJa ? KEYWORD_MAP_JA : KEYWORD_MAP_EN;
    const newStyle = pickRandom(map.style, keywords.style);
    const newScene = pickRandom(map.scene, keywords.scene);
    const newOutfit = pickRandom(map.outfit, keywords.outfit);
    return isJa
        ? `${newStyle}な女性、${newOutfit}、${newScene}、アーティスティックなポーズ`
        : `${newStyle} woman in ${newOutfit}, ${newScene}, artistic pose, professional photography`;
}

export interface SuggestionSet {
    A: string; // variation
    B: string; // expansion
    C: string; // contrast
}

export function generateSuggestions(usedPrompt: string, locale: string = 'en'): SuggestionSet {
    const isJa = locale === 'ja';
    const keywords = extractKeywords(usedPrompt, isJa);

    return {
        A: buildVariation(keywords, isJa),
        B: buildExpansion(keywords, isJa),
        C: buildContrast(keywords, isJa),
    };
}
