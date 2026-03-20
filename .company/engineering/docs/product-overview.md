---
created: "2026-03-13"
updated: "2026-03-13"
topic: "プロダクト概要・技術構成"
type: technical-doc
tags: [product, infrastructure, stack, models, deploy]
---

# Image Nude — プロダクト概要

## 実装済み機能

### プロダクト
- txt2img（テキストから画像生成）
- img2img（画像変換）
- Inpaint / Nude Mode（部分編集・脱衣）
- Face Swap（顔交換）
- img2vid（画像から動画、Kling V2.1 Master）
- スタイルプリセット × 7
- 髪色 × 7 / 髪型 × 7
- 年齢拡張 × 4段階
- Resolution制限 + 課金誘導UI
- **顔保存機能（My Faces）**
  - 無料：生成画像から登録、1個まで
  - 有料：画像アップロード登録、10個まで
  - txt2img / Face Swap 両方で使用可能

### ホームページ
- ダークテーマ・レッドアクセント
- ヒーローセクション（3Dフリップカード）
- txt2imgデモゾーン（Ethnicity選択・Bust Sizeスライダー・シーンプロンプト）
- デモ：2回/デバイス/24h制限

## 料金プラン

| プラン | 価格 | クレジット |
|--------|------|-----------|
| 無料 | $0 | 20cr（登録時） |
| Basic | $14.99 | 100cr |
| Unlimited | $29.99 | 300cr |

## 決済

- NowPayments（仮想通貨 50種以上）
- クレジットカード：未対応（将来的にCCBill検討。海外法人整備後）
- **Stripeは利用不可**（NSFWコンテンツ規約違反）

## インフラ

| コンポーネント | 技術 |
|---|---|
| VPS | 45.130.167.90（Ubuntu + PM2 + Nginx） |
| フレームワーク | Next.js（App Router）+ TypeScript |
| DB/Auth | Supabase |
| 画像生成 | NovitaAI |
| 動画生成 | NovitaAI Kling V2.1 |
| プロンプト最適化 | Claude API（`claude-sonnet-4-20250514`） |
| アナリティクス | Umami（自己ホスト） |
| 検索 | Google Search Console |
| 決済 | NowPayments |
| リンク集約 | lit.link |

## 推奨SDXLモデル

| モデル | 特徴 |
|--------|------|
| RealVisXL V5.0 | 汎用高品質 |
| Juggernaut XL V11 | リアリスティック |
| HelloWorld XL V7.0 | アジア系顔に最適 |

## デプロイ手順

```bash
rm -rf .next && npm run build && pm2 reload all --update-env
```

### VPS作業
```bash
ssh root@45.130.167.90
tmux  # セッション保護
cd /var/www/ai-image-platform02
claude  # Claude Code起動（CLAUDE.mdが仕様書）
```

## 技術的知見（重要）

| 知見 | 内容 |
|------|------|
| Claude APIモデル名の陳腐化 | 定期的に全コードベースのモデル名を確認すること |
| NovitaAI v3 async制約 | `ip_adapters`非対応、ControlNet OpenPoseはSD1.5のみ |
| Base64のDB保存は禁止 | `messages`テーブルでタイムアウト発生の前例あり |
| zsh heredocの`!`問題 | 複雑なファイル修正はPythonスクリプト経由で |
| 有名人名の動的ルートは危険 | SEO・法的リスク・ボットトラフィックの三重リスク |
| Stripeは利用不可 | NSFWコンテンツはNowPayments（暗号）かCCBill等 |
| Kling V2.1パラメータ | `duration`は文字列型、`guidance_scale`は[0,1]範囲 |
| Supabase base64肥大化 | メインクエリから `image_url` 除外、直近10件のみ別クエリで取得 |

## 競合比較から見た技術的優先事項

> 出典: `marketing/competitive-analysis.md`（2026-03-13）

### 最優先: CCBill決済統合
- 競合の大半がクレカ対応。Image Nudeは暗号のみで推定20〜40%の見込み客が離脱
- CCBill手数料 〜14.5%。Epoch/Segpayも代替候補
- 法人設立（エストニア）が前提条件

### 高優先: 機能ギャップ分析

| 機能 | Image Nude | Promptchan | SoulGen | 対応要否 |
|------|-----------|-----------|---------|---------|
| txt2img | ✅ | ✅ | ✅ | — |
| img2img | ✅ | ❌ | ❌ | 優位 |
| Undress/Inpaint | ✅ | 限定的 | ✅ | 優位 |
| Face Swap | ✅ | ❌ | ✅（2.0〜） | 優位 |
| 動画生成 | ✅ | ✅（V4） | ✅（20秒） | 同等 |
| 顔保存 | ✅ | ❌ | ❌ | 優位 |
| ポーズライブラリ | ❌ | ✅（V8） | ❌ | 検討 |
| AIチャット | ❌ | ✅ | ❌ | 将来検討 |
| Outpaint | ❌ | ❌ | ✅（2.0〜） | 低優先 |

### 注目すべき競合技術動向
- Promptchan V8（2026/02）: 解剖学的正確性の大幅改善、ポーズライブラリ
- SoulGen 2.0: AI Outpainting、20秒動画生成
- Seduced AI: 8層エクステンションミキシング（体型+ポーズ+衣装+フェティッシュ+環境を同時制御）

## 現在の課題

### Supabase Statement Timeout（優先度：高）
- エラーコード：57014
- 発生箇所：`chats`テーブルのクエリ
- 原因：インデックス不足またはデータ量増加
- 対応予定：インデックス追加 or クエリ最適化
