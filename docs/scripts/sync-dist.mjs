import { cpSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const docsRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const vitepressDist = resolve(docsRoot, '.vitepress/dist')
const clientDocsDist = resolve(docsRoot, '../client/dist/docs')

rmSync(clientDocsDist, { recursive: true, force: true })
mkdirSync(dirname(clientDocsDist), { recursive: true })
cpSync(vitepressDist, clientDocsDist, { recursive: true })

console.log(`Copied VitePress output to ${clientDocsDist}`)
