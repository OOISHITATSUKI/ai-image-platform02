#!/bin/bash
# SNS投稿リマインダー - LINE Messaging API経由で通知
# cron: 0 12 * * * /var/www/ai-image-platform02/.company/scripts/line-reminder.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"

# .envファイル読み込み
if [ ! -f "$ENV_FILE" ]; then
    echo "Error: .env file not found at $ENV_FILE" >&2
    exit 1
fi

source "$ENV_FILE"

# 必須変数チェック
if [ -z "${LINE_CHANNEL_ACCESS_TOKEN:-}" ] || [ -z "${LINE_USER_ID:-}" ]; then
    echo "Error: LINE_CHANNEL_ACCESS_TOKEN or LINE_USER_ID not set" >&2
    exit 1
fi

# 今日の曜日を取得
DAY_OF_WEEK=$(date +%A)
TODAY=$(date +%Y-%m-%d)

# メッセージ作成
MESSAGE="📱 SNS投稿リマインド

今日（${TODAY} ${DAY_OF_WEEK}）のSNS投稿はもうできましたか？

✅ 画像の作成
✅ 投稿文の作成
✅ 各プラットフォームへの投稿

/company で秘書に相談すれば、投稿内容の壁打ちもできますよ！"

# LINE Messaging API でプッシュメッセージ送信
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
    echo "[$(date)] LINE notification sent successfully"
else
    echo "[$(date)] Error sending LINE notification: HTTP $HTTP_CODE - $BODY" >&2
    exit 1
fi
