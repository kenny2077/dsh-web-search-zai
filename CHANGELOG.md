# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

- feat!: default search to Coding Plan MCP quota; set `billingMode: "api"` to retain REST API billing when upgrading.
- feat: add per-search MCP discovery, result normalization, cancellation, a 60-second deadline, and no paid fallback.
- feat: add an English/Chinese Z.ai settings card with saved billing mode, managed credentials, advanced settings, and non-secret reset.
- fix: prevent credential values from appearing in provider diagnostics.
- fix: support atomic settings saves on published DSH 0.1.1-rc.2 as well as newer grouped-write scopes.
- test: cover local JSON/SSE MCP servers, quota errors, lifecycle, settings conflicts, partial saves, and browser loading.
- docs: distinguish Coding Plan quota from API balance and require explicit billing mode for live smoke tests.

## [0.1.0] - 2026-08-28

First public release.

- ZAI (Zhipu/GLM) web search provider for the DeepSeek Harness `ctx.web` seam,
  backed by the standalone Web Search API (`POST /web_search`).
- Key resolves from the managed credentials store (`ZAI_API_KEY`), the launch
  environment, or a literal `apiKey` in config — same key as the GLM chat model.
- Runtime-configurable settings section (`web-search-zai`): endpoint, engine,
  and recency window take effect on the next search, no restart.
- `cordis.patch.yml` overlay registers the provider and selects it as the
  active `searchProvider` in one `dsh plugin add`.
- 34 unit tests plus a live-API smoke test that self-skips without
  `ZAI_API_KEY`.
