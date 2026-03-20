---
date: "2026-03-12"
decision: "SNS投稿リマインドをLINE Messaging APIで毎日12:00に通知"
departments: [engineering, marketing, secretary]
status: decided
---

# 意思決定: SNS投稿リマインドの自動化

## 背景
SNSの毎日の更新（画像作成・投稿文作成）が課題。忘れ防止のため毎日12:00にリマインドが欲しい。

## 判断内容
LINE Messaging APIを使って毎日日本時間12:00にプッシュ通知を送信する。

## 振り分け先
| 部署 | 指示内容 |
|------|---------|
| 開発 | LINE通知スクリプト・cron設定 |
| マーケ | SNS投稿の運用フローに組み込み |
| 秘書室 | TODO更新 |

## 理由
- LINE Notifyは2025年3月末で終了済み → Messaging APIを採用
- cronで永続的に動作（セッション依存しない）
- サーバーがUTCなのでUTC 03:00 = JST 12:00で設定

## 技術詳細
- スクリプト: `.company/scripts/line-reminder.sh`
- 認証情報: `.company/.env`
- ログ: `.company/scripts/reminder.log`
- cron: `0 3 * * * /var/www/ai-image-platform02/.company/scripts/line-reminder.sh`

## フォローアップ
- [x] テスト送信成功
- [x] cron登録完了
- [ ] LINEの公式アカウントを友だち追加済みか確認
