const fs = require('fs');
const path = require('path');
const dir = '/Users/ooishitatsuki/Desktop/ai-image-platform02/messages';

const fallback = { faceSwapBody: 'Body', faceSwapFace: 'Face' };
const langs = {
    ja: { faceSwapBody: '体', faceSwapFace: '顔' },
    en: { faceSwapBody: 'Body', faceSwapFace: 'Face' },
    zh: { faceSwapBody: '身体', faceSwapFace: '脸部' },
    ko: { faceSwapBody: '체형', faceSwapFace: '얼굴' },
    es: { faceSwapBody: 'Cuerpo', faceSwapFace: 'Cara' },
    pt: { faceSwapBody: 'Corpo', faceSwapFace: 'Rosto' }
};

fs.readdirSync(dir).filter(f => f.endsWith('.json')).forEach(file => {
    const lang = file.replace('.json', '');
    const fp = path.join(dir, file);
    const data = JSON.parse(fs.readFileSync(fp, 'utf8'));

    if (!data.chat) data.chat = {};
    const t = langs[lang] || fallback;

    data.chat.faceSwapBody = t.faceSwapBody;
    data.chat.faceSwapFace = t.faceSwapFace;

    fs.writeFileSync(fp, JSON.stringify(data, null, 4));
    console.log('Added body/face keys to ' + file);
});
