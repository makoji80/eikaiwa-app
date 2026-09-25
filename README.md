# eikaiwa（仮称）— 英会話アプリ 新規開発

「英会話アプリ新規開発 実装仕様書 v2.0」（[docs/spec](docs/spec/英会話アプリ新規開発_実装仕様書_v2.0.md)）に基づく新規プロジェクト。旧Expoアプリとは無関係の独立リポジトリ。

**現在の実装範囲：Phase 0（基盤）＋ Phase 1の最初の垂直スライス（テキストのみの中心会話ループ）。** 音声（STT/TTS）、My Momentsの永続保存・復習UI、個別化以降は未実装。詳細は [docs/OPEN-QUESTIONS.md](docs/OPEN-QUESTIONS.md) と [docs/decisions](docs/decisions/) を参照。

## 構成

```
apps/mobile      Expo (TypeScript, Expo Router) — iOS/Androidクライアント
apps/api         Node.js + TypeScript + Express — 秘密鍵を保持するサーバー
packages/contracts  Zodスキーマ／型定義 — mobile/apiが共有する唯一の契約
docs/            仕様書・決定記録・未決事項
```

## 前提

- Node.js 20+ (開発時はv24で動作確認)
- npm 10+
- iOS/Androidの実機確認には Expo Go アプリ、または Xcode/Android Studio のシミュレータ環境が必要（**本リポジトリの開発コンテナ自体には実機・シミュレータ環境がないため、実機確認はユーザー自身のMac/PCで行うこと**）

## セットアップ

```bash
npm install

# apps/api
cp apps/api/.env.example apps/api/.env
# .envを編集: JWT_SECRETをランダムな文字列に変更（openssl rand -hex 32 等）

# apps/mobile
cp apps/mobile/.env.example apps/mobile/.env
```

秘密値（JWT_SECRET, OPENAI_API_KEY等）は `.env` にのみ置き、コミットしない。`.env.example` は変数名のみを示す。

## 開発サーバーの起動

```bash
# APIサーバー（デフォルト http://localhost:4000、SQLiteのdev DBを自動作成）
npm run dev:api

# 別ターミナルでモバイルアプリ（Expo dev server）
npm run dev:mobile
```

モバイルアプリは `EXPO_PUBLIC_API_BASE_URL`（既定 `http://localhost:4000`）経由でAPIサーバーに接続する。実機で確認する場合は、Expo Goを起動した端末とPCが同一ネットワーク上にあり、この値を開発PCのLAN IPに変更する必要がある。

## AIプロバイダ

既定は `AI_PROVIDER=mock`（決定論的なモック応答、外部通信なし）。`apps/api/.env` に `OPENAI_API_KEY` を設定し `AI_PROVIDER=openai` に変更すると実際のOpenAI APIを呼び出す（**未検証** — 本サンドボックスには実鍵がなく実地テストできていない）。APIキーはサーバーの環境変数にのみ置き、クライアントには一切渡さない。

## 検証

```bash
npm run typecheck   # 全workspaceの型検査（apps/api, apps/mobile, packages/contracts）
npm run lint        # ESLint（apps/api, packages/contracts）
npm run test        # apps/api, packages/contracts の自動テスト（vitest, 計16件）
npm run lint --workspace apps/mobile  # apps/mobile は eslint-config-expo を使う別系統のlint
```

この開発環境で確認済み: 型検査・lint（0エラー）・自動テスト（16件全pass）に加えて、APIサーバーを実際に起動し signup→会話作成→compose（JP→EN候補）→reply（AI応答）→会話取得 の一連のHTTP疎通をcurlで実地確認済み。ただし実機・シミュレータでの動作確認は本リポジトリの開発環境では実施できないため、ユーザー自身の環境で `npm run dev:mobile` 後にExpo Go等で確認すること。

## 認証（開発用）

現時点では自前実装の email + password + JWT のみ（`POST /api/auth/signup`, `POST /api/auth/login`）。LINEログインやマネージド認証基盤（Supabase/Auth0/Clerk等）は未決・未実装。本番公開前に置き換えが必要（[docs/OPEN-QUESTIONS.md](docs/OPEN-QUESTIONS.md) 参照）。

## スコープ外（今回）

- 録音／音声認識（STT）／音声合成（TTS）
- My Momentsの永続保存・復習UI・折りたたみ一覧・spaced repetition出題
- English DNA・Autopilot・レベル推定・Real World・Future Me
- LINEログイン・マネージド認証・本番DB（Postgres等）への移行
- 実サービスのAPIキーでの実地検証、実機（iOS/Android）での動作確認
