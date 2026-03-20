---
created: "2026-03-13"
topic: "Umamiアナリティクス技術セットアップ"
type: technical-doc
tags: [analytics, umami, tracking, security]
---

# Umamiアナリティクス技術セットアップ

## 概要

GA4の代わりにUmami Cloud（cloud.umami.is）を使用。アダルトコンテンツのポリシーリスク回避が目的。

## 設計・方針

### スクリプト設置

- **設置場所**: `app/layout.tsx`（48行目付近）
- **サービス**: Umami Cloud

### 自分除外の仕組み

1. `app/layout.tsx` にて `strategy="beforeInteractive"` のインラインスクリプトをUmamiの前に配置
2. `localStorage.getItem('umami.disabled') === '1'` の場合、`window['umami.disabled'] = 1` を設定
3. Umamiスクリプトがこのフラグを検知し、トラッキングをスキップ
4. `/settings` ページに「Disable Umami tracking」トグルを実装済み（スマホでも設定可能）
5. ※ localStorage はブラウザ/デバイスごとに独立。新端末追加時は要設定

**自分除外設定**: PC & スマホ完了 ✅

## セキュリティ対策

### 実施済み

- **カスタム404ページ**: `app/not-found.tsx` 実装済み ✅
- **動的ルート制限**: 存在しないURL（セレブ名等）は全て404 ✅
- **robots.txt**: `/admin/`, `/api/` をDisallow ✅
- **sitemap.xml**: 全有効ページを登録 ✅

### 確認されたスパムURL（全て404対応済み）

- `/kourtney-kardashian/bikini-photos-of-*`
- `/emily-ratajkowski/emily-ratajkowski-sexy-*`
- `/marisa-papen/marisa-papen-naked-*`
- `/charly-jordan/charly-jordan-sexy-*`
- `/anna-friel/anna-friel-see-through-*`

## 登録フロー改善（最優先課題）

### 現在のフロー（3ステップ）

```
EMAIL入力 → メール認証(VERIFY) → パスワード設定
```

### 問題点（3/13 Umamiデータより）

- /register到達者の登録完了率: **0%**
- 3回の離脱ポイントがある
- メール認証ステップが致命的
- NSFWユーザーは匿名性重視（調査で52%が「匿名で使いたい」）

### 改善案（優先度順）

1. **メール認証を後回し** — 登録時はメール+パスワードのみ。認証は課金時に要求
2. **Googleログイン追加** — ボタン1つ。ただしNSFW+Google紐付けを嫌う人も
3. **登録なしで1回試せる** — 最もCV率高いが開発工数大

### エディターUI改善

- 3ペイン → 2ペイン レイアウト変更
- ワンクリック生成ボタン（初回ユーザー向け）
- プロンプト欄のプレースホルダーローテーション
- 設定・Character Tags をデフォルト折りたたみ
- 指示書: `antigravity-editor-redesign-spec.md`

## 参考

- Umami Cloud: cloud.umami.is
- marketing/analytics-and-seo.md（マーケ側のアナリティクス分析）
