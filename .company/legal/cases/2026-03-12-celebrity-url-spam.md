---
created: "2026-03-12"
case: "セレブ名URLスパムアクセス対応"
status: resolved
priority: high
tags: [deepfake, legal-risk, seo]
---

# セレブ名URLスパムアクセス対応

## 背景
Umamiで以下のスパムURLアクセスを確認：
- `/kourtney-kardashian/bikini-photos-of-kourtney-kardashian`
- `/emily-ratajkowski/emily-ratajkowski-sexy-easy-2016-s01...`
- `/marisa-papen/marisa-papen-naked-24-photos`

## リスク・影響
- **法的リスク**: ディープフェイク扱いされる可能性
- **SEO汚染**: これらのURLがインデックスされるとサイト評価に悪影響

## 対応（実施済み）
- [x] カスタム404ページ実装（`app/not-found.tsx`）
- [x] 動的ルート制限（存在しないURL = 全て404）
- [x] robots.txt で `/admin/`, `/api/` をDisallow
- [x] sitemap.xml に有効ページのみ登録

## 追加対応（必要に応じて）
- [ ] Search Consoleでインデックス削除リクエスト（スパムURLが万が一インデックスされた場合）

## 学び
- セレブ名URLは法的リスクが高い。404対応は必須
- アダルトサイトはスパムボットの標的になりやすい
