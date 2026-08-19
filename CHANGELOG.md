# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
