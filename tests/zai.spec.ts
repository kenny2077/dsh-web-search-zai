import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFile } from 'node:fs/promises'
import { Context } from '@deepseek-ai/cordis'
import WebRuntime from '@deepseek-ai/dsh-web'
import { ZaiSearchProvider, ZAI_PROVIDER_ID } from '../src/index.ts'
import * as zaiPlugin from '../src/index.ts'
import { mapZaiResponse, mapZaiResult, USER_AGENT } from '../src/provider.ts'
import type { ZaiSearchProviderOptions } from '../src/provider.ts'

const options: ZaiSearchProviderOptions = { billingMode: 'api', apiKey: 'zai-key', baseURL: 'https://api.zai.test/api/paas/v4', searchEngine: 'search-prime' }

/** Wrap static options in the thunk the provider constructor expects. */
function thunk(opts: ZaiSearchProviderOptions): () => ZaiSearchProviderOptions {
  return () => opts
}

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' }, ...init })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ZAI result mapping', () => {
  it('ships a user-agent matching the package name and version', async () => {
    const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')) as { name: string, version: string }
    expect(USER_AGENT).toBe(`${pkg.name}/${pkg.version}`)
  })

  it('maps a full result entry', () => {
    expect(mapZaiResult({
      link: 'https://a.test',
      title: 'A',
      content: 'salient sentence',
    })).toEqual({ url: 'https://a.test', title: 'A', snippet: 'salient sentence' })
  })

  it('drops a result with no content', () => {
    expect(mapZaiResult({ link: 'https://a.test' })).toBeUndefined()
    expect(mapZaiResult({ link: 'https://a.test', content: '' })).toBeUndefined()
    expect(mapZaiResult({ link: 'https://a.test', content: '   ' })).toBeUndefined()
  })

  it('drops a result with no link', () => {
    expect(mapZaiResult({ content: 'hi' })).toBeUndefined()
    expect(mapZaiResult({ link: '', content: 'hi' })).toBeUndefined()
  })

  it('omits null/empty optional fields rather than emitting them', () => {
    expect(mapZaiResult({ link: 'https://a.test', title: null, content: 'hi' }))
      .toEqual({ url: 'https://a.test', snippet: 'hi' })
    expect(mapZaiResult({ link: 'https://a.test', title: '', content: 'hi' }))
      .toEqual({ url: 'https://a.test', snippet: 'hi' })
  })

  it('maps a response to a result with no content and filtered sources', () => {
    const result = mapZaiResponse({
      search_result: [
        { link: 'https://a.test', content: 'one' },
        { link: 'https://b.test' },
        { link: 'https://c.test', title: 'C', content: 'three' },
      ],
    })
    expect(result).toEqual({
      sources: [
        { url: 'https://a.test', snippet: 'one' },
        { url: 'https://c.test', title: 'C', snippet: 'three' },
      ],
      truncated: false,
    })
    expect(result.content).toBeUndefined()
  })

  it('tolerates a missing search_result array', () => {
    expect(mapZaiResponse({}).sources).toEqual([])
  })
})

describe('ZaiSearchProvider availability', () => {
  it('is unavailable without a key or resolver', () => {
    expect(new ZaiSearchProvider(thunk({ ...options, apiKey: '' })).available()).toBe(false)
  })

  it('is available with a key', () => {
    expect(new ZaiSearchProvider(thunk(options)).available()).toBe(true)
  })

  it('is available with a resolveApiKey callback even without a literal key', () => {
    expect(new ZaiSearchProvider(thunk({ ...options, apiKey: '', resolveApiKey: async () => 'resolved' })).available()).toBe(true)
  })

  it('is misconfigured when the base URL is unparseable', () => {
    expect(new ZaiSearchProvider(thunk({ ...options, baseURL: 'not a url' })).available()).toBe(false)
  })
})

