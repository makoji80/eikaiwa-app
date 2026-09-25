# 0001. Phase 0 技術選定

- 日付: 2026-09-25
- 状態: 採用（変更可能。仕様書 v2.0 セクション0の通り、これは初期案であり実装時の検証結果次第で更新する）

## 背景

仕様書 v2.0 は技術の初期案として「TypeScript／React Native／Expo」「TypeScriptのサーバーAPI」「マネージド認証とDB・オブジェクトストレージ」を挙げつつ、具体的な提供元・SDK・サービスは実装着手時に選定するとしている。本サンドボックス環境の制約（Docker/Postgres無し、iOS/Android実機・シミュレータ無し、Node 24 + npm 11のみ利用可能、npm registry/GitHubへのネットワーク到達性あり）を踏まえ、Phase 0で以下を採用する。

## 決定

| 項目 | 選定 | 理由 |
|---|---|---|
| モノレポ管理 | npm workspaces | 追加ツール不要。pnpm/turborepoは将来の最適化候補 |
| モバイル | Expo (TypeScript, Expo Router) | 公式テンプレート、iOS/Android共通、file-basedルーティング |
| サーバー | Node.js + TypeScript + Express + Zod | Zodをpackages/contractsの単一ソースにでき、Expressは学習コストが低い |
| DB (dev) | Prisma ORM + SQLite | ゼロセットアップ。schema.prismaはPostgres移行を見据えて設計 |
| DB (本番候補) | 未決（Postgres系マネージドサービスを想定） | 仕様書セクション13 #4/#5に依存。契約層(Prisma+Zod)は変えずに切替可能な設計 |
| 認証 (dev) | 自前 email+password + JWT (bcrypt, jsonwebtoken) | マネージド認証・LINEログインの採否が未決のため、検証可能な最小実装を先に用意 |
| 認証 (本番候補) | 未決（Supabase Auth / Auth0 / Clerk / Firebase Authなど） | 仕様書セクション13 #2に依存 |
| AIプロバイダ | 抽象化インターフェース + MockAiProvider（既定） + OpenAiProvider（鍵設定時のみ有効） | 実鍵が無い環境でもcompose/reply契約を全経路検証できる。将来Anthropic等への切替も同インターフェースで可能 |
| オブジェクトストレージ（音声） | 未着手（Phase 0はテキストのみのため対象外） | 音声フェーズ着手時に選定 |

## 影響

- packages/contracts の型・Zodスキーマが mobile/api 双方の唯一の契約源になる。
- 認証・DBを本番向けに差し替える際も、ルート層・Prismaスキーマのインターフェースを大きく変えない設計とした。
- 実機（iOS/Android）での動作確認は本サンドボックスでは実施不可。ユーザー自身の環境での確認が必要（README参照）。
