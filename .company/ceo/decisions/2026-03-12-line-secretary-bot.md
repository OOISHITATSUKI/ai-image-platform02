---
date: "2026-03-12"
decision: "LINE秘書ボット（コマンド式）を導入"
departments: [engineering, secretary]
status: decided
---

# 意思決定: LINE秘書ボットの導入

## 背景
外出先からLINEで秘書に指示を出したい。メモやTODO管理をモバイルからも行えるようにする。

## 判断内容
imagenude.comのNext.jsアプリにLINE Webhookエンドポイントを追加。コマンド式のボットで.company/フォルダに直接読み書き。

## 振り分け先
| 部署 | 指示内容 |
|------|---------|
| 開発 | Webhookエンドポイント実装、署名検証、コマンド処理 |
| 秘書室 | ボット運用開始 |

## 対応コマンド
- `/help` — コマンド一覧
- `/todo [内容]` — TODOに追加
- `/done [番号]` — TODOを完了
- `/list` — 今日のTODO一覧
- `/memo [内容]` — Inboxにメモ
- `/dashboard` — ダッシュボード表示
- コマンドなしのメッセージ → 自動的にInboxに保存

## 技術詳細
- エンドポイント: `/api/webhooks/line`
- 認証: LINE署名検証（HMAC-SHA256）
- .companyフォルダに直接読み書き

## フォローアップ
- [x] Webhook検証成功
- [x] コマンド応答確認
