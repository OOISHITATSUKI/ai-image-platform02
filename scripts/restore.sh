#!/bin/bash
# ============================================================
# データ復元スクリプト
# 使い方:
#   ./scripts/restore.sh                    → 最新バックアップから復元
#   ./scripts/restore.sh backups/data_backup_20260310_120000.tar.gz  → 指定ファイルから復元
# ============================================================

PROJ_DIR="/var/www/ai-image-platform02"
BACKUP_DIR="$PROJ_DIR/backups"
DATA_DIR="$PROJ_DIR/data"

# 引数がなければ最新バックアップを使う
if [ -z "$1" ]; then
  BACKUP_FILE=$(ls -t "$BACKUP_DIR"/data_backup_*.tar.gz 2>/dev/null | head -1)
  if [ -z "$BACKUP_FILE" ]; then
    echo "ERROR: バックアップファイルが見つかりません"
    exit 1
  fi
else
  BACKUP_FILE="$1"
  # 相対パスの場合にプロジェクトディレクトリ基準にする
  if [[ ! "$BACKUP_FILE" = /* ]]; then
    BACKUP_FILE="$PROJ_DIR/$BACKUP_FILE"
  fi
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: ファイルが存在しません: $BACKUP_FILE"
  exit 1
fi

echo "========================================"
echo "復元元: $BACKUP_FILE"
echo "復元先: $DATA_DIR"
echo "========================================"
echo ""

# バックアップの中身を表示
echo "--- バックアップ内容 ---"
tar -tzf "$BACKUP_FILE" | head -20
echo ""

# 確認
read -p "現在のデータを上書きして復元しますか？ (y/N): " CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
  echo "キャンセルしました"
  exit 0
fi

# 現在のデータをバックアップ (安全のため)
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
PRE_RESTORE="$BACKUP_DIR/pre_restore_${TIMESTAMP}.tar.gz"
tar -czf "$PRE_RESTORE" -C "$PROJ_DIR" --exclude='data/images' data/ 2>/dev/null
echo "復元前のデータを保存: $PRE_RESTORE"

# 復元実行
tar -xzf "$BACKUP_FILE" -C "$PROJ_DIR"

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ 復元完了！"
  echo ""
  echo "アプリを再起動してください:"
  echo "  pm2 restart ai-image-platform"
else
  echo "ERROR: 復元に失敗しました"
  exit 1
fi
