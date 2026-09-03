import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

// Resolve only from the clean consumer, so this checkout cannot mask missing dependencies.
const require = createRequire(resolve(process.argv[2] ?? '.package-smoke', 'package.json'))
const manifestPath = require.resolve('dsh-web-search-zai/package.json')
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
const root = dirname(manifestPath)
for (const file of [manifest.main, manifest.types, manifest.exports['./invariant'].types, manifest.exports['./client']]) {
  await access(resolve(root, file))
}
const plugin = await import(pathToFileURL(require.resolve('dsh-web-search-zai')).href)
const { Context } = await import(pathToFileURL(require.resolve('@deepseek-ai/cordis')).href)
const { default: WebRuntime } = await import(pathToFileURL(require.resolve('@deepseek-ai/dsh-web')).href)
const ctx = new Context()
const web = await ctx.plugin(WebRuntime, { searchProvider: 'zai' })
let search
try {
  delete process.env.DSH_PACKAGE_SMOKE_EMPTY
  search = await ctx.plugin(plugin, { apiKeyEnv: 'DSH_PACKAGE_SMOKE_EMPTY' })
  await assert.rejects(ctx.web.search({ query: 'package smoke' }), { code: 'WEB_PROVIDER_CREDENTIAL_MISSING' })
  console.log(`Package ${manifest.version}: imports, declarations, browser bundle, and DSH registration passed (no live search).`)
} finally {
  await search?.dispose()
  await web.dispose()
}
