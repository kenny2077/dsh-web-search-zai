import { afterEach, describe, expect, it, vi } from 'vitest'
import { createServer } from 'node:http'
import type { IncomingHttpHeaders, ServerResponse } from 'node:http'
import { Context } from '@deepseek-ai/cordis'
import WebRuntime from '@deepseek-ai/dsh-web'
import SettingsProvider from '@deepseek-ai/dsh-settings'
import type { SettingsNamespace } from '@deepseek-ai/dsh-settings'
import { ZaiSearchProvider, ZAI_DEFAULT_MCP_URL } from '../src/index.ts'
import * as plugin from '../src/index.ts'
import type { ZaiSearchProviderOptions } from '../src/provider.ts'

const rows = [{ title: 'Example', link: 'https://example.com', content: 'A search result' }]
type Rpc = { id?: number, method: string, params?: any }
const cleanups: (() => Promise<void>)[] = []
afterEach(async () => { vi.useRealTimers(); vi.unstubAllGlobals(); for (const cleanup of cleanups.splice(0)) await cleanup() })

/** A local Streamable HTTP server exercises the real SDK, including JSON and SSE decoding. */
async function server(config: {
  sse?: boolean, result?: unknown, names?: string[], count?: boolean, status?: number,
  hang?: string, redirect?: string, paginated?: boolean, repeatedCursor?: boolean,
} = {}) {
  const requests: { url: string, headers: IncomingHttpHeaders, rpc?: Rpc }[] = []
  let markHung!: () => void
  const hung = new Promise<void>(resolve => { markHung = resolve })
  const connections = new Set<unknown>()
  const app = createServer(async (req, res) => {
    if (req.method === 'GET') { res.writeHead(405).end(); return }
    let body = ''
    for await (const chunk of req) body += chunk
    const rpc = body ? JSON.parse(body) as Rpc : undefined
    requests.push({ url: req.url!, headers: req.headers, ...(rpc ? { rpc } : {}) })
    if (config.redirect) { res.writeHead(307, { location: config.redirect }).end(); return }
    if (config.status) { res.writeHead(config.status).end('secret-key should never appear in diagnostics'); return }
    if (!rpc || rpc.id === undefined) { res.writeHead(202).end(); return }
    if (config.hang === rpc.method) { markHung(); return }
    const respond = (result: unknown) => reply(res, rpc.id!, result, config.sse)
    if (rpc.method === 'initialize') {
      respond({ protocolVersion: '2025-03-26', capabilities: { tools: {} }, serverInfo: { name: 'local-zai', version: '1' } })
    } else if (rpc.method === 'tools/list') {
      const tools = (config.names ?? ['webSearchPrime']).map(name => ({
        name, inputSchema: { type: 'object', properties: { search_query: { type: 'string' }, ...(config.count ? { count: { type: 'number' } } : {}) }, required: ['search_query'] },
      }))
      respond(config.repeatedCursor ? { tools: [], nextCursor: 'same' }
        : config.paginated && !rpc.params?.cursor ? { tools: [], nextCursor: 'next' } : { tools })
    } else if (rpc.method === 'tools/call') respond(config.result ?? { content: [{ type: 'text', text: JSON.stringify(rows) }] })
    else res.writeHead(400).end()
  })
  app.on('connection', socket => { connections.add(socket); socket.on('close', () => connections.delete(socket)) })
  await new Promise<void>((resolve, reject) => { app.once('error', reject); app.listen(0, '127.0.0.1', resolve) })
  const addr = app.address() as { port: number }
  cleanups.push(async () => { app.closeAllConnections(); await new Promise<void>(resolve => app.close(() => resolve())) })
  const url = `http://127.0.0.1:${addr.port}/mcp`
  return { url, requests, hung, connections }
}
function reply(res: ServerResponse, id: number, result: unknown, sse = false) {
  const message = JSON.stringify({ jsonrpc: '2.0', id, result })
  res.writeHead(200, { 'content-type': sse ? 'text/event-stream' : 'application/json' })
  res.end(sse ? `event: message\ndata: ${message}\n\n` : message)
}
function provider(mcpURL: string, extra: Partial<ZaiSearchProviderOptions> = {}) {
  return new ZaiSearchProvider(() => ({ apiKey: 'secret-key', baseURL: 'not-a-rest-url', searchEngine: 'unused', mcpURL, ...extra }))
}

