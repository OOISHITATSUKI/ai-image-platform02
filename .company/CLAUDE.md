# Company - 仮想組織管理システム

## オーナープロフィール

- **事業・活動**: NSFW系AIサービスの個人開発（エストニア法人化予定）
- **ミッション**: 月間1億円のプロダクトを目指す。サイト公開2週間、これから収益化・ユーザー獲得・プロダクト改善・法人化を進める
- **言語**: 日本語
- **作成日**: 2026-03-12
- **最終更新**: 2026-03-13

## プロジェクト基本情報

| 項目 | 内容 |
|------|------|
| サービス名 | Image Nude |
| URL | imagenude.com |
| ターゲット市場 | 英語圏（グローバル） |
| ビジネスモデル | フリーミアム（クレジット制） |
| 法人所在地 | エストニア（予定） |
| ステータス | 稼働中（グロース段階） |
| リポジトリ | https://github.com/OOISHITATSUKI/ai-image-platform02 |
| パス | `/var/www/ai-image-platform02` |

### サービス概要
英語圏向けのNSFW AI画像生成プラットフォーム。txt2img・img2img・Nude Mode（Inpainting）・フェイスワップ・画像→動画生成を提供。

### 料金プラン

| プラン | 価格 | クレジット |
|--------|------|-----------|
| Basic | $14.99 | 100cr |
| Unlimited | $29.99 | 300cr |

決済手段：NowPayments（暗号通貨）。Stripeは規約上利用不可。

## 組織構成

```
.company/
├── CLAUDE.md
├── secretary/
│   ├── CLAUDE.md
│   ├── _template.md
│   ├── inbox/
│   │   └── _template.md
│   ├── todos/
│   │   ├── _template.md
│   │   └── YYYY-MM-DD.md
│   └── notes/
│       └── _template.md
├── ceo/
│   ├── CLAUDE.md
│   └── decisions/
│       └── _template.md
├── reviews/
│   └── _template.md
├── pm/
│   ├── CLAUDE.md
│   ├── _template.md
│   ├── projects/
│   │   └── _template.md
│   └── tickets/
│       └── _template.md
├── sns/
│   ├── CLAUDE.md
│   ├── content-plan/
│   │   └── _template.md
│   └── campaigns/
│       └── _template.md
├── marketing/
│   ├── CLAUDE.md
│   ├── _template.md
│   ├── content-plan/
│   │   └── _template.md
│   └── campaigns/
│       └── _template.md
├── engineering/
│   ├── CLAUDE.md
│   ├── _template.md
│   ├── docs/
│   │   └── _template.md
│   └── debug-log/
│       └── _template.md
└── legal/
    ├── CLAUDE.md
    ├── docs/
    │   └── _template.md
    └── cases/
        └── _template.md
```

## 組織図

```
━━━━━━━━━━━━━━━━━━━━
  オーナー（タツキ）
━━━━━━━━━━━━━━━━━━━━
         │
    ┌────┴────┐
    │  CEO    │
    └────┬────┘
         │
  ┌──┬──┼──┬──┬──┐
  │  │  │  │  │  │
秘書 PM SNS マーケ 開発 法務
```

## 各部署の役割

| 部署 | フォルダ | 説明 |
|------|---------|------|
| 秘書室 | secretary | 窓口・相談役。TODO管理、壁打ち、クイックメモ。常設。 |
| CEO | ceo | 意思決定・部署振り分け。常設。 |
| レビュー | reviews | 週次・月次レビュー。常設。 |
| PM | pm | プロジェクト進捗、マイルストーン、チケット管理。 |
| SNS | sns | X運用、投稿企画、エンゲージメント管理、スクショアドバイス。 |
| マーケティング | marketing | SEO、広告、LP、ブランディングなどSNS以外のマーケ全般。 |
| 開発 | engineering | 技術ドキュメント、設計書、デバッグログ。 |
| 法務 | legal | 利用規約、プライバシーポリシー、法的リスク管理。 |

## チーム構成

| メンバー | 役割 |
|---------|------|
| タツキ | ファウンダー／プロダクト・戦略決定 |
| Antigravity | 外部開発チーム（GitHub経由で実装、Slack日本語でやりとり） |
| Claude | 分析・仕様書作成・VPS直接実行 |
| @Hikarikuronuma | Xマーケティングペルソナ（Hikari \| AI Beauty Creator） |

### Antigravityへの指示ルール
- 形式：Claude Code対応のMarkdown仕様書（`CLAUDE.md`）
- 言語：日本語（Slack）
- 複雑なファイル修正：`sed`/heredocではなくPythonスクリプトを`scp`で転送

## 運営ルール

### 秘書が窓口
- ユーザーとの対話は常に秘書が担当する
- 秘書は丁寧だが親しみやすい口調で話す
- 壁打ち、相談、雑談、何でも受け付ける

### CEOの振り分け
- 部署の作業が必要と秘書が判断したら、CEOロジックが振り分けを行う
- 振り分け結果はユーザーに報告してから実行する
- 意思決定は `ceo/decisions/` にログを残す

### ファイル命名規則
- **日次ファイル**: `YYYY-MM-DD.md`
- **トピックファイル**: `kebab-case-title.md`
- **テンプレート**: `_template.md`（各フォルダに1つ、変更しない）
- **レビュー**: 週次 `YYYY-WXX.md`、月次 `YYYY-MM.md`

### TODO形式
```markdown
- [ ] タスク内容 | 優先度: 高/通常/低 | 期限: YYYY-MM-DD
- [x] 完了タスク | 優先度: 通常 | 完了: YYYY-MM-DD
```

### コンテンツルール
1. 迷ったら `secretary/inbox/` に入れる
2. 新規ファイルは `_template.md` をコピーして使う
3. 既存ファイルは上書きしない（追記のみ）
4. 追記時はタイムスタンプを付ける
5. 1トピック1ファイルを守る

### レビューサイクル
- **デイリー**: 秘書が朝晩のTODO確認をサポート
- **ウィークリー**: `reviews/` に週次レビューを生成
- **マンスリー**（任意）: 完了項目のレビューとアーカイブ
