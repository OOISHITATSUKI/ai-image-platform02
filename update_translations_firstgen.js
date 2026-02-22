const fs = require('fs');
const path = require('path');

const locales = ['en', 'ja', 'es', 'ko', 'pt', 'zh'];
const msgDir = path.join(__dirname, 'messages');

const jaKeys = {
    "title": "画像生成を始める前に",
    "privacyTitle": "📄 プライバシーポリシー（データの取り扱い）",
    "privacyPoint1": "・入力されたプロンプトはAIモデルの学習には使用されません。",
    "privacyPoint2": "・フィルタリング精度向上のため匿名化された統計分析に使用される場合があります。",
    "privacyPoint3": "・生成画像は最大72時間キャッシュ後、自動削除されます。",
    "readFullText": "全文を読む →",
    "privacyCheck": "データの取り扱いについて確認し、同意します。",
    "complianceTitle": "📄 2257コンプライアンス声明",
    "complianceSubtitle": "※ 米国にお住まいの方は必ずお読みください",
    "compliancePoint1": "本サービスのすべての画像はAIにより生成されたものです。\n実在の人物は一切含まれていません。",
    "complianceCheck": "上記を確認しました。",
    "prohibitedCheck": "禁止コンテンツ（未成年、実在人物等）を生成しないことを改めて確認します。",
    "startButton": "生成を始める"
};

const enKeys = {
    "title": "Before you start generating",
    "privacyTitle": "📄 Privacy Policy (Data Handling)",
    "privacyPoint1": "• Prompts entered are not used to train AI models.",
    "privacyPoint2": "• They may be used for anonymized statistical analysis to improve filtering accuracy.",
    "privacyPoint3": "• Generated images are automatically deleted after being cached for up to 72 hours.",
    "readFullText": "Read full text →",
    "privacyCheck": "I confirm and agree to the data handling terms.",
    "complianceTitle": "📄 2257 Compliance Statement",
    "complianceSubtitle": "※ US residents must read carefully",
    "compliancePoint1": "All images on this service are AI-generated.\nNo real individuals are depicted.",
    "complianceCheck": "I have read and acknowledged the above.",
    "prohibitedCheck": "I reiterate that I will not generate prohibited content (minors, real people, etc.).",
    "startButton": "Start Generating"
};

locales.forEach(loc => {
    const file = path.join(msgDir, `${loc}.json`);
    if (fs.existsSync(file)) {
        const data = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (!data.firstGenModal) {
            data.firstGenModal = loc === 'ja' ? jaKeys : enKeys;
            fs.writeFileSync(file, JSON.stringify(data, null, 4));
            console.log(`Updated ${loc}.json`);
        }
    }
});
