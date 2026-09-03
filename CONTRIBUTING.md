# Contributing

Thanks for your interest in improving `dsh-web-search-zai`!

## Architecture note

This is an implementation package, not a service: it registers a
`WebSearchProvider` into the `ctx.web` seam (`inject: ['web']`) and includes a browser settings card. The `ctx.web` key belongs to `@deepseek-ai/dsh-web`, and the
model-facing tool lives in `@deepseek-ai/dsh-tool-web` — both work with this
provider unchanged.

## Setup

Requirements: Node.js 22.19+ (or 24+) and pnpm 10+ (Corepack-enabled).

```sh
pnpm install
```

There is no monorepo to clone — all dependencies (including the DSH seam
packages) install from npm.

## Build, check, test

```sh
pnpm typecheck   # tsc --noEmit
pnpm build       # emits node code, declarations, and the DSH client bundle
pnpm test        # REST, local MCP server, card, and bundle tests
```

The local MCP tests need loopback listening permission. Live tests require both
`ZAI_API_KEY` and an explicit `ZAI_LIVE_BILLING_MODE`; API mode consumes API balance:

```sh
ZAI_LIVE_BILLING_MODE=coding-plan pnpm test:live
# Use ZAI_LIVE_BILLING_MODE=api only when deliberately testing paid API mode.
```

Note that `lib/*.js` is committed, so git installs work without a build step —
run `pnpm build` after touching `src/` and commit the result.

## Guidelines

- Match the existing code style: strict TypeScript, single quotes, no
  semicolons, 2-space indent.
- Keep the seam contract intact: errors must surface as `WebError` codes
  (`WEB_PROVIDER_ERROR`, `WEB_ABORTED`, `WEB_PROVIDER_CREDENTIAL_MISSING`),
  and cancellation must never be swallowed into a generic provider error.
- Add or update tests for behavior changes; the suite must stay green before
  opening a PR.
- Update both `README.md` and `README.zh.md` when user-facing behavior changes.

Use Conventional Commit messages such as `feat:`, `fix:`, `docs:`, and `test:`.
