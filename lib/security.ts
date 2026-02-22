import fs from 'fs';
import path from 'path';

// --- Normalization Helpers ---
export function normalizePrompt(prompt: string): string {
    let p = prompt.toLowerCase();

    // 1. Remove symbols: . - _ ! @ # $ % ^ & *
    p = p.replace(/[.\-_!@#$%^&*]/g, '');

    // 2. Compress spaces (remove all spaces for English leetspeak detection)
    // Actually, taking out all spaces can break valid words (e.g., "beautiful woman" -> "beautifulwoman").
    // The spec asks to handle "c h i l d" -> "child". We can do this with a specific regex to remove single spaces between lone characters,
    // or just run detection on a fully space-stripped version too.
    const spaceStripped = p.replace(/\s+/g, '');

    // 3. Leetspeak mapping
    let leetReplaced = spaceStripped
        .replace(/1/g, 'i')
        .replace(/3/g, 'e')
        .replace(/0/g, 'o')
        .replace(/5/g, 's')
        .replace(/7/g, 't')
        .replace(/4/g, 'a')
        .replace(/@/g, 'a');

    return leetReplaced;
}

// English specific normalizer that retains words but fixes leetspeak for exact word boundary checks
function normalizeWithSpaces(prompt: string): string {
    let p = prompt.toLowerCase();
    p = p.replace(/[.\-_!@#$%^&*]/g, ' ');
    return p
        .replace(/1/g, 'i').replace(/3/g, 'e').replace(/0/g, 'o')
        .replace(/5/g, 's').replace(/7/g, 't').replace(/4/g, 'a').replace(/@/g, 'a');
}


// --- Category Rules ---

// 1. Direct Minor Expressions
const CAT1_EN = /\b(child(ren)?|kid(s)?|minor(s)?|underage|under age|bab(y|ies)|toddler(s)?|infant(s)?|preteen|pre-teen|teen(s)?|teenager(s)?|adolescent(s)?|juvenile|pu?bescent|prepu?bescent|pre-pu?bescent|(young|little|small|tiny)\s*(girl|boy))\b/i;
const CAT1_JA = /(子供|こども|子ども|コドモ|児童|じどう|幼児|ようじ|幼女|ようじょ|幼い|おさない|少女|しょうじょ|少年|しょうねん|未成年|みせいねん|赤ちゃん|あかちゃん|赤ん坊|あかんぼう|乳児|にゅうじ|小さい子|園児|えんじ|チャイルド|ティーン|ティーンエイジャー|キッズ|スクールガール)/;

// 2. Age Expressions
const CAT2_AGE = /\b([1-9]|1[0-7])\s*(yo|y\/o|year(s)?\s*old)|age(d)?\s*([1-9]|1[0-7])|(1st|2nd|3rd|4th|5th|6th|7th|8th|9th|10th|11th|12th)\s*grade|elementary\s*age|middle\s*school\s*age\b/i;
const CAT2_JA = /([1-9]|1[0-7])(歳|才)|小[1-6]|小学[1-6]年|中[1-3]|中学[1-3]年|高[1-3]|高校[1-3]年/;

// 3. School/Education
const CAT3_EN = /\b(school|schoolgirl|schoolboy|elementary( school)?|middle school|junior high|high school|highschool|kindergarten|preschool|pre-school|nursery|classroom|homeroom|prom|recess|playground|school bus)\b/i;
const CAT3_JA = /(学校|がっこう|生徒|せいと|児童|じどう|小学校|しょうがっこう|中学校|ちゅうがっこう|高校|こうこう|高等学校|幼稚園|ようちえん|保育園|ほいくえん|教室|きょうしつ|通学|つうがく|登校|とうこう|下校|げこう|学園|がくえん|校舎|こうしゃ|スクール|塾|じゅく|部活|ぶかつ)/;
// Note: "学生" (student) allowed if part of "大学生" managed implicitly, or strictly banned alone. Banning "学生" directly as requested.
const CAT3_JA_STUDENT_STRICT = /(学生|がくせい)/;

// 4. Uniforms & Clothing
const CAT4_EN = /\b(school uniform|sailor uniform|sailor outfit|school outfit|gym uniform|pe uniform|bloomers|randoseru|randsel|school swimsuit|school swimwear|school skirt|school blazer|pinafore)\b/i;
const CAT4_JA = /(制服|せいふく|セーラー服|セーラーふく|学生服|がくせいふく|ブレザー|体操服|たいそうふく|体操着|ブルマ|ブルマー|スクール水着|スク水|ランドセル|通学カバン|上履き|うわばき|給食着|きゅうしょくぎ|学ラン|がくらん|赤白帽|あかしろぼう)/;

// 5. Family Relations Combinations
const CAT5_FAMILY = /\b(daughter|son|stepdaughter|step-daughter|stepson|step-son|niece|nephew|babysitter|babysitting|娘|むすめ|息子|むすこ|義娘|ぎむすめ|連れ子|つれこ|姪|めい|甥|おい|パパ活|ママ活)\b/i;
const NSFW_TERMS = /\b(naked|nude|sex|fuck|porn|erotic|裸|セックス|エロ)\b/i;

// 6. Childlike Body Types
const CAT6_STRICT = /\b(childlike|child-like|loli|lolita|shota|undeveloped body|developing body|budding|つるぺた|ロリ|ロリータ|ショタ)\b/i;
const CAT6_COMBO = /\b(flat chest(ed)?|petite|baby face|babyface|ぺたんこ|ペタンコ|貧乳|童顔|どうがん|幼顔|おさながお|あどけない|無邪気)\b/i;
const CAT6_COMBO_TRIGGERS = /\b(innocent|school)\b/i;

// 7. Otaku Slang
const CAT7_STRICT = /\b(lolicon|lolita complex|shotacon|shotaro complex|cunny|cub|aged down|age regression|de-aged|age play|ddlg|dd\/lg|ロリコン|ロリータコンプレックス|ショタコン|ショタコンプレックス|合法ロリ|ペド|ペドフィリア|ランドセル少女|pedo|ped0|map|jailbait)\b/i;
const CAT7_ACRONYMS = /\b(JS|JC|JK|CP|CSAM)\b/; // strictly match abbreviations

// 8. Locations/Situations
const CAT8_EN = /\b(playground|schoolyard|school bathroom|school locker room|school gym|sleepover|slumber party|summer camp|treehouse|sandbox|swing set|school trip)\b/i;
const CAT8_JA = /(校庭|こうてい|保健室|ほけんしつ|更衣室|修学旅行|しゅうがくりょこう|林間学校|りんかんがっこう|遠足|えんそく|運動会|うんどうかい|文化祭|学校のプール|お泊まり会)/;

// --- Main Validator ---

export interface ValidationResult {
    valid: boolean;
    rule?: string;
    normalized?: string;
}

export function validatePrompt(prompt: string): ValidationResult {
    const pWithSpaces = normalizeWithSpaces(prompt);
    const pStripped = normalizePrompt(prompt);

    // We check both the natural (with spaces) string and the fully stripped leetspeak string
    const checkTarget = prompt + " " + pWithSpaces + " " + pStripped;

    // Dynamic Keywords Check
    try {
        const dkPath = path.join(process.cwd(), 'data', 'blocked_keywords.json');
        if (fs.existsSync(dkPath)) {
            const dynamicKeywords = JSON.parse(fs.readFileSync(dkPath, 'utf8'));
            const pLower = prompt.toLowerCase();
            for (const [catStr, keywords] of Object.entries(dynamicKeywords)) {
                for (const kw of (keywords as string[])) {
                    if (pLower.includes(kw) || pStripped.includes(kw)) {
                        return { valid: false, rule: `Category ${catStr}: Dynamic Keyword` };
                    }
                }
            }
        }
    } catch (e) {
        console.error('Dynamic keywords check failed', e);
    }

    // Check Categories 1-4, 7-8 (Strict Block)
    if (CAT1_EN.test(checkTarget) || CAT1_JA.test(checkTarget)) return { valid: false, rule: 'Category 1: Direct Minor Expression' };
    if (CAT2_AGE.test(checkTarget) || CAT2_JA.test(checkTarget)) return { valid: false, rule: 'Category 2: Age Expression' };

    // Special check for 大学生 (College student) bypass
    const isCollegeStudent = prompt.includes('大学生') || prompt.toLowerCase().includes('college student') || prompt.toLowerCase().includes('university student');
    if (!isCollegeStudent) {
        if (CAT3_EN.test(checkTarget) || CAT3_JA.test(checkTarget) || CAT3_JA_STUDENT_STRICT.test(prompt)) return { valid: false, rule: 'Category 3: School/Education' };
    }

    if (CAT4_EN.test(checkTarget) || CAT4_JA.test(checkTarget)) return { valid: false, rule: 'Category 4: Uniform/Clothing' };

    if (CAT7_STRICT.test(checkTarget) || CAT7_ACRONYMS.test(prompt)) return { valid: false, rule: 'Category 7: Subculture/Slang' };

    if (CAT8_EN.test(checkTarget) || CAT8_JA.test(checkTarget)) return { valid: false, rule: 'Category 8: Location/Situation' };

    // Check Combinations (Category 5 & 6)
    const hasNsfw = NSFW_TERMS.test(checkTarget);

    if (CAT5_FAMILY.test(checkTarget) && hasNsfw) {
        return { valid: false, rule: 'Category 5: Family + NSFW Combination' };
    }

    if (CAT6_STRICT.test(checkTarget)) {
        return { valid: false, rule: 'Category 6: Minor Body Type (Strict)' };
    }

    if (CAT6_COMBO.test(checkTarget)) {
        if (hasNsfw || CAT6_COMBO_TRIGGERS.test(checkTarget) || CAT1_EN.test(checkTarget)) {
            return { valid: false, rule: 'Category 6: Minor Body Type + NSFW/Innocent Combination' };
        }
    }

    // Real Person Check
    try {
        const rpPath = path.join(process.cwd(), 'data', 'real_persons.json');
        if (fs.existsSync(rpPath)) {
            const blockedPersons = JSON.parse(fs.readFileSync(rpPath, 'utf8')).blocked_persons;
            const pLower = prompt.toLowerCase();
            for (const person of blockedPersons) {
                if (pLower.includes(person.name_en.toLowerCase()) || prompt.includes(person.name_ja)) {
                    return { valid: false, rule: 'Real Person Block' };
                }
            }
        }
    } catch (e) {
        console.error('Real persons check failed', e);
    }

    return { valid: true, normalized: pStripped };
}
