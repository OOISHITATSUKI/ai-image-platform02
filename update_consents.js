const fs = require('fs');
const path = require('path');

const dir = '/Users/ooishitatsuki/Desktop/ai-image-platform02/messages';

const translations = {
    ja: {
        title: '⚠️ 画像アップロード時の同意事項（必須）',
        terms: [
            '18歳以上です。',
            '利用規約のほか各種法令等を遵守して利用します。',
            '自分が権利のない画像や知的財産権、その他、第三者の権利を侵害している画像は利用していません。',
            '18歳未満の人物の画像は利用しません。',
            '生成されたデータを第三者へ共有や公開しません。'
        ]
    },
    en: {
        title: '⚠️ Mandatory Image Upload Agreement',
        terms: [
            'I am 18 years of age or older.',
            'I will comply with the Terms of Service and all applicable laws.',
            'I am not using images that infringe on intellectual property rights or the rights of any third party.',
            'I will not use images of individuals under the age of 18.',
            'I will not share or publish the generated data to third parties.'
        ]
    },
    zh: {
        title: '⚠️ 图片上传必读同意事项',
        terms: [
            '我已年满18岁。',
            '我将遵守服务条款及所有相关法律法规。',
            '我没有使用侵犯知识产权或任何第三方权利的图片。',
            '我不会使用未满18岁的人物的图片。',
            '我不会向第三方分享或公开生成的数据。'
        ]
    },
    ko: {
        title: '⚠️ 이미지 업로드 시 필수 동의 사항',
        terms: [
            '본인은 만 18세 이상입니다.',
            '이용 약관 및 모든 관련 법률을 준수합니다.',
            '지적 재산권 또는 제3자의 권리를 침해하는 이미지를 사용하지 않습니다.',
            '18세 미만 인물의 이미지를 사용하지 않습니다.',
            '생성된 데이터를 제3자에게 공유하거나 공개하지 않습니다.'
        ]
    },
    es: {
        title: '⚠️ Acuerdo Obligatorio de Subida de Imágenes',
        terms: [
            'Tengo 18 años o más.',
            'Cumpliré con los Términos de Servicio y todas las leyes aplicables.',
            'No estoy utilizando imágenes que infrinjan los derechos de propiedad intelectual o los derechos de terceros.',
            'No utilizaré imágenes de personas menores de 18 años.',
            'No compartiré ni publicaré los datos generados a terceros.'
        ]
    },
    pt: {
        title: '⚠️ Acordo Obrigatório de Upload de Imagens',
        terms: [
            'Tenho 18 anos de idade ou mais.',
            'Cumprirei os Termos de Serviço e todas as leis aplicáveis.',
            'Não estou usando imagens que infrinjam direitos de propriedade intelectual ou os direitos de qualquer terceiro.',
            'Não usarei imagens de indivíduos com menos de 18 anos.',
            'Não compartilharei nem publicarei os dados gerados com terceiros.'
        ]
    }
};

fs.readdirSync(dir).filter(f => f.endsWith('.json')).forEach(file => {
    const lang = file.replace('.json', '');
    const fp = path.join(dir, file);
    const data = JSON.parse(fs.readFileSync(fp, 'utf8'));

    if (!data.img2imgConsent) data.img2imgConsent = {};
    const t = translations[lang] || translations.en;

    data.img2imgConsent.title = t.title;
    data.img2imgConsent.term0 = t.terms[0];
    data.img2imgConsent.term1 = t.terms[1];
    data.img2imgConsent.term2 = t.terms[2];
    data.img2imgConsent.term3 = t.terms[3];
    data.img2imgConsent.term4 = t.terms[4];

    fs.writeFileSync(fp, JSON.stringify(data, null, 4));
    console.log('Updated ' + file + ' with img2imgConsent');
});
