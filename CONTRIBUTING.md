# Contributing

Thanks for your interest in improving `dsh-web-search-zai`!

## Architecture note

This is an implementation package, not a service: it registers a
`WebSearchProvider` into the `ctx.web` seam (`inject: ['web']`) and includes a browser settings card. The `ctx.web` key belongs to `@deepseek-ai/dsh-web`, and the
model-facing tool lives in `@deepseek-ai/dsh-tool-web` — both work with this
provider unchanged.

## Setup

Requirements: Node.js 22.19+ (or 24+) and pnpm 11 (Corepack-enabled).

```sh
pnpm install --frozen-lockfile
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
# Zhipu Coding Plan (choose this instead of the international test):
ZAI_LIVE_BILLING_MODE=coding-plan ZAI_SEARCH_MCP_URL=https://open.bigmodel.cn/api/mcp/web_search_prime/mcp pnpm test:live
# Use ZAI_LIVE_BILLING_MODE=api only when deliberately testing paid API mode.
```

Note that runtime `lib/*.js` bundles and `lib/types/` declarations are committed, so git installs work without a build step —
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

## Windows live smoke

Set the key securely in the launching environment first. Never put it in a
committed file or a test fixture. Run only the mode you intend to bill:

```powershell
$env:ZAI_LIVE_BILLING_MODE = "coding-plan"
$env:ZAI_SEARCH_MCP_URL = "https://open.bigmodel.cn/api/mcp/web_search_prime/mcp"
pnpm test:live
Remove-Item Env:ZAI_LIVE_BILLING_MODE
Remove-Item Env:ZAI_SEARCH_MCP_URL
```

## Release preparation

1. Update `package.json`, the provider user-agent version, and `CHANGELOG.md` together.
2. Run typecheck, build, and tests. Commit runtime bundles and declarations.
3. Verify the distributable with the same commands used in CI:

   ```sh
   pnpm pack --out dsh-web-search-zai.tgz
   npm install --prefix .package-smoke ./dsh-web-search-zai.tgz --omit=dev --ignore-scripts --no-package-lock --no-audit --no-fund
   node scripts/check-package.mjs .package-smoke
   ```

   This installs runtime and peer dependencies in a separate consumer and checks
   imports, public declarations, the browser bundle, and DSH registration. It
   does not contact a search endpoint. The tarball and consumer folder are ignored
   by Git. Start with an empty consumer folder when checking a different package.

4. Require passing Node 22/24 checks on both Windows and Ubuntu. Confirm npm/Git
   install instructions and the local-link dependency step match the package.
5. Record live verification separately from automated coverage. Do not rerun live
   searches automatically or assume a successful search establishes a fixed point cost.
6. At publication, date the changelog and update **both** README release notices,
   npm installation notes, upgrade table, and missing-card troubleshooting. Until
   then, they must state that npm 0.1.0 is REST-only.
7. Publish only as an explicit release action; verify the npm dist-tag afterward.
   Update the Awesome DSH Plugins description through its normal contribution
   process once the release is available. The current listing describes REST only.
