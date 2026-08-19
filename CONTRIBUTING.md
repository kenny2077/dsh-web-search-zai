# Contributing

Thanks for your interest in improving `dsh-web-search-zai`!

## Architecture note

This is an implementation package, not a service: it registers a
`WebSearchProvider` into the `ctx.web` seam (`inject: ['web']`) and owns
nothing else. The `ctx.web` key belongs to `@deepseek-ai/dsh-web`, and the
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
pnpm build       # emits lib/*.js + lib/types/*.d.ts
pnpm test        # unit suite (34 tests)
```

The live-API smoke test self-skips unless a `ZAI_API_KEY` is present in the
environment:

```sh
ZAI_API_KEY=<your key> pnpm exec vitest run tests/zai.e2e.ts
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
