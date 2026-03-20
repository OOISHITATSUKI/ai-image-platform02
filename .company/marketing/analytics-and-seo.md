---
created: "2026-03-12"
updated: "2026-03-13"
topic: "アナリティクス・SEO・導線設計"
status: active
tags: [analytics, seo, umami, gsc, blog, lp, affiliate]
---

# アナリティクス・SEO・導線設計

## アナリティクス（Umami）

### 設定状況
- **自分除外設定**: PC & スマホ完了 ✅
- ※ localStorage はブラウザ/デバイスごとに独立。新端末追加時は要設定

### 流入データ推移

**3/7（自分除外前）**:
- Visitors: 3 / Views: 31 / Bounce: 50% / Duration: 15m28s（自分含む）
- 国: Russia 33%, US 33%, Japan 33%
- ソース: google.com, imagenude.com

**3/8（自分除外後・Xリプ欄URL追加後）**:
- Visitors: 6（5カ国に分散）
- 国: Japan, India, Bangladesh, Singapore, Australia
- ソース: t.co（X）、google.com、imagenude.com
- **Xからの初流入確認** ✅

**3/13（最新）**:
- Visitors: 5 / Visits: 5 / Views: 7
- Bounce rate: 60% / Visit duration: 5s
- 国: China 40%, Japan 40%, Slovakia 20%
- ソース: google.com のみ（X流入ゼロ）
- 実質ユーザー: 3人（5人中2人はセレブ名スパムボット）
- ページ: /editor 2人, /register 2人, / 1人
- **登録完了: 0人 / 生成: 0人**

### ファネル分析（3/13）

```
サイト訪問 ── 3人（スパム除外後）
    ↓ 67%
/register到達 ── 2人
    ↓ 0%
登録完了 ── 0人 ★最大のボトルネック
    ↓
生成 ── 0人
```

**最大の問題: 登録ページまで来ているのに誰も登録完了しない**

### トラフィック計測
- Umami（セルフホスト）でチャネル別分析
- t.co参照 = X/Twitterトラフィック
- lit.link経由でリンクアトリビューション集約

## Google Search Console

- **登録完了** ✅（HTMLファイル認証 via Namecheap）
- **サイトマップ送信済み** ✅（2026/03/10）
- **検出ページ数**: 14（新3本追加後は17予定）
- **インデックス申請済み**（全ページ）

## SEO — 公開済みページ（全8本）

### LP（ランディングページ）
| URL | 内容 |
|-----|------|
| `/undress-ai` | Inpaint / Nude Mode LP |
| `/face-swap` | Face Swap LP |

### ブログ記事
| URL | 内容 |
|-----|------|
| `/blog/best-ai-undress-tools` | 比較記事（Top 7ランキング） |
| `/blog/how-to-generate-nsfw-ai-images` | ハウツー記事（初心者向け） |
| `/blog/ai-face-swap-adults` | FaceSwap比較記事 |
| `/blog/how-to-create-consistent-ai-character` | 顔保存機能ハウツー |
| `/blog/ai-face-swap-vs-deepfake` | 比較・解説記事 |
| `/blog/how-to-use-ai-face-swap-adults` | FaceSwapハウツー |

### 内部リンク
- フッターに `/undress-ai` / `/face-swap` / `/blog` リンク追加済み
- トップページ「Powerful Tools」セクションからLP各ページへリンク済み
- ブログ記事間の相互リンク実装済み

### SEO対応状況
- [x] Google Search Console 登録 & サイトマップ送信
- [x] カスタム404 & 動的ルート制限
- [x] robots.txt（`/admin/`, `/api/` をDisallow）
- [x] sitemap.xml（全有効ページ登録）
- [x] `<meta name="rating" content="adult" />` を `app/layout.tsx` に追加 ✅ 完了: 2026-03-13

### トップページコピー
```
AI Undress Tool.
Upload a photo. Remove clothing.
Done in 8 seconds.
```

## URL・導線設計

### 方針
- **lit.link統合**: 全チャネルのURLをlit.link経由に統一
- **UTMパラメータは使用しない**（lit.link統合後はlit.linkのアナリティクスで計測）
- **imagenude.comはSNSプロフィールに直接掲載しない**（lit.link経由）

### 現在の構成
| 場所 | URL |
|---|---|
| Xプロフィール | imagenude.com（lit.link取得後に変更） |
| リプ欄 | imagenude.com（lit.link取得後に変更） |

### lit.link（未取得）
- フォロワー100人到達後に取得予定
- lit.link内のリンクにアトリビューション設定
- 全チャネルのURLをlit.linkに統一

## アフィリエイトシステム（計画中）

- 報酬: 売上**30%**リカーリング
- 支払い: 月次（末締め翌月10日払い）
- 最低支払い額: $50相当
- 支払い通貨: 仮想通貨（NowPayments）
- 実装: ref追跡→報酬計算→NowPayments連携

## 今後のマーケ施策

### 今週
- [ ] 新ブログ3本を公開 → sitemap更新 → インデックス申請
- [ ] Search Consoleのデータ確認
- [x] `<meta name="rating" content="adult" />` 追加 ✅ 完了: 2026-03-13
- [ ] SEO効果を2週間観察

### フォロワー100人到達時
- [ ] lit.link取得 & XプロフィールURL差し替え
- [ ] メインツイートでのサービス紹介開始

### 中期
- [ ] アフィリエイトシステム実装
- [ ] 「See the Magic Yourself」セクションのコピー改善
- [ ] Redditアカウント作成 & カルマ稼ぎ → 初投稿（r/NSFWai）
- [ ] Pixivアカウント作成・初投稿
- [ ] SEOブログ記事5本追加（「AI undress」「AI nude generator free」等）
- [ ] Search Consoleデータに基づくSEO戦略調整
- [ ] 競合比較コンテンツ作成（vs SoulGen/Promptchan）

### 将来
- [ ] YouTube Shortsチャンネル開設（Hikari AI Lab）
- [ ] CCBill等クレジットカード決済（海外法人整備後）
- [ ] Redditへの本格参入
- [ ] Discordコミュニティ開設（プロンプト共有・フィードバック）
- [ ] インフルエンサー声かけ（Web3/Crypto系にアフィリエイト提案）