describe('Coding Plan MCP transport', () => {
  it.each([false, true])('initializes, discovers and normalizes results (SSE: %s)', async sse => {
    const local = await server({ sse, count: true })
    const result = await provider(local.url).search({ query: 'example', maxResults: 3 })
    expect(result).toEqual({ sources: [{ url: 'https://example.com', title: 'Example', snippet: 'A search result' }], truncated: false })
    const calls = local.requests.filter(req => req.rpc?.method === 'tools/call')
    expect(calls).toHaveLength(1)
    expect(calls[0]!.rpc!.params).toEqual({ name: 'webSearchPrime', arguments: { search_query: 'example', count: 3 } })
    expect(local.requests.every(req => req.headers.authorization === 'Bearer secret-key')).toBe(true)
    expect(local.requests.every(req => req.url === '/mcp')).toBe(true)
  })
  it('omits unsupported count, engine and recency arguments', async () => {
    const local = await server()
    await provider(local.url, { searchRecency: 'day' }).search({ query: 'q', maxResults: 2 })
    expect(local.requests.find(req => req.rpc?.method === 'tools/call')!.rpc!.params.arguments).toEqual({ search_query: 'q' })
  })
  it('finds a paginated snake-case name and prefers the documented camel-case name', async () => {
    for (const names of [['other', 'web_search_prime'], ['web_search_prime', 'webSearchPrime']]) {
      const local = await server({ names, paginated: true })
      await provider(local.url).search({ query: 'q' })
      expect(local.requests.find(req => req.rpc?.method === 'tools/call')!.rpc!.params.name).toBe(names[1])
    }
  })
  it.each([
    { content: [], structuredContent: { search_result: rows } },
    { content: [{ type: 'text', text: JSON.stringify({ search_result: rows }) }] },
    { content: [{ type: 'text', text: JSON.stringify(JSON.stringify(rows)) }] },
  ])('parses structured and encoded results', async result => {
    const local = await server({ result })
    expect((await provider(local.url).search({ query: 'q' })).sources).toHaveLength(1)
  })
  it('accepts empty results and drops incomplete sources', async () => {
    for (const payload of [[], [{ title: 'no source' }, { link: 'https://example.com', content: ' ' }]]) {
      const local = await server({ result: { content: [{ type: 'text', text: JSON.stringify(payload) }] } })
      expect((await provider(local.url).search({ query: 'q' })).sources).toEqual([])
    }
  })
  it.each([
    { content: [{ type: 'text', text: 'not json secret-key' }] },
    { content: [{ type: 'text', text: '{"error":"secret-key"}' }] },
    { content: [{ type: 'text', text: '[{"link":123,"content":"bad"}]' }] },
    { content: [], structuredContent: { search_result: 'invalid' } },
    { content: [{ type: 'text', text: 'secret-key quota exceeded' }], isError: true },
    { content: [{ type: 'text', text: 'MCP error -429: {"error":{"code":"1113","message":"Insufficient balance or no resource package. Please recharge."}}' }], isError: true },
  ])('rejects malformed or failed results without leaking secrets', async result => {
    const local = await server({ result })
    const error = await provider(local.url).search({ query: 'q' }).catch(error => error)
    expect(error.code).toBe('WEB_PROVIDER_ERROR')
    expect(String(error)).not.toContain('secret-key')
    expect(error.cause).toBeUndefined()
    expect(local.requests.filter(req => req.rpc?.method === 'tools/call')).toHaveLength(1)
  })
  it.each([401, 403, 429, 503])('does not retry or fall back on HTTP %s', async status => {
    const local = await server({ status })
    await expect(provider(local.url).search({ query: 'q' })).rejects.toMatchObject({ code: 'WEB_PROVIDER_ERROR' })
    expect(local.requests).toHaveLength(1)
  })
  it('rejects redirects without contacting the target', async () => {
    const target = await server()
    const local = await server({ redirect: target.url })
    await expect(provider(local.url).search({ query: 'q' })).rejects.toMatchObject({ code: 'WEB_PROVIDER_ERROR' })
    expect(target.requests).toHaveLength(0)
  })
  it.each([{ names: ['unrelated'] }, { repeatedCursor: true }])('rejects missing tools or invalid discovery pagination', async config => {
    const local = await server(config)
    await expect(provider(local.url).search({ query: 'q' })).rejects.toMatchObject({ code: 'WEB_PROVIDER_ERROR' })
    expect(local.requests.some(req => req.rpc?.method === 'tools/call')).toBe(false)
  })
  it.each(['initialize', 'tools/list', 'tools/call'])('cancels during %s and closes the pending request', async hang => {
    const local = await server({ hang })
    const controller = new AbortController()
    const result = provider(local.url).search({ query: 'q' }, controller.signal).catch(error => error)
    await local.hung
    controller.abort('custom cancellation reason')
    expect((await result).code).toBe('WEB_ABORTED')
  })
  it('cancels in-flight searches on disposal', async () => {
    const local = await server({ hang: 'tools/call' })
    const search = provider(local.url)
    const result = search.search({ query: 'q' }).catch(error => error)
    await local.hung
    search.dispose()
    expect((await result).code).toBe('WEB_ABORTED')
    expect(search.available()).toBe(false)
    await expect(search.search({ query: 'q' })).rejects.toMatchObject({ code: 'WEB_ABORTED' })
  })
  it('times out even while waiting for credentials', async () => {
    vi.useFakeTimers()
    const search = provider(ZAI_DEFAULT_MCP_URL, { apiKey: '', resolveApiKey: () => new Promise(() => {}) })
    const result = search.search({ query: 'q' }).catch(error => error)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(await result).toMatchObject({ code: 'WEB_PROVIDER_ERROR', message: expect.stringContaining('timed out') })
    expect(vi.getTimerCount()).toBe(0)
  })
  it('times out and cleans up a hung MCP call', async () => {
    const local = await server({ hang: 'tools/call' })
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const result = provider(local.url).search({ query: 'q' }).catch(error => error)
    await local.hung
    await vi.advanceTimersByTimeAsync(60_000)
    expect(await result).toMatchObject({ code: 'WEB_PROVIDER_ERROR', message: expect.stringContaining('timed out') })
    expect(vi.getTimerCount()).toBe(0)
  })
  it('snapshots once and reads new endpoint and credentials on the next search', async () => {
    const first = await server()
    const second = await server()
    let endpoint = first.url
    let key = 'first-key'
    const options = vi.fn(() => ({ mcpURL: endpoint, baseURL: '', searchEngine: '', resolveApiKey: async () => key }))
    const search = new ZaiSearchProvider(options)
    await search.search({ query: 'one' })
    endpoint = second.url; key = 'second-key'
    await search.search({ query: 'two' })
    expect(options).toHaveBeenCalledTimes(2)
    expect(first.requests[0]!.headers.authorization).toBe('Bearer first-key')
    expect(second.requests[0]!.headers.authorization).toBe('Bearer second-key')
  })
  it('validates only the active endpoint and rejects invalid modes', async () => {
    expect(provider(ZAI_DEFAULT_MCP_URL).available()).toBe(true)
    for (const mcpURL of ['bad', 'file:///tmp/file', 'https://user:pass@example.com']) {
      const search = provider(mcpURL)
      expect(search.available()).toBe(false)
      await expect(search.search({ query: 'q' })).rejects.toMatchObject({ code: 'WEB_PROVIDER_ERROR' })
    }
    expect(provider(ZAI_DEFAULT_MCP_URL, { billingMode: 'invalid' as any }).available()).toBe(false)
  })
  it('defaults plugin registrations to Coding Plan and cancels on unload', async () => {
    const local = await server({ hang: 'tools/call' })
    const ctx = new Context()
    const webFiber = await ctx.plugin(WebRuntime, { searchProvider: 'zai' })
    const fiber = await ctx.plugin(plugin, { apiKey: 'secret-key', mcpURL: local.url })
    const result = ctx.web.search({ query: 'q' }).catch(error => error)
    await local.hung
    await fiber.dispose()
    expect((await result).code).toBe('WEB_ABORTED')
    await webFiber.dispose()
  })
  it('applies committed DSH settings to the next search without registering again', async () => {
    class MemorySettings extends SettingsProvider {
      readonly writable = true
      protected async load() { return {} }
      protected async persist(_ns: SettingsNamespace, _section: Record<string, unknown>) {}
    }
    const first = await server()
    const second = await server()
    const ctx = new Context()
    const settingsFiber = await ctx.plugin(MemorySettings)
    const webFiber = await ctx.plugin(WebRuntime, { searchProvider: 'zai' })
    const fiber = await ctx.plugin(plugin, { apiKey: 'first-key', mcpURL: first.url })
    try {
      await ctx.web.search({ query: 'first' })
      await ctx.settings.update(plugin.WEB_SEARCH_ZAI_SETTINGS_NAMESPACE, { mcpURL: second.url, apiKey: 'second-key' })
      await ctx.web.search({ query: 'second' })
      expect(first.requests[0]!.headers.authorization).toBe('Bearer first-key')
      expect(second.requests[0]!.headers.authorization).toBe('Bearer second-key')
    } finally {
      await fiber.dispose()
      await webFiber.dispose()
      await settingsFiber.dispose()
    }
  })
})
