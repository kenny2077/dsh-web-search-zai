# dsh-web-search-zai

**Web search for the DeepSeek Harness, powered by Z.ai (GLM).**

[![CI](https://github.com/kenny2077/dsh-web-search-zai/actions/workflows/ci.yml/badge.svg)](https://github.com/kenny2077/dsh-web-search-zai/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/dsh-web-search-zai)](https://www.npmjs.com/package/dsh-web-search-zai)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

English | [中文](README.zh.md)

## What is it

`dsh-web-search-zai` is a community plugin for the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) that plugs a [ZAI (Zhipu/GLM)](https://z.ai)-backed search provider into the harness's [`ctx.web` capability seam](https://github.com/deepseek-ai/deepseek-harness/blob/main/packages/web/web/README.md). One `dsh plugin add` and your harness searches the web through ZAI's standalone Web Search API — no editing of base bundles, no restart to change settings.

## Why

- **One key for chat and search.** The same `ZAI_API_KEY` that authorizes the GLM chat model authorizes this search. If you have an active Coding Plan or token balance, you're already set up.
- **Runtime-configurable.** Endpoint, engine, and recency window are plain settings — a committed change takes effect on the very next search, no restart.
- **Fits the seam, not around it.** The provider registers into `ctx.web` exactly like the built-in DeepSeek provider, so [`dsh-tool-web`](https://github.com/deepseek-ai/deepseek-harness/blob/main/packages/web/tool-web/README.md) and everything above the seam work unchanged.
- **No invented fields.** Only what the API actually returns gets mapped — if ZAI doesn't send a publication date, you won't get a fabricated one.

## How it works

```
dsh ──▶ ctx.web ──▶ web-search-zai ──▶ POST {baseURL}/web_search
                        │                    ZAI (Zhipu/GLM)
                        ◀──────────────────── search_result[]
                        │
                        └──▶ normalized WebSearchResult (sources + truncated)
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

You'll need the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) installed (`dsh` CLI available) and a ZAI API key.

1. **Get a key** at [z.ai](https://z.ai) (international) or [open.bigmodel.cn](https://open.bigmodel.cn) (China), then store it so it never lands in a config file — via the harness web UI (Models page), a `ZAI_API_KEY` entry in `$DSH_HOME/.credentials.yaml`, or the launching environment.

   > A Token Rhythm (chat gateway) key does **not** work here — only a native ZAI key.

2. **Install the plugin:**

   ```sh
   dsh plugin add dsh-web-search-zai        # from npm
   dsh plugin add github:kenny2077/dsh-web-search-zai   # from git (prebuilt, no build step)
   ```

   The `cordis.patch.yml` overlay registers the provider and switches the active `searchProvider` from `deepseek-official` to `zai` in one step. To go back: `dsh plugin remove dsh-web-search-zai`.

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
