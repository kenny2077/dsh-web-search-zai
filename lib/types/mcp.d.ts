import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { WebSearchRequest } from '@deepseek-ai/dsh-web';
import type { ZaiSearchResponse } from './types.ts';
/** MCP errors and unknown payloads must never look like a successful empty search. */
export declare function parseMcpSearchResult(result: CallToolResult): ZaiSearchResponse;
/** A search owns its connection, so rotation and cancellation cannot affect another call. */
export declare function searchCodingPlan(endpoint: string, apiKey: string, userAgent: string, request: WebSearchRequest, signal: AbortSignal): Promise<ZaiSearchResponse>;
//# sourceMappingURL=mcp.d.ts.map