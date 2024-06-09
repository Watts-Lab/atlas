import { defineConfig as defineViteConfig, mergeConfig } from 'vite'
import { defineConfig as defineVitestConfig } from 'vitest/config'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
const viteConfig = defineViteConfig({
  plugins: [react()],
})

const vitestConfig = defineVitestConfig({
  test: {
    coverage: {
      provider: 'v8',
    },
    environment: 'jsdom',
    setupFiles: './tests/setup.js',
  },
})

export default mergeConfig(viteConfig, vitestConfig)
