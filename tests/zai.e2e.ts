import { describe, expect, it } from 'vitest'
import { ZaiSearchProvider, ZAI_DEFAULT_BASE_URL, ZAI_DEFAULT_SEARCH_ENGINE, ZAI_DEFAULT_MCP_URL } from '../src/index.ts'

/**
 * Explicit live smoke: requires both a key and a selected billing mode.
 * API mode spends API balance; Coding Plan mode consumes MCP quota.
 */
const apiKey = process.env.ZAI_API_KEY
const billingMode = process.env.ZAI_LIVE_BILLING_MODE
const maybe = apiKey && (billingMode === 'coding-plan' || billingMode === 'api') ? describe : describe.skip

maybe(`ZaiSearchProvider live ${billingMode ?? '(not selected)'}`, () => {
  it('returns sources for a live query', async () => {
    const provider = new ZaiSearchProvider(() => ({
      apiKey: apiKey!,
      billingMode: billingMode as 'coding-plan' | 'api',
      mcpURL: process.env.ZAI_SEARCH_MCP_URL ?? ZAI_DEFAULT_MCP_URL,
      baseURL: process.env.ZAI_SEARCH_BASE_URL ?? ZAI_DEFAULT_BASE_URL,
      searchEngine: process.env.ZAI_SEARCH_ENGINE ?? ZAI_DEFAULT_SEARCH_ENGINE,
    }))
    const result = await provider.search({ query: 'DeepSeek Harness', maxResults: 5 })
    expect(result.sources.length).toBeGreaterThan(0)
    for (const source of result.sources) expect(source.url).toMatch(/^https?:\/\//)
  }, 65_000)
})