describe('ZaiSearchProvider request mapping', () => {
  it('sends search_query, request_id, search_engine, num and bearer auth', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ search_result: [{ link: 'https://a.test', content: 'hi' }] }))
    vi.stubGlobal('fetch', fetchMock)

    const provider = new ZaiSearchProvider(thunk({ ...options, searchEngine: 'search-prime' }))
    await provider.search({ query: 'hello', maxResults: 5 })

    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.zai.test/api/paas/v4/web_search')
    expect(init).toMatchObject({ method: 'POST', redirect: 'error' })
    expect((init.headers as Record<string, string>)['authorization']).toBe('Bearer zai-key')
    const body = JSON.parse(init.body as string)
    expect(body).toMatchObject({
      search_query: 'hello',
      search_engine: 'search-prime',
      num: 5,
    })
    // request_id is present and UUID-shaped (8-4-4-4-12)
    expect(body.request_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  })

  it('omits num when the request carries no maxResults', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ search_result: [] }))
    vi.stubGlobal('fetch', fetchMock)
    await new ZaiSearchProvider(thunk(options)).search({ query: 'q' })
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(init.body as string)).not.toHaveProperty('num')
  })

  it('threads searchEngine config into the request body', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ search_result: [] }))
    vi.stubGlobal('fetch', fetchMock)
    await new ZaiSearchProvider(thunk({ ...options, searchEngine: 'search_pro' })).search({ query: 'q' })
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(init.body as string).search_engine).toBe('search_pro')
  })

  it('threads searchRecency config into the request body', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ search_result: [] }))
    vi.stubGlobal('fetch', fetchMock)
    await new ZaiSearchProvider(thunk({ ...options, searchRecency: 'week' })).search({ query: 'q' })
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(init.body as string).search_recency_filter).toBe('week')
  })

  it('omits search_recency_filter when no searchRecency is configured', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ search_result: [] }))
    vi.stubGlobal('fetch', fetchMock)
    await new ZaiSearchProvider(thunk(options)).search({ query: 'q' })
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(init.body as string)).not.toHaveProperty('search_recency_filter')
  })

  it('forwards the abort signal', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ search_result: [] }))
    vi.stubGlobal('fetch', fetchMock)
    const controller = new AbortController()
    await new ZaiSearchProvider(thunk(options)).search({ query: 'q' }, controller.signal)
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(init.signal).toBe(controller.signal)
  })

  it('resolves the key through resolveApiKey when no literal key is set', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ search_result: [] }))
    vi.stubGlobal('fetch', fetchMock)
    const provider = new ZaiSearchProvider(thunk({ ...options, apiKey: '', resolveApiKey: async () => 'resolved-key' }))
    await provider.search({ query: 'q' })
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect((init.headers as Record<string, string>)['authorization']).toBe('Bearer resolved-key')
  })

  it('throws WEB_PROVIDER_CREDENTIAL_MISSING when no key resolves', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ search_result: [] })))
    const provider = new ZaiSearchProvider(thunk({ ...options, apiKey: '', resolveApiKey: async () => undefined }))
    await expect(provider.search({ query: 'q' }))
      .rejects.toThrow(expect.objectContaining({ code: 'WEB_PROVIDER_CREDENTIAL_MISSING' }))
  })
})

describe('ZaiSearchProvider error handling', () => {
  it('maps an HTTP error to WEB_PROVIDER_ERROR with the provider message', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ error: 'bad key' }, { status: 401 })))
    await expect(new ZaiSearchProvider(thunk(options)).search({ query: 'q' }))
      .rejects.toThrow(expect.objectContaining({ code: 'WEB_PROVIDER_ERROR', message: 'bad key' }))
  })

  it('maps a nested error.message to the provider message', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ error: { message: 'rate limited' } }, { status: 429 })))
    await expect(new ZaiSearchProvider(thunk(options)).search({ query: 'q' }))
      .rejects.toThrow(expect.objectContaining({ code: 'WEB_PROVIDER_ERROR', message: 'rate limited' }))
  })

  it('keeps a status-line message when the error body is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('gateway down', { status: 502 })))
    await expect(new ZaiSearchProvider(thunk(options)).search({ query: 'q' }))
      .rejects.toThrow(expect.objectContaining({ code: 'WEB_PROVIDER_ERROR', message: 'ZAI API error (HTTP 502)' }))
  })

  it('keeps the status-line message when the JSON error body carries no detail', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({}, { status: 500 })))
    await expect(new ZaiSearchProvider(thunk(options)).search({ query: 'q' }))
      .rejects.toThrow(expect.objectContaining({ message: 'ZAI API error (HTTP 500)' }))
  })

  it('maps a network failure to WEB_PROVIDER_ERROR', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('connection refused'))))
    await expect(new ZaiSearchProvider(thunk(options)).search({ query: 'q' }))
      .rejects.toThrow(expect.objectContaining({ code: 'WEB_PROVIDER_ERROR' }))
  })

  it('maps an abort to WEB_ABORTED', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new DOMException('aborted', 'AbortError'))))
    await expect(new ZaiSearchProvider(thunk(options)).search({ query: 'q' }))
      .rejects.toThrow(expect.objectContaining({ code: 'WEB_ABORTED' }))
  })

  it('maps an unparseable success body to WEB_PROVIDER_ERROR', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('not json', { status: 200 })))
    await expect(new ZaiSearchProvider(thunk(options)).search({ query: 'q' }))
      .rejects.toThrow(expect.objectContaining({ code: 'WEB_PROVIDER_ERROR' }))
  })

  it('maps a well-formed body of the wrong shape to WEB_PROVIDER_ERROR, not a raw TypeError', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ search_result: {} }, { status: 200 })))
    await expect(new ZaiSearchProvider(thunk(options)).search({ query: 'q' }))
      .rejects.toThrow(expect.objectContaining({ code: 'WEB_PROVIDER_ERROR' }))
  })

  it('surfaces an abort during success-body parse as WEB_ABORTED, not provider error', async () => {
    const body = { json: () => Promise.reject(new DOMException('aborted', 'AbortError')), ok: true, status: 200 }
    vi.stubGlobal('fetch', vi.fn(async () => body as unknown as Response))
    await expect(new ZaiSearchProvider(thunk(options)).search({ query: 'q' }))
      .rejects.toThrow(expect.objectContaining({ code: 'WEB_ABORTED' }))
  })

  it('surfaces an abort during error-body parse as WEB_ABORTED', async () => {
    const body = { json: () => Promise.reject(new DOMException('aborted', 'AbortError')), ok: false, status: 500 }
    vi.stubGlobal('fetch', vi.fn(async () => body as unknown as Response))
    await expect(new ZaiSearchProvider(thunk(options)).search({ query: 'q' }))
      .rejects.toThrow(expect.objectContaining({ code: 'WEB_ABORTED' }))
  })
})

