const fs = require('fs');
const path = require('path');

const dir = '/Users/ooishitatsuki/Desktop/ai-image-platform02/messages';

const translations = {
    ja: { faceSwapGuide: '📷 画像1 = 体（ターゲット） / 🧑 画像2 = 顔（ソース） — ドラッグで入れ替え可能' },
    en: { faceSwapGuide: '📷 Image 1 = Body (Target) / 🧑 Image 2 = Face (Source) — Drag to swap' },
    zh: { faceSwapGuide: '📷 图片 1 = 身体 (目标) / 🧑 图片 2 = 脸部 (来源) — 拖动以交换' },
    ko: { faceSwapGuide: '📷 이미지 1 = 체형 (타겟) / 🧑 이미지 2 = 얼굴 (소스) — 드래그하여 교체' },
    es: { faceSwapGuide: '📷 Imagen 1 = Cuerpo (Objetivo) / 🧑 Imagen 2 = Cara (Origen) — Arrastrar para intercambiar' },
    pt: { faceSwapGuide: '📷 Imagem 1 = Corpo (Alvo) / 🧑 Imagem 2 = Rosto (Origem) — Arraste para trocar' }
};

fs.readdirSync(dir).filter(f => f.endsWith('.json')).forEach(file => {
    const lang = file.replace('.json', '');
    const fp = path.join(dir, file);
    const data = JSON.parse(fs.readFileSync(fp, 'utf8'));

    if (!data.chat) data.chat = {};
    const t = translations[lang] || translations.en;

    data.chat.faceSwapGuide = t.faceSwapGuide;

    fs.writeFileSync(fp, JSON.stringify(data, null, 4));
    console.log('Updated ' + file + ' with faceSwapGuide translation');
});
