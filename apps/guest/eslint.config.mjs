import config from '@senzo/config/eslint';

export default [
  ...config,
  { ignores: ['expo-env.d.ts', '.expo/**', 'jest.config.js'] },
  // Metro bundles static assets through require().
  {
    rules: {
      '@typescript-eslint/no-require-imports': ['error', { allow: ['[.](png|jpg|svg|ttf)$'] }],
    },
  },
  {
    files: ['**/*.mjs'],
    languageOptions: { globals: { console: 'readonly' } },
  },
];
