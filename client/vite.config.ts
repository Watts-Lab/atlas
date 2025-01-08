import path from 'path'
import { defineConfig as defineViteConfig, mergeConfig } from 'vite'
import { defineConfig as defineVitestConfig, configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
const viteConfig = defineViteConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})

const vitestConfig = defineVitestConfig({
  test: {
    coverage: {
      provider: 'v8',
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
    exclude: [...configDefaults.exclude, 'shared/*'],
    environment: 'jsdom',
    setupFiles: './tests/setup.js',
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})

export default mergeConfig(viteConfig, vitestConfig)
