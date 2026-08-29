# dsh-web-search-zai

**Single-key model: reuses your existing `ZAI_API_KEY` for both chat and search.**

A web-search plugin for the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness), powered by Z.ai (GLM). If your harness already chats through GLM, you already have web search — no new account, no second key, nothing else to configure.

[![CI](https://github.com/kenny2077/dsh-web-search-zai/actions/workflows/ci.yml/badge.svg)](https://github.com/kenny2077/dsh-web-search-zai/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/dsh-web-search-zai)](https://www.npmjs.com/package/dsh-web-search-zai)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

English | [中文](README.zh.md)

## The whole point: one key, both chat and search

`dsh-web-search-zai` is a community plugin that plugs a ZAI (Zhipu/GLM) search provider into the harness's [`ctx.web` capability seam](https://github.com/deepseek-ai/deepseek-harness/blob/main/packages/web/web/README.md). Its reason to exist is the key: the same `ZAI_API_KEY` that authorizes GLM chat authorizes this search. The plugin resolves that credential on every search — from the harness credentials store, the launch environment, or a config literal — and calls ZAI's standalone Web Search API with it. That's the entire setup.

- **No new credentials.** If `ZAI_API_KEY` is already configured for chat, the search side is done. The key is re-read on every search, so rotating it updates search too.
- **No separate billing.** Search runs on the same ZAI account as your chat — the same key works whether it came with a Coding Plan or a token balance.
- **One command to install.** `dsh plugin add dsh-web-search-zai` — the bundled overlay registers the provider and switches the active `searchProvider` from `deepseek-official` to `zai` in one step.
- **Fits the seam, not around it.** Registers into `ctx.web` exactly like the built-in DeepSeek provider, so [`dsh-tool-web`](https://github.com/deepseek-ai/deepseek-harness/blob/main/packages/web/tool-web/README.md) and everything above the seam work unchanged.
- **Runtime-configurable.** Endpoint, engine, and recency window are plain settings — a change takes effect on the very next search, no restart.
- **No invented fields.** Only what the API actually returns gets mapped — if ZAI doesn't send a publication date, you won't get a fabricated one.

> Chat stays untouched: the plugin only adds a search provider and only calls the standalone Web Search API (`POST /web_search`). Your chat configuration is exactly as you left it.

## How it works

```
┌────────────────────────────────────────────────┐
│                DeepSeek Harness                │
│                                                │
│  model ──▶ web_search tool ──▶ ctx.web seam    │
└───────────────────────────────────────────┬────┘
                                            │
                                            ▼
                            ┌──────────────────────────────┐
ZAI_API_KEY ───────────────▶│        web-search-zai        │
 (same key as GLM chat)     │        (this plugin)         │
                            └───────────────┬──────────────┘
                                            │  POST {baseURL}/web_search
                                            ▼
                            ┌──────────────────────────────┐
                            │      ZAI (Zhipu / GLM)       │
                            │  standalone Web Search API   │
                            └───────────────┬──────────────┘
                                            │  search_result[]
                                            ▼
                               normalized WebSearchResult
                                  (sources + truncated)
                            ──▶ back to your model, unchanged
```

ZAI returns a flat `search_result[]` with no generated answer, so each entry maps to a source and `content` is omitted:

| ZAI field | Seam field | Notes |
|---|---|---|
| `link` | `url` | Entry dropped if missing |
| `title` | `title` | Omitted when empty |
| `content` | `snippet` | Entry dropped if blank |
| — | `publishedAt` | Not returned by the API; omitted rather than invented |

Failures surface as standard `WebError` codes: `WEB_PROVIDER_ERROR` (HTTP/network/bad body), `WEB_ABORTED` (cancellation), and `WEB_PROVIDER_CREDENTIAL_MISSING` (no key). Through `dsh-tool-web`, these reach the model under the consumer's usual error wrapper.

## Quick start

You'll need the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) installed (`dsh` CLI available).

1. **Have your `ZAI_API_KEY` ready — you probably already do.** If your harness chats through GLM, the key is already stored where this plugin looks: via the harness web UI (Models page), a `ZAI_API_KEY` entry in `$DSH_HOME/.credentials.yaml`, or the launching environment. Don't have one yet? Get it at [z.ai](https://z.ai) (international) or [open.bigmodel.cn](https://open.bigmodel.cn) (China).

   > A Token Rhythm (chat gateway) key does **not** work here — only a native ZAI key.

2. **Install the plugin:**

   ```sh
   dsh plugin add dsh-web-search-zai        # from npm
   dsh plugin add github:kenny2077/dsh-web-search-zai   # from git (prebuilt, no build step)
   ```

   The `cordis.patch.yml` overlay registers the provider and selects it as the active `searchProvider` in one step. To go back: `dsh plugin remove dsh-web-search-zai`.

3. **Search.** Ask your harness something current and watch the `web_search` tool return ZAI results.

## Configuration

All fields are runtime-configurable via the Settings GUI (`web-search-zai` namespace); changes apply on the next search.

| Key | Default | Meaning |
|---|---|---|
| `apiKey` | (from credentials store) | Literal ZAI API key. Prefer `apiKeyEnv` so no secret enters config files. |
| `apiKeyEnv` | `ZAI_API_KEY` | Credential reference resolved for each search. |
| `baseURL` | `https://api.z.ai/api/paas/v4` | Endpoint base; `/web_search` is appended. |
| `searchEngine` | `search-prime` | `search-prime` for `api.z.ai`; `search_pro` (underscore) for `open.bigmodel.cn`. |
| `searchRecency` | (unset) | Recency filter: `day`, `week`, `month`, or `year`. |

## Known limitations

- Results without a link or snippet are dropped, so you may get fewer sources than requested.
- Very short queries can return zero results (e.g. `"SP Tarkov mods installation"` → 0; add the word `"guide"` → 10). That's the upstream backend, not the plugin.
- No `publishedAt` — the API doesn't reliably return one.
- The engine name differs per endpoint (`search-prime` vs `search_pro`); it's a config field, not auto-derived.
- Only a `DOMException` named `AbortError` maps to `WEB_ABORTED`; aborts carrying custom reasons surface as `WEB_PROVIDER_ERROR`.
- The chat-side `web_search` tool-injection variant is deferred; this provider uses the standalone API only.

## Development

```sh
pnpm install     # all dependencies (including DSH seam packages) come from npm
pnpm typecheck   # tsc --noEmit
pnpm build       # emits lib/*.js + lib/types/*.d.ts
pnpm test        # unit suite (34 tests)
```

The live-API smoke test self-skips without a key:

```sh
ZAI_API_KEY=<key> pnpm exec vitest run tests/zai.e2e.ts
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE)
