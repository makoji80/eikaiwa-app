/** ルートESLint設定。apps/api と packages/contracts に適用する。
 * apps/mobile は Expo が生成する独自のESLint設定（eslint-config-expo）を使う。 */
module.exports = {
  root: true,
  env: { node: true, es2022: true },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: false,
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  ignorePatterns: [
    'apps/mobile/**',
    '**/dist/**',
    '**/node_modules/**',
    '**/.expo/**',
    '**/prisma/dev.db',
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
  },
};
