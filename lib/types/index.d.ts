/**
 * `dsh-web-search-zai`: registers a ZAI (Zhipu/GLM)-backed
 * `WebSearchProvider` with `ctx.web`. A function/namespace plugin
 * (`inject: ['web']`), not a default-export service — it registers into the
 * seam's provider registry rather than owning the `ctx.web` key (which
 * belongs to `@deepseek-ai/dsh-web`).
 *
 * @module dsh-web-search-zai
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import type { ZaiBillingMode, ZaiRecency } from './types.ts';
export { ZAI_DEFAULT_BASE_URL, ZAI_DEFAULT_MCP_URL, ZAI_DEFAULT_SEARCH_ENGINE, ZAI_PROVIDER_ID, ZaiSearchProvider, } from './provider.ts';
export type { ZaiSearchProviderOptions } from './provider.ts';
export type { ZaiBillingMode, ZaiError, ZaiRecency, ZaiResult, ZaiSearchRequest, ZaiSearchResponse } from './types.ts';
/** Cordis plugin name used by loader diagnostics. */
export declare const name = "web-search-zai";
/** The web seam this provider registers into. */
export declare const inject: string[];
/** Plugin config (all optional — `apply` fills env-var and constant defaults). */
export interface Config {
    /** Coding Plan MCP quota (default), or separately billed REST API search. */
    billingMode?: ZaiBillingMode;
    /** Full Coding Plan Streamable HTTP MCP endpoint. */
    mcpURL?: string;
    /** Literal ZAI API key; prefer {@link apiKeyEnv} so no secret enters configuration files. */
    apiKey?: string;
    /** Credential reference resolved for each search; defaults to `ZAI_API_KEY`. */
    apiKeyEnv?: string;
    /** Endpoint base; `/web_search` is appended. Defaults to the public `api.z.ai` API. */
    baseURL?: string;
    /** Engine name: `search-prime` (api.z.ai, default) or `search_pro` (open.bigmodel.cn). */
    searchEngine?: string;
    /** Recency window sent as `search_recency_filter`. Omitted = no filter. */
    searchRecency?: ZaiRecency;
}
export declare const Config: z<Config>;
/** Settings namespace carrying this provider's endpoint, engine, and key reference. */
export declare const WEB_SEARCH_ZAI_SETTINGS_NAMESPACE: import("@deepseek-ai/dsh-settings").SettingsNamespace;
/** Register the ZAI search provider with `ctx.web`. */
export declare function apply(ctx: Context, config: Config): void;
//# sourceMappingURL=index.d.ts.map