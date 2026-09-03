/**
 * A `WebSearchProvider` backed by ZAI Coding Plan MCP or the standalone
 * Web Search API. Options are read through a thunk so a committed
 * settings change takes effect on the next search, without re-registration
 * or a restart (same pattern as `DeepSeekSearchProvider`).
 *
 * @module dsh-web-search-zai/provider
 */
import type { WebSearchProvider, WebSearchRequest, WebSearchResult, WebSearchSource } from '@deepseek-ai/dsh-web';
import type { CredentialRef } from '@deepseek-ai/dsh-credentials';
import type { ZaiBillingMode, ZaiRecency, ZaiResult, ZaiSearchResponse } from './types.ts';
/** Stable id this provider registers under. */
export declare const ZAI_PROVIDER_ID = "zai";
/** Default ZAI endpoint base; `/web_search` is the operation. */
export declare const ZAI_DEFAULT_BASE_URL = "https://api.z.ai/api/paas/v4";
/** Full endpoint; the Coding Plan model base URL is not a search endpoint. */
export declare const ZAI_DEFAULT_MCP_URL = "https://api.z.ai/api/mcp/web_search_prime/mcp";
/** Default engine for `api.z.ai`; `open.bigmodel.cn` uses `search_pro` (underscore). */
export declare const ZAI_DEFAULT_SEARCH_ENGINE = "search-prime";
/** Attribution header sent on every request. Bump with the package version. */
export declare const USER_AGENT = "dsh-web-search-zai/0.2.0";
/** Resolved provider options (the plugin's `apply` supplies credential and constant defaults). */
export interface ZaiSearchProviderOptions {
    /** Omitted means Coding Plan, including when upgrading from REST-only versions. */
    billingMode?: ZaiBillingMode;
    /** Full Coding Plan MCP endpoint. */
    mcpURL?: string;
    /** Literal ZAI API key; when present it wins over {@link resolveApiKey}. */
    apiKey?: string;
    /** Resolve the current ZAI API key for one search operation. */
    resolveApiKey?: () => Promise<string | undefined>;
    /** Credential reference named by missing-credential diagnostics. */
    apiKeyEnv?: CredentialRef;
    /** Endpoint base; `/web_search` is appended. */
    baseURL: string;
    /** Engine name: `search-prime` (api.z.ai) or `search_pro` (open.bigmodel.cn). */
    searchEngine: string;
    /** Optional recency window sent as `search_recency_filter`; omitted = no filter. */
    searchRecency?: ZaiRecency;
}
/**
 * Map one ZAI result to a normalized source, or `undefined` when it has no
 * non-blank `link` or `content` — nothing portable to map.
 *
 * @param result - one entry of the response `search_result[]`.
 * @returns the normalized source, or `undefined` when the entry should be dropped.
 */
export declare function mapZaiResult(result: ZaiResult): WebSearchSource | undefined;
/**
 * Map a ZAI response envelope to a normalized search result.
 *
 * @param response - the parsed `POST /web_search` response body.
 * @returns the normalized result; unmappable entries are dropped ({@link mapZaiResult}).
 */
export declare function mapZaiResponse(response: ZaiSearchResponse): WebSearchResult;
/** The ZAI-backed search provider; HTTP redirects fail as `WEB_PROVIDER_ERROR`. */
export declare class ZaiSearchProvider implements WebSearchProvider {
    private readonly resolveOptions;
    readonly id = "zai";
    private readonly active;
    private disposed;
    /** Cancel active MCP operations when the plugin is unloaded. */
    dispose(): void;
    /**
     * @param resolveOptions - options for the next operation, snapshotted once
     * per search so one operation never mixes two settings sections. A thunk
     * (not a value) because the section can change between searches and
     * re-registering on every change would be overkill.
     */
    constructor(resolveOptions: () => ZaiSearchProviderOptions);
    available(): boolean;
    search(request: WebSearchRequest, signal?: AbortSignal): Promise<WebSearchResult>;
    private codingSearch;
    /**
     * Resolve one operation's credential without retaining it on the provider.
     * @param options - the caller's snapshot (key and endpoint from one section).
     * @param signal - abort signal for the surrounding search.
     * @returns the resolved key.
     */
    private apiKey;
}
//# sourceMappingURL=provider.d.ts.map