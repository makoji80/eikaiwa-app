# apps/mobile

Expo (TypeScript, Expo Router) のクライアントアプリ。全体像・セットアップ手順はリポジトリルートの [README](../../README.md) を参照。

## このアプリ固有のメモ

- 画面は `src/app/` 配下（Expo Routerのfile-basedルーティング）。`src/app/index.tsx` がホーム、`src/app/conversation/[id].tsx` が会話画面。
- 状態管理は zustand（`src/state/`）。会話フローの状態機械は `src/state/conversationMachine.ts` に純粋関数として切り出してある。
- JWTは `expo-secure-store` に保存する（AsyncStorageへの平文保存はしない）。
- `EXPO_PUBLIC_API_BASE_URL` 以外の環境変数（APIキー等）をこのアプリに追加しないこと。`EXPO_PUBLIC_` プレフィックスの変数はビルド時にクライアントバイナリへそのまま埋め込まれる。

## コマンド

```bash
npm run dev        # Expo dev server
npm run typecheck  # tsc --noEmit
npm run lint       # expo lint (eslint-config-expo, legacy .eslintrc)
```

実機・シミュレータでの動作確認は本開発コンテナでは実施できない。`npm run dev` 後、Expo Go または `expo run:ios`/`expo run:android` で実機確認すること。
