/**
 * A `WebSearchProvider` backed by ZAI Coding Plan MCP or the standalone
 * Web Search API. Options are read through a thunk so a committed
 * settings change takes effect on the next search, without re-registration
 * or a restart (same pattern as `DeepSeekSearchProvider`).
 *
 * @module dsh-web-search-zai/provider
 */
import { WebError } from '@deepseek-ai/dsh-web';
import { searchCodingPlan } from "./mcp.js";
/** Stable id this provider registers under. */
export const ZAI_PROVIDER_ID = 'zai';
/** Default ZAI endpoint base; `/web_search` is the operation. */
export const ZAI_DEFAULT_BASE_URL = 'https://api.z.ai/api/paas/v4';
/** Full endpoint; the Coding Plan model base URL is not a search endpoint. */
export const ZAI_DEFAULT_MCP_URL = 'https://api.z.ai/api/mcp/web_search_prime/mcp';
/** Default engine for `api.z.ai`; `open.bigmodel.cn` uses `search_pro` (underscore). */
export const ZAI_DEFAULT_SEARCH_ENGINE = 'search-prime';
/** Attribution header sent on every request. Bump with the package version. */
export const USER_AGENT = 'dsh-web-search-zai/0.1.0';
/**
 * Map one ZAI result to a normalized source, or `undefined` when it has no
 * non-blank `link` or `content` — nothing portable to map.
 *
 * @param result - one entry of the response `search_result[]`.
 * @returns the normalized source, or `undefined` when the entry should be dropped.
 */
export function mapZaiResult(result) {
    const url = result.link;
    if (url == null || url.length === 0)
        return undefined;
    const snippet = result.content;
    if (snippet == null || snippet.trim().length === 0)
        return undefined;
    return {
        url,
        ...result.title != null && result.title.length > 0 ? { title: result.title } : {},
        snippet,
    };
}
/**
 * Map a ZAI response envelope to a normalized search result.
 *
 * @param response - the parsed `POST /web_search` response body.
 * @returns the normalized result; unmappable entries are dropped ({@link mapZaiResult}).
 */
