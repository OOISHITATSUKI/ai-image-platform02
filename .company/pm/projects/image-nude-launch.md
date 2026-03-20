---
created: "2026-03-13"
updated: "2026-03-13"
project: "Image Nude ローンチ & グロース"
status: in-progress
tags: [launch, growth, phase1, roadmap]
---

# プロジェクト: Image Nude ローンチ & グロース

## 概要
サイト公開後のグロースフェーズ。SEO・SNS・機能改善を並行して進め、収益化を目指す。

## ゴール
- Phase 1: Xフォロワー100人 + SEO流入開始
- Phase 2: 初収益 + アフィリエイト開始
- 長期: 月間1億円のプロダクト

## マイルストーン

| # | マイルストーン | 期限 | 状態 |
|---|-------------|------|------|
| 1 | 新ブログ3本公開 + インデックス申請 | 2026-03-14 | open |
| 8 | ホーム画面改修の効果測定（デモ試行数・登録者数） | 2026-03-21 | open |
| 9 | Xフォロワー30人到達 | 2026-03-21 | open |
| 2 | Xフォロワー100人到達 | — | open |
| 3 | SEO検索流入の確認 | 2026-03-24 | open |
| 4 | アフィリエイトシステム実装 | — | open |
| 5 | Reddit本格参入 | — | open |
| 6 | CCBill決済導入 | — | open |
| 7 | エストニア法人設立 | — | open |

---

## ロードマップ

### 完了済み

| タスク | カテゴリ |
|-------|---------|
| Xプロフィール設定（@Hikarikuronuma） | マーケティング |
| X初投稿（日本語 Before/After） | SNS |
| フリップカード ヒーローセクション | プロダクト |
| 管理画面ホームボタン追加 | プロダクト |
| Umamiアナリティクス導入 | インフラ |
| NowPayments IPN Webhook修正（RAW body HMAC、シークレット再生成） | インフラ |
| カスタム404、動的ルート制限、robots.txt、sitemap.xml | SEO |
| Google Search Console設定・サイトマップ提出（14ページ検出） | SEO |
| `messages`テーブルのbase64肥大化対応 | インフラ |
| 顔保存機能（My Faces）実装 | プロダクト |
| ホームページ（ダークテーマ・3Dフリップカード・デモゾーン） | プロダクト |
| LP 2本 HTML完成（`/undress-ai`, `/face-swap`） | SEO |
| ブログ 3本 HTML完成 | SEO |

### 進行中

| タスク | カテゴリ | 詳細 |
|-------|---------|------|
| X毎日投稿（日英ローテーション） | SNS | 1投稿/日 + 5〜10リプライ/日 |
| Umamiアクセス除外 | インフラ | layout.tsx調整 |

### 高優先（今週）

| タスク | カテゴリ | 詳細 |
|-------|---------|------|
| SEO LP・ブログをNext.jsに実装 | 開発 | HTML完成済み、Next.js実装待ち |
| sitemap.xml 更新 | SEO | 新3本のURL追加 |
| Search Consoleでインデックス申請 | SEO | 新3本 |
| Supabase `chats` テーブル修正 | 開発 | エラーコード57014、インデックス追加 or クエリ最適化 |
| lit.link取得・URL差し替え | マーケ | 直接URLを出さずリンクツリー経由に |
| Before/After画像20セット作成 | SNS | 顔3種 × シチュエーション |
| Redditアカウント作成・カルマ稼ぎ | マーケ | r/StableDiffusion, r/aiArtにコメント |
| `<meta name="rating" content="adult" />` 追加 | 開発 | `app/layout.tsx` に追加 |

### 中優先（今月）

| タスク | カテゴリ | 詳細 |
|-------|---------|------|
| シチュエーションタグ追加 | プロダクト | ベッド/シャワー/プール等（ユーザー需要68%） |
| Umamiイベントトラッキング追加 | インフラ | signup / first-generation / view-pricing / purchase |
| Reddit初投稿 | マーケ | r/NSFWai でBefore/After |
| Pixivアカウント開設・初投稿 | マーケ | 日本市場攻略 |
| SEOブログ記事5本 | マーケ | 「AI undress」「AI nude generator free」等 |
| アフィリエイト仕様策定 | 収益化 | 30%リカーリング暗号通貨報酬 |
| 「See the Magic Yourself」コピー改善 | プロダクト | — |

### 来月

| タスク | カテゴリ | 詳細 |
|-------|---------|------|
| YouTube Shortsチャンネル開設 | マーケ | Hikari AI Lab |
| 競合比較コンテンツ作成 | マーケ | vs SoulGen/Promptchan |
| バッチ生成（複数枚同時） | プロダクト | 無料=1枚/Basic=3枚/Pro=5枚 |
| マルチプロバイダーAPI構成 | インフラ | NovitaAI依存を分散 |
| アフィリエイト機能実装 | 収益化 | ref追跡→報酬計算→NowPayments連携 |
| CCBillクレジットカード決済導入 | 収益化 | 課金障壁20%除去 |
| Discordコミュニティ開設 | チャネル拡大 | プロンプト共有・フィードバック |

### 将来

| タスク | カテゴリ | 詳細 |
|-------|---------|------|
| 動画生成 v1 | プロダクト | 61%要望。Wan2.1等オープンソース検討 |
| 部分編集Inpaint拡張 | プロダクト | 55%要望。体型・表情変更 |
| インフルエンサー声かけ | 収益化 | Web3/Crypto系にアフィリエイト提案 |
| エストニア法人設立 | 法務 | クレカ決済の法人契約 |

---

## 関連部署
- SNS: X運用（`sns/x-operation-rules.md`）
- マーケティング: SEO・導線（`marketing/analytics-and-seo.md`）
- 開発: 機能実装（`engineering/docs/product-overview.md`）
- 法務: コンプライアンス（`legal/docs/crypto-payment-compliance.md`）

## 競合分析からの戦略的インサイト（2026-03-13）

> 詳細: `marketing/competitive-analysis.md`

### 市場ポジション
- Image Nudeは「画像生成 + Undress + Face Swap統合」のハイブリッド型で唯一のポジション
- 最大競合Promptchanは月間4.32M訪問。Image Nudeとの差は数千倍
- 価格帯は市場平均よりやや高め（$14.99 vs 競合$5.99〜$12.99）だが、オールインワンを訴求すればコスパ勝負できる

### CCBill決済の緊急度
- 競合8社中6社がクレカ対応。暗号のみは重大なCVR障壁
- 推定20〜40%の見込み客が決済段階で離脱
- → エストニア法人化とCCBill導入をPhase 2の最優先に格上げすべき

### アフィリエイトの市場相場
- 市場標準: 30〜50% RevShare（ライフタイム）
- Image Nudeの計画30%は最低ライン。差別化には40%以上が効果的
- 暗号報酬対応は他にほぼなく、差別化要素になる

### Reddit参入の重要性
- Promptchanのトラフィック28.34%がオーガニック検索、46.9%がDirect
- Reddit経由の流入はPornJourneyでx.com(2.86%)を上回る可能性
- r/NSFWai, r/aiporn が最重要コミュニティ

## メモ
- NSFWコンテンツはアルゴリズムにリーチを絞られている → SFWメイン投稿が重要
- 顔保存機能が揃った今がReddit投稿タイミングとして最適
- 初回ユーザーの離脱ポイントはエディターUI
- Stripeは利用不可（NSFWコンテンツ規約違反）
- 有名人名の動的ルートはSEO・法的リスク・ボットトラフィックの三重リスク
