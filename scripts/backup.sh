#!/bin/bash
# ============================================================
# データ自動バックアップスクリプト
# - data/ ディレクトリの全JSONファイルをtar.gzで保存
# - 30日以上古いバックアップは自動削除
# ============================================================

PROJ_DIR="/var/www/ai-image-platform02"
BACKUP_DIR="$PROJ_DIR/backups"
DATA_DIR="$PROJ_DIR/data"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/data_backup_${TIMESTAMP}.tar.gz"
KEEP_DAYS=30

mkdir -p "$BACKUP_DIR"

# バックアップ作成 (JSONファイルのみ、imagesディレクトリは除外)
tar -czf "$BACKUP_FILE" -C "$PROJ_DIR" \
  --exclude='data/images' \
  data/ 2>/dev/null

if [ $? -eq 0 ]; then
  SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup created: $BACKUP_FILE ($SIZE)"
else
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: Backup failed"
  exit 1
fi

# 古いバックアップを削除
DELETED=$(find "$BACKUP_DIR" -name "data_backup_*.tar.gz" -mtime +${KEEP_DAYS} -delete -print | wc -l)
if [ "$DELETED" -gt 0 ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Cleaned up $DELETED old backup(s)"
fi
