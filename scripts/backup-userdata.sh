#!/bin/bash
# ============================================================
# ユーザー個人データ専用バックアップスクリプト (高頻度)
# 対象: users, transactions, credit_log, login_log,
#       registration_attempts, trusted_devices, bans, favorites
# 頻度: 30分ごと (cron設定)
# 保持: 7日間
# ============================================================

PROJ_DIR="/var/www/ai-image-platform02"
BACKUP_DIR="$PROJ_DIR/backups/userdata"
DATA_DIR="$PROJ_DIR/data"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/userdata_${TIMESTAMP}.tar.gz"
KEEP_DAYS=7

# 個人データ対象ファイル
TARGET_FILES=(
  "users.json"
  "transactions.json"
  "credit_log.json"
  "login_log.json"
  "registration_attempts.json"
  "trusted_devices.json"
  "bans.json"
  "favorites.json"
)

mkdir -p "$BACKUP_DIR"

# 対象ファイルのみをバックアップ
TAR_ARGS=""
for f in "${TARGET_FILES[@]}"; do
  if [ -f "$DATA_DIR/$f" ]; then
    TAR_ARGS="$TAR_ARGS data/$f"
  fi
done

if [ -z "$TAR_ARGS" ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARN: No target files found, skipping backup"
  exit 0
fi

# 前回のバックアップと比較して変更がなければスキップ
LATEST=$(ls -t "$BACKUP_DIR"/userdata_*.tar.gz 2>/dev/null | head -1)
if [ -n "$LATEST" ]; then
  # 各対象ファイルのチェックサムを比較
  CURRENT_HASH=""
  for f in "${TARGET_FILES[@]}"; do
    if [ -f "$DATA_DIR/$f" ]; then
      CURRENT_HASH="$CURRENT_HASH$(md5sum "$DATA_DIR/$f" | cut -d' ' -f1)"
    fi
  done

  # 前回のハッシュファイルと比較
  HASH_FILE="$BACKUP_DIR/.last_hash"
  if [ -f "$HASH_FILE" ] && [ "$(cat "$HASH_FILE")" = "$CURRENT_HASH" ]; then
    exit 0  # 変更なし、スキップ
  fi

  # ハッシュ更新
  echo "$CURRENT_HASH" > "$HASH_FILE"
fi

tar -czf "$BACKUP_FILE" -C "$PROJ_DIR" $TAR_ARGS 2>/dev/null

if [ $? -eq 0 ]; then
  SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Userdata backup: $BACKUP_FILE ($SIZE)"
else
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: Userdata backup failed"
  exit 1
fi

# 古いバックアップを削除
find "$BACKUP_DIR" -name "userdata_*.tar.gz" -mtime +${KEEP_DAYS} -delete
