/**
 * Wire types for the ZAI (Zhipu/GLM) standalone Web Search API
 * (`POST https://api.z.ai/api/paas/v4/web_search`). Types only — no runtime code.
 *
 * Field names verified against the official Z.AI / bigmodel.cn docs. Note the
 * response field is `search_result[].link`, not `markdown_link` (a community
 * wrapper rename seen in the wild).
 *
 * @module dsh-web-search-zai/types
 */

/** Recency window values the ZAI API accepts for `search_recency_filter`. */
export type ZaiRecency = 'day' | 'week' | 'month' | 'year'

/** Request body sent to the ZAI Web Search endpoint. */
export interface ZaiSearchRequest {
  /** The search query. */
  search_query: string
  /**
   * Caller-generated correlation id (6–64 chars). Generated as a UUID per call;
   * optional in the API but always sent so a request is traceable.
   */
  request_id: string
  /** Engine name: `search-prime` (api.z.ai) or `search_pro` (open.bigmodel.cn). */
  search_engine: string
  /** Result-count hint; the seam still enforces the bound on return. */
  num?: number
  /** Optional recency window. Omitted = no filter. */
  search_recency_filter?: ZaiRecency
}

/** One entry of the response `search_result[]`. */
export interface ZaiResult {
  /** The source URL (the primary citeable link). */
  link?: string | null
  /** Excerpt/summary text — becomes the `snippet`. */
  content?: string | null
  /** Optional media reference (often empty; not mapped by the seam). */
  media?: string
  /** Optional positional index (not mapped). */
  index?: number
  /** Optional title. */
  title?: string | null
}

/** The ZAI Web Search response envelope. */
export interface ZaiSearchResponse {
  search_result?: ZaiResult[]
}

/** ZAI error response envelope (best-effort; fields vary by failure). */
export interface ZaiError {
  error?: string | { message?: string }
  message?: string
}
