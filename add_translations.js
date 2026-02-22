const fs = require('fs');
const path = require('path');

const messagesDir = path.join(__dirname, 'messages');
const files = fs.readdirSync(messagesDir).filter(f => f.endsWith('.json'));

const translations = {
    ja: {
        error_safety_violation: "生成に失敗しました: 安全基準（未成年保護等）に違反するため、このプロンプトは使用できません。",
        error_temp_ban: "生成に失敗しました: 規約違反が繰り返されたため、アカウントが一時停止されています（24時間）。",
        error_permanent_ban: "生成に失敗しました: 重大な規約違反のため、アカウントは永久凍結されました。",
        error_access_denied: "アクセスが拒否されました: "
    },
    en: {
        error_safety_violation: "Generation failed: This prompt cannot be used due to safety violations.",
        error_temp_ban: "Generation failed: Account temporarily suspended for repeated violations (24h).",
        error_permanent_ban: "Generation failed: Account permanently banned for strict policy violations.",
        error_access_denied: "Access denied: "
    },
    zh: {
        error_safety_violation: "生成失败：由于安全违规（如未成年人保护），无法使用此提示词。",
        error_temp_ban: "生成失败：由于多次违规，账户已暂时封禁（24小时）。",
        error_permanent_ban: "生成失败：由于严重违反政策，账户已被永久封禁。",
        error_access_denied: "访问被拒绝："
    },
    ko: {
        error_safety_violation: "생성 실패: 안전 규정(미성년자 보호 등) 위반으로 인해 이 프롬프트를 사용할 수 없습니다.",
        error_temp_ban: "생성 실패: 반복적인 규정 위반으로 인해 계정이 일시 정지되었습니다(24시간).",
        error_permanent_ban: "생성 실패: 심각한 정책 위반으로 인해 계정이 영구 정지되었습니다.",
        error_access_denied: "접근이 거부되었습니다: "
    },
    es: {
        error_safety_violation: "Error de generación: Este prompt no se puede usar debido a violaciones de seguridad.",
        error_temp_ban: "Error de generación: Cuenta suspendida temporalmente por violaciones repetidas (24h).",
        error_permanent_ban: "Error de generación: Cuenta bloqueada permanentemente por violaciones estrictas de la política.",
        error_access_denied: "Acceso denegado: "
    },
    pt: {
        error_safety_violation: "Falha na geração: Este prompt não pode ser usado devido a violações de segurança.",
        error_temp_ban: "Falha na geração: Conta suspensa temporariamente por violações repetidas (24h).",
        error_permanent_ban: "Falha na geração: Conta permanentemente banida por violações estritas da política.",
        error_access_denied: "Acesso negado: "
    }
};

files.forEach(file => {
    const lang = file.replace('.json', '');
    const filePath = path.join(messagesDir, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    const transObj = translations[lang] || translations.en;

    if (!data.chat) data.chat = {};

    // Apply translations directly inside the `chat` object
    data.chat.error_safety_violation = transObj.error_safety_violation;
    data.chat.error_temp_ban = transObj.error_temp_ban;
    data.chat.error_permanent_ban = transObj.error_permanent_ban;
    data.chat.error_access_denied = transObj.error_access_denied;

    fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
    console.log(`Updated ${file}`);
});
