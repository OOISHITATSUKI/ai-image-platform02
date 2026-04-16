# VPSデプロイ手順 — AI Companion 機能追加分

対象：ImageNude (`/var/www/ai-image-platform02`)

## 0. 事前チェック（ローカルで完了済み）

- [x] `npm run build` が通る（25.7秒でCompiled successfully）
- [x] Supabase `companions` テーブル作成済み（`scripts/companions-migration.sql`）
- [x] Supabase `live_action_enabled` カラム追加済み（`scripts/companions-add-live-toggle.sql`）
- [x] 本番Supabase にキャラクターがseed済み（Admin経由でupsertされている）

## 1. コード push（ローカル）

```bash
cd ~/ai-image-platform02
git add -A
git status  # 確認：public/companions/videos/ は gitignore されている
git commit -m "feat: AI companion chat + Live Action + admin management"
git push origin master
```

## 2. VPSでコードpull & build

```bash
ssh <vps>
cd /var/www/ai-image-platform02
git pull origin master
npm install  # 新規依存なし（確認だけ）
npm run build
```

## 3. 動画ファイル同期（重要・ローカル → VPS）

Admin の動画アップロードはローカル `/public/companions/videos/` に保存される。
本番で再生させるには VPS に同期する必要あり。

```bash
# ローカル側のターミナルで
rsync -avz --progress \
  /Users/ooishitatsuki/ai-image-platform02/public/companions/videos/ \
  <user>@<vps>:/var/www/ai-image-platform02/public/companions/videos/
```

または動画は本番VPS上の Admin から直接アップロードしてもOK
（その場合はローカルは不要）。

### アバター画像も同じく（必要に応じて）

```bash
rsync -avz --progress \
  /Users/ooishitatsuki/ai-image-platform02/public/companions/avatars/ \
  <user>@<vps>:/var/www/ai-image-platform02/public/companions/avatars/
```

### 環境音mp3も（初回のみ）

```bash
rsync -avz --progress \
  /Users/ooishitatsuki/ai-image-platform02/public/companions/audio/ \
  <user>@<vps>:/var/www/ai-image-platform02/public/companions/audio/
```

## 4. nginx 設定（大容量アップロード対応）

500MB までの動画アップロードを通すため、VPSの nginx に下記を追加：

```nginx
# /etc/nginx/sites-available/imagenude (または同等のconfig)
server {
    # ...
    client_max_body_size 520m;
    client_body_timeout 600s;
    proxy_read_timeout 600s;
    # ...
}
```

反映：
```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 5. プロセス再起動（VPS）

既存の運用方法に合わせて：

```bash
# pm2 の場合
pm2 restart ai-image-platform02
pm2 logs --lines 30

# systemd の場合
sudo systemctl restart ai-image-platform02
sudo journalctl -u ai-image-platform02 -f
```

## 6. 動作確認

- [ ] https://imagenude.com/ → `/companions` にリダイレクトされる
- [ ] Featured Companions カードにavatar画像が表示
- [ ] Live Action ON のキャラは緑 `● LIVE` バッジ付き
- [ ] 任意キャラを開いてチャット（`POST /api/companion-chat` 200）
- [ ] Liveページで動画が再生される
- [ ] https://imagenude.com/admin/companions でCRUD可能
- [ ] Adminから画像/動画アップロード → 保存後にホーム反映

## 7. 環境変数確認（VPSの `.env.production` or `.env.local`）

必須：
- `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`（companion-chat で使用）
- `ADMIN_EMAILS`（Admin画面アクセス許可）
- `ADMIN_PASSWORD`（`/admin` 全体のBasic認証。middleware参照）

特に追加の新規 env は **なし**。

## 付録：ロールバック手順

```bash
# VPS
cd /var/www/ai-image-platform02
git log --oneline -10
git reset --hard <previousCommit>
npm run build
pm2 restart ai-image-platform02
```

Supabaseスキーマ変更をロールバックしたい場合：
```sql
-- 危険：データ消える
alter table companions drop column if exists live_action_enabled;
drop table if exists companions;
```

## 付録：動画メディアの運用方針

現状 `public/companions/videos/` は **gitignore**。運用パターン2つ：

**A. VPSで直接Adminからアップロード**（推奨）
- 本番URLで `/admin/companions/{id}` → Video upload
- 直接 VPSディスクに保存される
- ローカルとVPSでファイル分離
- チーム複数人でメンテナンスしやすい

**B. ローカルでアップロードしてVPSにrsync**
- ローカルのAdminでアップロード
- 上記 手順3 のrsyncで同期
- CDN運用を検討するなら移行候補

どちらでもOK。最初に使うワークフローを決めておく。
