/**
 * Coding Plan MCP search transport.
 *
 * Each search opens a Streamable HTTP connection to the Z.ai / Zhipu MCP
 * endpoint, discovers the `webSearchPrime` tool, calls it, and normalises the
 * result into the provider's `ZaiSearchResponse` envelope. The connection is
 * closed after every call so rotation and cancellation cannot affect another
 * in-flight search.
 *
 * @module dsh-web-search-zai/mcp
 */
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { WebSearchRequest } from '@deepseek-ai/dsh-web';
import type { ZaiSearchResponse } from './types.ts';
/** MCP errors and unknown payloads must never look like a successful empty search. */
export declare function parseMcpSearchResult(result: CallToolResult): ZaiSearchResponse;
/** A search owns its connection, so rotation and cancellation cannot affect another call. */
export declare function searchCodingPlan(endpoint: string, apiKey: string, userAgent: string, request: WebSearchRequest, signal: AbortSignal): Promise<ZaiSearchResponse>;
//# sourceMappingURL=mcp.d.ts.map