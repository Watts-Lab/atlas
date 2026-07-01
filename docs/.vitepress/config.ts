import { defineConfig } from 'vitepress'
import llmstxt from 'vitepress-plugin-llms'

export default defineConfig({
  title: 'Atlas',
  description: 'Documentation for Atlas research cartography',
  base: '/docs/',
  cleanUrls: true,
  vite: {
    plugins: [
      llmstxt({
        description: 'Documentation for Atlas research cartography and API usage.',
        details: 'Atlas helps structure scientific literature into queryable project data.',
      }),
    ],
  },
  themeConfig: {
    logo: '/logo.svg',
    nav: [
      { text: 'Guide', link: '/guide/overview' },
      { text: 'Integrations', link: '/integrations/mcp' },
      { text: 'Reference', link: '/reference/api' },
      { text: 'Open Atlas', link: '/home' },
    ],
    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'Concepts', link: '/guide/concepts' },
          { text: 'Guide Overview', link: '/guide/overview' },
          { text: 'Get Started', link: '/guide/get-started' },
        ],
      },
      {
        text: 'Guide',
        items: [
          { text: 'Projects', link: '/guide/projects' },
          { text: 'Features', link: '/guide/features' },
        ],
      },
      {
        text: 'Integrations',
        items: [
          { text: 'Python SDK', link: '/integrations/python-sdk' },
          { text: 'MCP', link: '/integrations/mcp' },
        ],
      },
      {
        text: 'Reference',
        items: [
          { text: 'API Reference', link: '/reference/api' },
          { text: 'LLM-Readable Docs', link: '/reference/llms' },
        ],
      },
    ],
    search: {
      provider: 'local',
    },
    footer: {
      message: '3401 Walnut Street Suite 417B, Philadelphia PA, 19104',
      copyright: 'Copyright © 2023 - 2026 - All right reserved by CSSLab at UPenn',
    },
  },
})
