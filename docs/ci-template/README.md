# CI設定テンプレート

`ci.yml` はGitHub Actions用の設定だが、このリポジトリへのpushに使っているGitHub連携が
`workflow` 権限を持っていないため、`.github/workflows/` に置くとpushそのものが拒否される
（`refusing to allow an OAuth App to create or update workflow ... without 'workflow' scope`）。

有効化する場合は、GitHubの画面上で直接 `.github/workflows/ci.yml` を新規作成して
このファイルの中身を貼り付けるか、`gh auth refresh -h github.com -s workflow` 等で
権限を追加してから `.github/workflows/` に移動すること。
