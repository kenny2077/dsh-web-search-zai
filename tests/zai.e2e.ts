import { describe, expect, it } from 'vitest'
import { ZaiSearchProvider, ZAI_DEFAULT_BASE_URL, ZAI_DEFAULT_SEARCH_ENGINE } from '../src/index.ts'

/**
 * Real-API smoke for the ZAI search provider. Self-skips without `$ZAI_API_KEY`
 * (CI runs without secrets).
 */
const apiKey = process.env.ZAI_API_KEY
const maybe = apiKey !== undefined && apiKey.length > 0 ? describe : describe.skip

maybe('ZaiSearchProvider real API', () => {
  it('returns sources for a live query', async () => {
    const provider = new ZaiSearchProvider(() => ({
      apiKey: apiKey!,
      baseURL: process.env.ZAI_BASE_URL ?? ZAI_DEFAULT_BASE_URL,
      searchEngine: process.env.ZAI_SEARCH_ENGINE ?? ZAI_DEFAULT_SEARCH_ENGINE,
    }))
    const result = await provider.search({ query: 'DeepSeek Harness', maxResults: 5 })
    expect(result.sources.length).toBeGreaterThan(0)
    for (const source of result.sources) expect(source.url).toMatch(/^https?:\/\//)
  }, 30_000)
})
