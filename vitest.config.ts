import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
      setupFiles: ['src/test/setup.ts'],
      coverage: {
        provider: 'v8',
        include: ['src/physics/**'],
        exclude: ['src/physics/__tests__/**'],
        thresholds: { lines: 100, branches: 100, functions: 100, statements: 100 },
      },
    },
  }),
)
