const fs = require('fs');
const path = require('path');

const dir = '/Users/ooishitatsuki/Desktop/ai-image-platform02/messages';
const langs = {
    ja: { ethAsian: 'アジア人' },
    en: { ethAsian: 'Asian' },
    zh: { ethAsian: '亚裔' },
    ko: { ethAsian: '아시아인' },
    es: { ethAsian: 'Asiático/a' },
    pt: { ethAsian: 'Asiático/a' },
};

fs.readdirSync(dir).filter(f => f.endsWith('.json')).forEach(file => {
    const lang = file.replace('.json', '');
    const fp = path.join(dir, file);
    const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
    const t = langs[lang] || langs.en;
    if (!data.tags) data.tags = {};
    data.tags.ethAsian = t.ethAsian;
    delete data.tags.ethJapanese;
    delete data.tags.ethKorean;
    delete data.tags.ethChinese;
    fs.writeFileSync(fp, JSON.stringify(data, null, 4));
    console.log('Updated', file);
});
