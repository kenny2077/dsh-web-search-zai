import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';
import { WebError } from '@deepseek-ai/dsh-web';
/** Unwrap only the two JSON encoding levels used by the search service. */
function results(value) {
    try {
        for (let depth = 0; depth < 2 && typeof value === 'string'; depth++)
            value = JSON.parse(value);
    }
    catch {
        return undefined;
    }
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        value = value.search_result;
    }
    if (!Array.isArray(value))
        return undefined;
    if (!value.every((row) => {
        if (typeof row !== 'object' || row === null || Array.isArray(row))
            return false;
        const record = row;
        return ['link', 'content', 'title'].every(key => record[key] == null || typeof record[key] === 'string');
    }))
        return undefined;
    return value;
}
/** MCP errors and unknown payloads must never look like a successful empty search. */
export function parseMcpSearchResult(result) {
    if (result.isError)
        throw new WebError('ZAI Coding Plan search failed; check your key and MCP quota', 'WEB_PROVIDER_ERROR');
    const structured = results(result.structuredContent);
    if (structured !== undefined)
        return { search_result: structured };
    const text = result.content.filter(block => block.type === 'text');
    if (text.length > 0) {
        const parsed = text.map(block => results(block.text));
        if (parsed.every(value => value !== undefined))
            return { search_result: parsed.flat() };
    }
    throw new WebError('ZAI Coding Plan returned an unprocessable response body', 'WEB_PROVIDER_ERROR');
}
/** A search owns its connection, so rotation and cancellation cannot affect another call. */
export async function searchCodingPlan(endpoint, apiKey, userAgent, request, signal) {
    const client = new Client({ name: 'dsh-web-search-zai', version: userAgent.split('/')[1] });
    const transport = new StreamableHTTPClientTransport(new URL(endpoint), {
        requestInit: { headers: { authorization: `Bearer ${apiKey}`, 'user-agent': userAgent }, redirect: 'error' },
        reconnectionOptions: { maxRetries: 0, initialReconnectionDelay: 1000, maxReconnectionDelay: 1000, reconnectionDelayGrowFactor: 1 },
        fetch: async (url, init) => {
            const response = await fetch(url, {
                ...init, redirect: 'error',
                signal: init?.signal ? AbortSignal.any([signal, init.signal]) : signal,
            });
            // GET is an optional server event stream; 405 is valid for stateless servers.
            if (!response.ok && init?.method === 'POST') {
                await response.body?.cancel();
                throw new WebError(`ZAI Coding Plan request failed (HTTP ${response.status}); check your key and MCP quota`, 'WEB_PROVIDER_ERROR');
            }
            return response;
        },
    });
    try {
        // SDK v1 declares sessionId differently on Transport and its HTTP implementation.
        await client.connect(transport, { signal });
        const tools = [];
        const cursors = new Set();
        let cursor;
        do {
            const page = await client.listTools(cursor === undefined ? {} : { cursor }, { signal });
            tools.push(...page.tools);
            cursor = page.nextCursor;
            if (cursor !== undefined) {
                if (cursors.has(cursor))
                    throw new Error('Repeated MCP cursor');
                cursors.add(cursor);
            }
        } while (cursor !== undefined);
        const tool = tools.find(tool => tool.name === 'webSearchPrime')
            ?? tools.find(tool => tool.name === 'web_search_prime');
        if (tool === undefined)
            throw new WebError('ZAI Coding Plan search tool is unavailable', 'WEB_PROVIDER_ERROR');
        const args = { search_query: request.query };
        if (request.maxResults !== undefined && Object.hasOwn(tool.inputSchema.properties ?? {}, 'count')) {
            args.count = request.maxResults;
        }
        return parseMcpSearchResult(CallToolResultSchema.parse(await client.callTool({ name: tool.name, arguments: args }, CallToolResultSchema, { signal })));
    }
    finally {
        // Closing cancels pending HTTP streams; it does not send another search.
        await client.close().catch(() => { });
        await transport.close().catch(() => { });
    }
}
//# sourceMappingURL=mcp.js.map