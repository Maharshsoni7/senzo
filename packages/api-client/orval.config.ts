import { defineConfig } from 'orval';

export default defineConfig({
  senzo: {
    input: './openapi.json',
    output: {
      target: './src/generated/senzo.ts',
      client: 'fetch',
      mode: 'single',
      override: {
        mutator: { path: './src/fetcher.ts', name: 'senzoFetch' },
        fetch: { includeHttpResponseReturnType: false },
      },
    },
    hooks: { afterAllFilesWrite: 'prettier --write' },
  },
});
