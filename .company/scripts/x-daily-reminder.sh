#!/bin/bash
# X(Twitter)デイリータスクリマインダー - LINE Messaging API経由で通知
# cron: 0 23 * * * (UTC) = 毎日 08:00 JST

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"

if [ ! -f "$ENV_FILE" ]; then
    echo "Error: .env file not found at $ENV_FILE" >&2
    exit 1
fi

source "$ENV_FILE"

if [ -z "${LINE_CHANNEL_ACCESS_TOKEN:-}" ] || [ -z "${LINE_USER_ID:-}" ]; then
    echo "Error: LINE credentials not set" >&2
    exit 1
fi

TODAY=$(TZ=Asia/Tokyo date +%Y-%m-%d)
DAY_OF_WEEK=$(TZ=Asia/Tokyo date +%A)

MESSAGE="☀️ おはようございます！

今日（${TODAY}）のXタスクです：

🔁 リプライ 10件
  □ 1件目
  □ 2件目
  □ 3件目
  □ 4件目
  □ 5件目
  □ 6件目
  □ 7件目
  □ 8件目
  □ 9件目
  □ 10件目

🖼 画像投稿 1件
  □ 画像作成 → 投稿

完了したら /done で報告してくださいね！"

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

if [ "$HTTP_CODE" = "200" ]; then
    echo "[$(date)] X daily reminder sent successfully"
else
    BODY=$(echo "$RESPONSE" | head -n -1)
    echo "[$(date)] Error: HTTP $HTTP_CODE - $BODY" >&2
    exit 1
fi
