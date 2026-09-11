import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
    globals: false,
    server: {
      deps: {
        inline: [/@deepseek-ai\/dsh-client-ui-primitives/],
      },
    },
  },
});
