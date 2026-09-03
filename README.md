# dsh-web-search-zai

**Single-key model: reuses your existing `ZAI_API_KEY` for both chat and search.**

A web-search plugin for the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness), powered by Z.ai (GLM). Reuse the same key for search, choosing Coding Plan MCP quota or separately billed API balance.

[![CI](https://github.com/kenny2077/dsh-web-search-zai/actions/workflows/ci.yml/badge.svg)](https://github.com/kenny2077/dsh-web-search-zai/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/dsh-web-search-zai)](https://www.npmjs.com/package/dsh-web-search-zai)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

English | [中文](README.zh.md)

## The whole point: one key, both chat and search

`dsh-web-search-zai` is a community plugin that plugs a ZAI (Zhipu/GLM) search provider into the harness's [`ctx.web` capability seam](https://github.com/deepseek-ai/deepseek-harness/blob/main/packages/web/web/README.md). Its reason to exist is the key: the same `ZAI_API_KEY` that authorizes GLM chat authorizes this search. The plugin resolves that credential on every search — from the harness credentials store, the launch environment, or a config literal — and uses the selected billing mode. Coding Plan is the default.

- **No new credentials.** If `ZAI_API_KEY` is already configured for chat, the search side is done. The key is re-read on every search, so rotating it updates search too.
- **Two explicit billing modes.** `coding-plan` consumes subscription MCP quota; `api` consumes API balance. The plugin never falls back to paid API automatically.
- **One command to install.** `dsh plugin add dsh-web-search-zai` — the bundled overlay registers the provider and switches the active `searchProvider` from `deepseek-official` to `zai` in one step.
- **Fits the seam, not around it.** Registers into `ctx.web` exactly like the built-in DeepSeek provider, so [`dsh-tool-web`](https://github.com/deepseek-ai/deepseek-harness/blob/main/packages/web/tool-web/README.md) and everything above the seam work unchanged.
- **Dedicated settings card.** Web Search (Z.ai) shows the saved billing mode, key status, and advanced options in English or Chinese. A saved change takes effect on the next search.
- **No invented fields.** Only what the API actually returns gets mapped — if ZAI doesn't send a publication date, you won't get a fabricated one.

> **Upgrading from 0.1.0:** omitted `billingMode` now means `coding-plan`. Set `billingMode: "api"` explicitly to retain REST API search. Coding Plan needs an eligible Z.ai subscription; the same key does not imply the same billing allowance.

## How it works

```text
model → web_search → ctx.web → web-search-zai
                                  │
                       same ZAI_API_KEY
                         ┌────────┴────────┐
                         ▼                 ▼
                    coding-plan           api
                    Z.ai MCP         POST /web_search
                    plan quota        API balance
                         └────────┬────────┘
                                  ▼
                       normalized sources
```

REST returns `search_result[]`; MCP returns structured content or JSON text, including double-encoded arrays. Both map to sources without a generated answer:

| ZAI field | Seam field | Notes |
|---|---|---|
| `link` | `url` | Entry dropped if missing |
| `title` | `title` | Omitted when empty |
| `content` | `snippet` | Entry dropped if blank |
| — | `publishedAt` | Not mapped by this plugin |

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

3. **Choose a billing mode** in Settings → Web Search (Z.ai). Coding Plan is selected by default. API mode uses API balance. Ask the harness something current to run a search.

## Configuration

The dedicated card uses the `web-search-zai` settings namespace. Non-secret fields are read from the host's shared settings mirror and saved with revision checks. The masked key field writes only to DSH credentials; a blank key preserves its current value. Replacing the default `ZAI_API_KEY` also affects chat using that key.

Advanced settings expose the credential reference and the selected transport's options. Save a changed credential reference before entering its key. **Reset search settings** clears only the card's non-secret user overrides, restoring composition defaults; it keeps the shared key. If settings changed while editing, discard edits and retry. A partial save explicitly reports whether settings were saved but the key failed.

Credential precedence remains: a nonempty literal `apiKey`, then the configured credential reference through DSH credentials (or the launch environment when the credentials service is absent). The card identifies a literal override and disables key editing until it is removed from configuration. Non-secret settings use DSH's user → composition → schema-default precedence; REST `baseURL` additionally falls back to `ZAI_SEARCH_BASE_URL` before the built-in URL.

The GUI requires a DSH web client providing `settingsScope` and writable host settings. Unavailable, non-loopback, or read-only settings remain disabled; file-based configuration continues to work.

| Key | Default | Meaning |
|---|---|---|
| `billingMode` | `coding-plan` | `coding-plan` uses MCP quota; `api` uses API balance. No automatic fallback. |
| `mcpURL` | `https://api.z.ai/api/mcp/web_search_prime/mcp` | Full Coding Plan Streamable HTTP endpoint. |
| `apiKey` | (from credentials store) | Literal ZAI API key. Prefer `apiKeyEnv` so no secret enters config files. |
| `apiKeyEnv` | `ZAI_API_KEY` | Credential reference resolved for each search. |
| `baseURL` | `https://api.z.ai/api/paas/v4` | API mode only: endpoint base; `/web_search` is appended. |
| `searchEngine` | `search-prime` | API mode only: `search-prime` for `api.z.ai`; `search_pro` (underscore) for `open.bigmodel.cn`. |
| `searchRecency` | (unset) | API mode only: recency filter: `day`, `week`, `month`, or `year`. |

Example user settings:

```yaml
web-search-zai:
  billingMode: coding-plan  # change to api to use API balance
  apiKeyEnv: ZAI_API_KEY
```

Coding Plan uses the [Web Search MCP endpoint](https://docs.z.ai/devpack/mcp/search-mcp-server), not `/api/coding/paas/v4/web_search`. See that page for current quotas and the [Z.ai usage policy](https://docs.z.ai/devpack/usage-policy) for eligibility. This is a community integration; DSH is not advertised as officially endorsed by Z.ai.

## Known limitations

- Results without a link or snippet are dropped, so you may get fewer sources than requested.
- Very short queries can return zero results (e.g. `"SP Tarkov mods installation"` → 0; add the word `"guide"` → 10). That's the upstream backend, not the plugin.
- Publication dates are not mapped by this plugin.
- The engine name differs per endpoint (`search-prime` vs `search_pro`); it's a config field, not auto-derived.
- Caller cancellation maps to `WEB_ABORTED`, including custom cancellation reasons. Coding Plan searches have an overall 60-second deadline and are cancelled on plugin unload.
- Coding Plan sends `search_query` and a result-count hint only when the server advertises `count`. Engine and recency settings apply only to REST mode. The web service enforces the final result limit.
- MCP connections are created per search and closed afterward. Search calls are not automatically retried.
- The chat-side `web_search` tool-injection variant is not implemented.

## Development

```sh
pnpm install     # all dependencies (including DSH seam packages) come from npm
pnpm typecheck   # tsc --noEmit
pnpm build       # emits node code, declarations, and the DSH lib/client.js bundle
pnpm test        # REST, local MCP server, card, and built-bundle tests
```

Routine tests never call Z.ai. Local MCP tests need loopback listening permission. Live smoke tests require both a key in the environment and an explicit billing mode:

```sh
# Export ZAI_API_KEY securely first. Each command performs one live search.
ZAI_LIVE_BILLING_MODE=coding-plan pnpm test:live
ZAI_LIVE_BILLING_MODE=api pnpm test:live  # consumes API balance
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE)