describe('web-search-zai plugin registration', () => {
  it('registers the provider into ctx.web (HMR-safe)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ search_result: [] })))
    const ctx = new Context()
    await ctx.plugin(WebRuntime, { searchProvider: ZAI_PROVIDER_ID })
    const fiber = await ctx.plugin(zaiPlugin, { billingMode: 'api', apiKey: 'zai-key' })
    await expect(ctx.web.search({ query: 'q' })).resolves.toMatchObject({ sources: [], truncated: false })
    await fiber.dispose()
    await expect(ctx.web.search({ query: 'q' }))
      .rejects.toThrow(expect.objectContaining({ code: 'WEB_PROVIDER_CONFIGURED_MISSING' }))
  })

  it('has no default export (namespace plugin export shape)', () => {
    expect('default' in zaiPlugin).toBe(false)
  })

  it('threads searchEngine and searchRecency config into the request', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ search_result: [] }))
    vi.stubGlobal('fetch', fetchMock)
    const ctx = new Context()
    await ctx.plugin(WebRuntime, { searchProvider: ZAI_PROVIDER_ID })
    const fiber = await ctx.plugin(zaiPlugin, { billingMode: 'api', apiKey: 'zai-key', searchEngine: 'search_pro', searchRecency: 'month' })
    await ctx.web.search({ query: 'q' })
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(init.body as string)).toMatchObject({ search_engine: 'search_pro', search_recency_filter: 'month' })
    await fiber.dispose()
  })

  it('falls back to $ZAI_API_KEY and the default base URL and engine when config omits them', async () => {
    const prev = process.env.ZAI_API_KEY
    process.env.ZAI_API_KEY = 'env-key'
    try {
      const fetchMock = vi.fn(async () => jsonResponse({ search_result: [] }))
      vi.stubGlobal('fetch', fetchMock)
      const ctx = new Context()
      await ctx.plugin(WebRuntime, { searchProvider: ZAI_PROVIDER_ID })
      const fiber = await ctx.plugin(zaiPlugin, { billingMode: 'api',})
      await ctx.web.search({ query: 'q' })
      const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
      expect(url).toBe('https://api.z.ai/api/paas/v4/web_search')
      expect((init.headers as Record<string, string>)['authorization']).toBe('Bearer env-key')
      expect(JSON.parse(init.body as string).search_engine).toBe('search-prime')
      await fiber.dispose()
    } finally {
      if (prev === undefined) delete process.env.ZAI_API_KEY
      else process.env.ZAI_API_KEY = prev
    }
  })

  it('throws WEB_PROVIDER_CREDENTIAL_MISSING when neither config nor env supplies a key', async () => {
    const prev = process.env.ZAI_API_KEY
    delete process.env.ZAI_API_KEY
    try {
      const ctx = new Context()
      await ctx.plugin(WebRuntime, { searchProvider: ZAI_PROVIDER_ID })
      await ctx.plugin(zaiPlugin, { billingMode: 'api',})
      await expect(ctx.web.search({ query: 'q' }))
        .rejects.toThrow(expect.objectContaining({ code: 'WEB_PROVIDER_CREDENTIAL_MISSING' }))
    } finally {
      if (prev !== undefined) process.env.ZAI_API_KEY = prev
    }
  })
})
