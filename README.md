# Web Search (Z.ai) for DeepSeek Harness

Search the web from DeepSeek Harness using **Z.ai or Zhipu**, with a native settings card in English and Chinese. Choose **Coding Plan MCP quota** or **REST API balance**, and reuse your existing `ZAI_API_KEY` when it is eligible for the selected service.

[![CI](https://github.com/kenny2077/dsh-web-search-zai/actions/workflows/ci.yml/badge.svg)](https://github.com/kenny2077/dsh-web-search-zai/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/dsh-web-search-zai)](https://www.npmjs.com/package/dsh-web-search-zai)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

English | [中文](README.zh.md) · Listed in [Awesome DSH Plugins](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/data/plugins/kenny2077__dsh-web-search-zai.yml)

> **New in 0.2.0:** Coding Plan MCP search, a native English/Chinese settings card, and explicit Z.ai / Zhipu endpoints. REST API mode remains available.
>
> **Existing users:** the default changes from REST to Coding Plan. To keep your current API billing, explicitly save **API — API balance** before your first search after upgrading. See [Upgrading from 0.1.0](#upgrading-from-010).

## What changes in 0.2

- **Two billing modes.** Coding Plan is the default. API mode retains the existing REST transport and its engine/recency options. There is no automatic fallback to paid API.
- **Native settings.** Set the mode, manage your key, and choose the Z.ai or Zhipu MCP endpoint in Settings → Web Search (Z.ai). Changes apply to the next search.
- **Same DSH integration.** Provider ID `zai`, the `web-search-zai` settings namespace, and the model-facing web-search tools stay the same.
- **Keys stay in credentials.** Blank input preserves the shared key. Reset clears only search-setting overrides; it keeps the key.

| Mode | Uses | Choose it when |
| --- | --- | --- |
| **Coding Plan** (`coding-plan`, default) | Subscription MCP quota | Your key has an eligible Coding Plan subscription |
| **API** (`api`) | Separately billed API balance | You want REST search or are keeping your 0.1.0 setup |

A search can consume quota even without a chat inference request. In our Zhipu test, a search was observed to consume **one point**. A point is not a model token, and this observation is not a guaranteed rate or allowance. Check the current [Z.ai search documentation](https://docs.z.ai/devpack/mcp/search-mcp-server), [Z.ai usage policy](https://docs.z.ai/devpack/usage-policy), and [Zhipu search documentation](https://docs.bigmodel.cn/cn/coding-plan/mcp/search-mcp-server) for your account. This is a community plugin; listing in a community catalog does not imply official DSH or Z.ai endorsement.

## Install and configure

Requirements: DeepSeek Harness with the `dsh` CLI and its web settings services, plus Node.js **22.19+ within Node 22, or 24+**. Use a native key for the service you select; third-party chat gateway keys are not supported.

Install the npm package into the **web** profile:

```sh
dsh plugin --profile web add dsh-web-search-zai@latest
dsh web
```

Prebuilt JavaScript is included. The package manager installs runtime dependencies; you do not need to allow a plugin build script. If you run DSH from its source repository, use `pnpm dsh` in place of `dsh` from that repository.

Alternatively, install the latest GitHub build:

```sh
dsh plugin --profile web add github:kenny2077/dsh-web-search-zai
```

In **Settings → Web Search (Z.ai)**:

1. Choose **Coding Plan — subscription MCP quota** or **API — API balance**.
2. Leave the masked key input blank if DSH already has the right `ZAI_API_KEY`. Otherwise enter the key. Replacing the shared key also affects chat using that credential.
3. For a **Zhipu / China** Coding Plan key, open **Advanced settings**, click **Use Zhipu (China)**, and save. Z.ai international is the default. Key format and UI language do not select the endpoint automatically.
4. Save, then ask DSH to search the web. The card shows the **saved mode**, which can differ from an unsaved selection.

### Installing a local checkout

Local-path installs link to your checkout. Install its dependencies before registering it, and repeat `pnpm install --frozen-lockfile` after pulling an upgrade:

```sh
git clone https://github.com/kenny2077/dsh-web-search-zai.git
cd dsh-web-search-zai
pnpm install --frozen-lockfile
dsh plugin --profile web add .
dsh web
```

With a source checkout of DSH, run `pnpm dsh plugin --profile web add <absolute-plugin-path>` from the DSH repository after installing the plugin's dependencies.

## Upgrading from 0.1.0

Your key, credential reference, REST endpoint, engine, and recency settings keep their meaning. **An omitted `billingMode` now selects Coding Plan**, including configurations created by 0.1.0. No automatic migration guesses your subscription or changes your billing choice.

### Keep REST API billing

After upgrading, choose **API — API balance** in the card and **Save before searching**. For a file-based setup, stop DSH and add this field to the existing namespace in `$DSH_HOME/settings.yaml`:

```yaml
web-search-zai:
  billingMode: api
  # Keep your existing apiKeyEnv, baseURL, searchEngine, and searchRecency here.
```

Merge this field into your existing settings; do not replace the whole file. A previously configured REST `baseURL` or `ZAI_SEARCH_BASE_URL` does not select API mode by itself.

### Choose Coding Plan

Save **Coding Plan** and an endpoint matching the service that issued your key:

| Service | `mcpURL` |
| --- | --- |
| Z.ai international (default) | `https://api.z.ai/api/mcp/web_search_prime/mcp` |
| Zhipu / China | `https://open.bigmodel.cn/api/mcp/web_search_prime/mcp` |

For Zhipu:

```yaml
web-search-zai:
  billingMode: coding-plan
  mcpURL: https://open.bigmodel.cn/api/mcp/web_search_prime/mcp
  apiKeyEnv: ZAI_API_KEY
```

An exhausted or ineligible Coding Plan returns an error. Switching to API billing is always an explicit choice.

### Update the installation

Stop DSH, use the command for your installation, then restart DSH and reload its browser page:

| Installed from | Update |
| --- | --- |
| npm | `dsh plugin --profile web update dsh-web-search-zai --latest` |
| GitHub | `dsh plugin --profile web update dsh-web-search-zai --latest` |
| Local checkout | Run `git pull --ff-only`, then `pnpm install --frozen-lockfile` in the plugin checkout |

To try the GitHub build from an npm installation, run the GitHub install command above. To return to the previous release, use `dsh plugin --profile web add dsh-web-search-zai@0.1.0` and restart; that release always uses REST. Your shared credential remains in DSH.

## Settings reference

| Field | Default | Purpose |
| --- | --- | --- |
| `billingMode` | `coding-plan` | `coding-plan` or `api` |
| `mcpURL` | Z.ai international URL above | Full MCP endpoint; Coding Plan only |
| `apiKeyEnv` | `ZAI_API_KEY` | DSH credential reference, resolved for each search |
| `apiKey` | Unset | Optional literal key; overrides the managed credential |
| `baseURL` | `https://api.z.ai/api/paas/v4` | REST only; `/web_search` is appended |
| `searchEngine` | `search-prime` | REST only; Zhipu uses `search_pro` |
| `searchRecency` | Unset | REST only; `day`, `week`, `month`, or `year` |

For Zhipu REST, set `baseURL` to `https://open.bigmodel.cn/api/paas/v4` and `searchEngine` to `search_pro`. MCP uses its own full URL, not the chat endpoint or REST base URL.

The card saves non-secret fields through DSH settings and writes keys only through DSH credentials. It never reads a stored key into the browser. A literal `apiKey` overrides the managed key; the card identifies that override and disables key editing until the literal is removed. Without DSH credentials, the provider resolves the configured reference from the launch environment.

**Save** writes edited fields with revision checks. If settings change while you are editing, discard the stale edits and retry. A failed key write after a successful settings save is reported separately; re-enter the key to retry. Save a changed credential reference before entering its key.

**Reset search settings** removes only the card's non-secret user overrides and restores inherited values, including the default Coding Plan mode when no composition override exists. It preserves the shared key. Controls are disabled when the host settings or credential service is unavailable or read-only.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| `Cannot find package '@modelcontextprotocol/sdk'` | For a local link, run `pnpm install --frozen-lockfile` **in the plugin checkout**, then restart DSH. `git pull` alone does not install new dependencies. |
| Search fails after upgrading | Check the **saved billing mode**. Existing REST users must explicitly select `api`. |
| Authentication or quota error | Match the key to its Z.ai/Zhipu endpoint and check the subscription or API balance for the selected mode. A configured badge reports key presence, not successful authentication. |
| New card is missing | Confirm the plugin is installed in the `web` profile, restart DSH, and reload the browser. The old 0.1.0 release has no card; update to 0.2.0 or later. |
| Settings are read-only | Use a supported DSH host connection with writable settings and credentials; file-based configuration remains available. |
| Fewer results than requested | The provider drops entries without a URL or nonblank snippet. The DSH web service caps the final result count. |

## How it fits into DSH

```text
DSH model → web_search tool → ctx.web → zai provider
                                        ├─ coding-plan → MCP search → plan quota
                                        └─ api → REST /web_search → API balance
                                                      ↓
                                      source URLs, titles, and snippets
```

The plugin registers into the existing `ctx.web` service. It returns sources; the chat model decides how to use them in its answer. No publication dates or generated answers are invented. It does not enable a model provider's separate chat-side `web_search` option.

MCP connections are created per search and closed afterward. Each Coding Plan operation has a 60-second deadline, supports caller cancellation, and is cancelled on plugin unload. HTTP redirects are rejected; searches are not automatically retried. Errors preserve DSH codes: `WEB_PROVIDER_ERROR`, `WEB_PROVIDER_CREDENTIAL_MISSING`, and `WEB_ABORTED`.

## Verification and development

Automated coverage includes REST regression tests, local MCP JSON/SSE servers, authentication headers, tool discovery, quota errors, malformed/double-encoded responses, cancellation, timeouts, settings conflicts, partial saves, and the browser bundle. CI runs on Windows and Ubuntu with Node 22 and 24.

Live checks are separate: Zhipu Coding Plan returned real results both directly and through DSH's registered `ctx.web` service. The maintainer also verified the plugin in DSH on Windows, and previously tested REST mode. These checks do not promise quota availability for another account or endpoint.

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build
pnpm test
```

Routine tests use local servers and consume no search quota. Opt-in live tests require `ZAI_API_KEY` and an explicit `ZAI_LIVE_BILLING_MODE` (`coding-plan` or `api`). Set `ZAI_SEARCH_MCP_URL` for Zhipu. Each `pnpm test:live` invocation performs one search. See [CONTRIBUTING.md](CONTRIBUTING.md) for commands and release checks, and [CHANGELOG.md](CHANGELOG.md) for changes.

## License

[MIT](LICENSE)
