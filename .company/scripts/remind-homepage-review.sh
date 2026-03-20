#!/bin/bash
# ホーム画面改修効果測定リマインド（3/21 ワンショット）
# 実行後に自動でcrontabから削除される

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"

if [ ! -f "$ENV_FILE" ]; then
    echo "Error: .env file not found at $ENV_FILE" >&2
    exit 1
fi

source "$ENV_FILE"

if [ -z "${LINE_CHANNEL_ACCESS_TOKEN:-}" ] || [ -z "${LINE_USER_ID:-}" ]; then
    echo "Error: LINE_CHANNEL_ACCESS_TOKEN or LINE_USER_ID not set" >&2
    exit 1
fi

MESSAGE="📊 週次チェックリマインド（3/14→3/21）

■ ホーム画面改修の効果測定
📈 デモ試行数（3/14時点: 0人）
👤 新規登録者数（3/14時点: 0人）
🏠 ホーム訪問数
🔀 /editor 遷移数

■ X フォロワー目標
🎯 目標: 30人（3/14時点: 7人）
📱 @Hikarikuronuma のフォロワー数を確認！

/company で「週次チェックして」と伝えれば、Supabaseからデータを引っ張ってレポートを出します！"

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST https://api.line.me/v2/bot/message/push \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${LINE_CHANNEL_ACCESS_TOKEN}" \
    -d "{
        \"to\": \"${LINE_USER_ID}\",
        \"messages\": [
            {
                \"type\": \"text\",
                \"text\": $(printf '%s' "$MESSAGE" | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read()))')
            }
        ]
    }")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
    echo "[$(date)] Homepage review reminder sent successfully"
    # 自動でcrontabから自分を削除
    crontab -l 2>/dev/null | grep -v "remind-homepage-review" | crontab -
    echo "[$(date)] Cron entry auto-removed"
else
    echo "[$(date)] Error: HTTP $HTTP_CODE - $BODY" >&2
    exit 1
fi
