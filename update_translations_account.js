const fs = require('fs');
const path = require('path');

const locales = ['en', 'ja', 'es', 'pt', 'zh', 'ko'];
const msgDir = path.join(__dirname, 'messages');

const jaKeys = {
    "dashboard": "ダッシュボード",
    "profileSettings": "プロフィール設定",
    "creditsCharge": "クレジット残高・チャージ",
    "generationHistory": "生成履歴",
    "purchaseHistory": "入金・購入履歴",
    "settings": "設定",
    "contentPolicy": "コンテンツポリシー",
    "dmcaPolicy": "DMCAポリシー",
    "compliance2257": "2257コンプライアンス声明"
};

const enKeys = {
    "dashboard": "Dashboard",
    "profileSettings": "Profile Settings",
    "creditsCharge": "Credits / Charge",
    "generationHistory": "Generation History",
    "purchaseHistory": "Payment / Purchase History",
    "settings": "Settings",
    "contentPolicy": "Content Policy",
    "dmcaPolicy": "DMCA Policy",
    "compliance2257": "2257 Compliance Statement"
};

locales.forEach(loc => {
    const file = path.join(msgDir, `${loc}.json`);
    if (fs.existsSync(file)) {
        const data = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (!data.account) data.account = {};
        const keysToAdd = loc === 'ja' ? jaKeys : enKeys;

        for (const [key, val] of Object.entries(keysToAdd)) {
            if (!data.account[key]) {
                data.account[key] = val;
            }
        }

        fs.writeFileSync(file, JSON.stringify(data, null, 4));
        console.log(`Updated ${loc}.json`);
    }
});
