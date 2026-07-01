import path from 'path'
import fs from 'fs'
import { defineConfig as defineViteConfig, mergeConfig } from 'vite'
import type { Plugin, ViteDevServer } from 'vite'
import { defineConfig as defineVitestConfig, configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

function serveBuiltDocs(): Plugin {
  return {
    name: 'serve-built-docs',
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/docs/')) {
          next()
          return
        }

        const urlPath = decodeURIComponent(req.url.split('?')[0])
        const relativePath = urlPath.replace(/^\/docs\/?/, '') || 'index.html'
        const docsRoot = path.resolve(__dirname, './dist/docs')
        const candidates = [
          path.join(docsRoot, relativePath),
          path.join(docsRoot, relativePath, 'index.html'),
          path.join(docsRoot, `${relativePath}.html`),
        ]
        const filePath = candidates.find((candidate) => {
          const normalized = path.normalize(candidate)
          return (
            normalized.startsWith(docsRoot) &&
            fs.existsSync(normalized) &&
            fs.statSync(normalized).isFile()
          )
        })

        if (!filePath) {
          next()
          return
        }

        const ext = path.extname(filePath)
        const contentTypes: Record<string, string> = {
          '.css': 'text/css',
          '.html': 'text/html',
          '.js': 'text/javascript',
          '.json': 'application/json',
          '.md': 'text/markdown',
          '.txt': 'text/plain',
          '.woff2': 'font/woff2',
        }

        res.setHeader('Content-Type', contentTypes[ext] ?? 'application/octet-stream')
        fs.createReadStream(filePath).pipe(res)
      })
    },
  }
}

// https://vitejs.dev/config/
const viteConfig = defineViteConfig({
  plugins: [serveBuiltDocs(), react(), tailwindcss()],
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
