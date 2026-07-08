/**
 * `dsh-web-search-zai`: registers a ZAI (Zhipu/GLM)-backed
 * `WebSearchProvider` with `ctx.web`. A function/namespace plugin
 * (`inject: ['web']`), not a default-export service — it registers into the
 * seam's provider registry rather than owning the `ctx.web` key (which
 * belongs to `@deepseek-ai/dsh-web`).
 *
 * @module dsh-web-search-zai
 */

import type { Context } from '@deepseek-ai/cordis'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import { launchEnvironmentOf } from '@deepseek-ai/dsh-launch-environment'
import { installSettingsSection, settingsNamespace } from '@deepseek-ai/dsh-settings'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-web'
import {
  ZaiSearchProvider,
  ZAI_DEFAULT_BASE_URL,
  ZAI_DEFAULT_SEARCH_ENGINE,
} from './provider.ts'
import type { ZaiSearchProviderOptions } from './provider.ts'
import type { ZaiRecency } from './types.ts'

export {
  ZAI_DEFAULT_BASE_URL,
  ZAI_DEFAULT_SEARCH_ENGINE,
  ZAI_PROVIDER_ID,
  ZaiSearchProvider,
} from './provider.ts'
export type { ZaiSearchProviderOptions } from './provider.ts'
export type { ZaiError, ZaiRecency, ZaiResult, ZaiSearchRequest, ZaiSearchResponse } from './types.ts'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'web-search-zai'

/** The web seam this provider registers into. */
export const inject = ['web']

const DEFAULT_API_KEY_ENV = 'ZAI_API_KEY'

/** Environment variable naming this provider's endpoint (distinct from the GLM chat adapter's). */
const SEARCH_BASE_URL_ENV = 'ZAI_SEARCH_BASE_URL'

/** Plugin config (all optional — `apply` fills env-var and constant defaults). */
export interface Config {
  /** Literal ZAI API key; prefer {@link apiKeyEnv} so no secret enters configuration files. */
  apiKey?: string
  /** Credential reference resolved for each search; defaults to `ZAI_API_KEY`. */
  apiKeyEnv?: string
  /** Endpoint base; `/web_search` is appended. Defaults to the public `api.z.ai` API. */
  baseURL?: string
  /** Engine name: `search-prime` (api.z.ai, default) or `search_pro` (open.bigmodel.cn). */
  searchEngine?: string
  /** Recency window sent as `search_recency_filter`. Omitted = no filter. */
  searchRecency?: ZaiRecency
}

export const Config: z<Config> = z.object({
  apiKey: z.string().role('secret'),
  apiKeyEnv: z.string().role('credential-ref').default(DEFAULT_API_KEY_ENV),
  baseURL: z.string(),
  searchEngine: z.string().default(ZAI_DEFAULT_SEARCH_ENGINE),
  searchRecency: z.union(['day', 'week', 'month', 'year'] as const),
})

/** Settings namespace carrying this provider's endpoint, engine, and key reference. */
export const WEB_SEARCH_ZAI_SETTINGS_NAMESPACE = settingsNamespace('web-search-zai')

/**
 * Project one resolved section into the provider's options. Env-var fallbacks
 * live here, not in the provider, so everything it reads is fully defaulted.
 * @param ctx - plugin context supplying the credential and environment planes.
 * @param config - the currently authoritative section.
 * @returns options for one search.
 */
function resolveOptions(ctx: Context, config: Config): ZaiSearchProviderOptions {
  const apiKeyEnv = credentialRef(config.apiKeyEnv ?? DEFAULT_API_KEY_ENV)
  const literalApiKey = config.apiKey !== undefined && config.apiKey.length > 0
    ? config.apiKey
    : undefined
  return {
    ...literalApiKey === undefined ? {} : { apiKey: literalApiKey },
    resolveApiKey: async () => {
      const credentials = ctx.get('credentials')
      if (credentials !== undefined) return (await credentials.resolve(apiKeyEnv))?.value
      // Without the seam the environment is the whole credential plane.
      const ambient = launchEnvironmentOf(ctx).get(apiKeyEnv)
      return ambient !== undefined && ambient.value.length > 0 ? ambient.value : undefined
    },
    apiKeyEnv,
    baseURL: config.baseURL
      ?? launchEnvironmentOf(ctx).get(SEARCH_BASE_URL_ENV)?.value
      ?? ZAI_DEFAULT_BASE_URL,
    searchEngine: config.searchEngine ?? ZAI_DEFAULT_SEARCH_ENGINE,
    ...config.searchRecency !== undefined ? { searchRecency: config.searchRecency } : {},
  }
}

/** Register the ZAI search provider with `ctx.web`. */
export function apply(ctx: Context, config: Config): void {
  let current: () => Config = () => config
  installSettingsSection(ctx, WEB_SEARCH_ZAI_SETTINGS_NAMESPACE, Config, config, {
    setSource: (source) => {
      current = source
    },
    // No onChange: the provider re-projects the section per search.
    onChange: () => {},
  })
  ctx.web.registerSearchProvider(new ZaiSearchProvider(() => resolveOptions(ctx, current())))
}