export function mapZaiResponse(response) {
    const sources = (response.search_result ?? [])
        .map(mapZaiResult)
        .filter((source) => source !== undefined);
    // ZAI returns no single generated answer, so `content` is omitted. The web
    // service owns the final `maxResults` truncation, so this provider reports
    // `truncated: false`.
    return { sources, truncated: false };
}
/** The ZAI-backed search provider; HTTP redirects fail as `WEB_PROVIDER_ERROR`. */
export class ZaiSearchProvider {
    resolveOptions;
    id = ZAI_PROVIDER_ID;
    active = new Set();
    disposed = false;
    /** Cancel active MCP operations when the plugin is unloaded. */
    dispose() {
        this.disposed = true;
        for (const controller of this.active)
            controller.abort();
    }
    /**
     * @param resolveOptions - options for the next operation, snapshotted once
     * per search so one operation never mixes two settings sections. A thunk
     * (not a value) because the section can change between searches and
     * re-registering on every change would be overkill.
     */
    constructor(resolveOptions) {
        this.resolveOptions = resolveOptions;
    }
    available() {
        const options = this.resolveOptions();
        return !this.disposed && ((options.apiKey?.length ?? 0) > 0 || options.resolveApiKey !== undefined)
            && validEndpoint(options);
    }
    async search(request, signal) {
        // Snapshot once for the whole operation: the key and the endpoint it is
        // sent to must come from the same settings section.
        const options = this.resolveOptions();
        if (this.disposed)
            throw searchAborted();
        throwIfSearchAborted(signal);
        if (!validEndpoint(options))
            throw new WebError('Invalid ZAI search endpoint or billing mode', 'WEB_PROVIDER_ERROR');
        if ((options.billingMode ?? 'coding-plan') === 'coding-plan') {
            return this.codingSearch(options, request, signal);
        }
        const apiKey = await this.apiKey(options, signal);
        throwIfSearchAborted(signal);
        const num = request.maxResults;
        // Caller-generated correlation id (API accepts 6–64 chars; a UUID fits).
        const requestId = crypto.randomUUID();
        let response;
        try {
            response = await fetch(`${options.baseURL}/web_search`, {
                method: 'POST',
                redirect: 'error',
                headers: {
                    'authorization': `Bearer ${apiKey}`,
                    'content-type': 'application/json',
                    'accept': 'application/json',
                    'user-agent': USER_AGENT,
                },
                body: JSON.stringify({
                    search_query: request.query,
                    request_id: requestId,
                    search_engine: options.searchEngine,
                    ...num !== undefined ? { num } : {},
                    ...options.searchRecency !== undefined ? { search_recency_filter: options.searchRecency } : {},
                }),
                ...signal !== undefined ? { signal } : {},
            });
        }
        catch (error) {
            if (signal?.aborted === true || isAbortError(error))
                throw searchAborted();
            throw new WebError('ZAI search request failed', 'WEB_PROVIDER_ERROR');
        }
        if (!response.ok) {
            const status = response.status;
            let message = `ZAI API error (HTTP ${status})`;
            try {
                const parsed = await response.json();
                const detail = typeof parsed.error === 'string' ? parsed.error : parsed.error?.message ?? parsed.message;
                if (detail !== undefined && detail.length > 0)
                    message = detail;
            }
            catch (error) {
                // An abort mid-body must surface as WEB_ABORTED, not a generic error.
                if (signal?.aborted === true || isAbortError(error))
                    throw searchAborted();
                // Otherwise fall back to the HTTP-status message; a non-JSON error
                // body (common for gateway 5xx/429s) costs nothing but detail.
            }
            throw new WebError(message.split(apiKey).join('[redacted]'), 'WEB_PROVIDER_ERROR');
        }
        try {
            const payload = await response.json();
            return mapZaiResponse(payload);
        }
        catch (error) {
            if (signal?.aborted === true || isAbortError(error))
                throw searchAborted();
            if (error instanceof WebError)
                throw error;
            throw new WebError('ZAI returned an unprocessable response body', 'WEB_PROVIDER_ERROR');
        }
    }
    async codingSearch(options, request, signal) {
        const controller = new AbortController();
        this.active.add(controller);
        let timedOut = false;
        const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 60_000);
        timer.unref?.();
        const combined = signal === undefined ? controller.signal : AbortSignal.any([signal, controller.signal]);
        try {
            const apiKey = await this.apiKey(options, combined);
            throwIfSearchAborted(combined);
            return mapZaiResponse(await searchCodingPlan(options.mcpURL ?? ZAI_DEFAULT_MCP_URL, apiKey, USER_AGENT, request, combined));
        }
        catch (error) {
            if (signal?.aborted || this.disposed)
                throw searchAborted();
            if (timedOut)
                throw new WebError('ZAI Coding Plan search timed out after 60 seconds', 'WEB_PROVIDER_ERROR');
            if (error instanceof WebError)
                throw error;
            throw new WebError('ZAI Coding Plan search failed; check your key and MCP quota', 'WEB_PROVIDER_ERROR');
        }
        finally {
            clearTimeout(timer);
            this.active.delete(controller);
        }
    }
    /**
     * Resolve one operation's credential without retaining it on the provider.
     * @param options - the caller's snapshot (key and endpoint from one section).
     * @param signal - abort signal for the surrounding search.
     * @returns the resolved key.
     */
    async apiKey(options, signal) {
        throwIfSearchAborted(signal);
        if (options.apiKey !== undefined && options.apiKey.length > 0)
            return options.apiKey;
        let resolved;
        try {
            resolved = await abortable(options.resolveApiKey?.() ?? Promise.resolve(undefined), signal);
        }
        catch (error) {
            if (signal?.aborted === true || isAbortError(error))
                throw searchAborted();
            throw new WebError('ZAI search credential resolution failed', 'WEB_PROVIDER_ERROR');
        }
        if (resolved !== undefined && resolved.length > 0)
            return resolved;
        const ref = options.apiKeyEnv ?? 'ZAI_API_KEY';
        throw new WebError(`ZAI search has no API key for "${ref}"; store it through the credentials service`
            + ' (the web Models page writes it), export it in the launching environment, or set a literal'
            + ' "apiKey" in the web-search-zai config', 'WEB_PROVIDER_CREDENTIAL_MISSING');
    }
}
/** Race an async preflight against caller cancellation, without leaving an unhandled rejection behind. */
function abortable(operation, signal) {
    if (signal === undefined)
        return operation;
    if (signal.aborted)
        throw searchAborted();
    return new Promise((resolve, reject) => {
        const onSettle = () => reject(searchAborted());
        signal.addEventListener('abort', onSettle, { once: true });
        operation.then((value) => { signal.removeEventListener('abort', onSettle); resolve(value); }, (error) => { signal.removeEventListener('abort', onSettle); reject(error); });
    });
}
/** Throw `WEB_ABORTED` if the signal is already aborted; otherwise return. */
function throwIfSearchAborted(signal) {
    if (signal?.aborted === true)
        throw searchAborted();
}
/** Do not retain arbitrary abort reasons, which can contain credentials. */
function searchAborted() {
    return new WebError('ZAI search aborted', 'WEB_ABORTED');
}
/** Only the selected endpoint matters. URLs must be HTTP(S), without embedded credentials. */
function validEndpoint(options) {
    const mode = options.billingMode ?? 'coding-plan';
    if (mode !== 'api' && mode !== 'coding-plan')
        return false;
    try {
        const url = new URL(mode === 'api' ? options.baseURL : options.mcpURL ?? ZAI_DEFAULT_MCP_URL);
        return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password && !url.hash;
    }
    catch {
        return false;
    }
}
/** True for a fetch/`AbortSignal` abort, surfaced as `WEB_ABORTED`. */
function isAbortError(error) {
    return error instanceof DOMException && error.name === 'AbortError';
}
//# sourceMappingURL=provider.js.map