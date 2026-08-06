# dsh-web-search-zai

**为 DeepSeek Harness 提供由 Z.ai（GLM）驱动的网络搜索。**

[![CI](https://github.com/kenny2077/dsh-web-search-zai/actions/workflows/ci.yml/badge.svg)](https://github.com/kenny2077/dsh-web-search-zai/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/dsh-web-search-zai)](https://www.npmjs.com/package/dsh-web-search-zai)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[English](README.md) | 中文

## 这是什么

`dsh-web-search-zai` 是 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的社区插件，把由 [ZAI（智谱／GLM）](https://z.ai)支持的搜索提供方接入 harness 的 [`ctx.web` 能力 seam](https://github.com/deepseek-ai/deepseek-harness/blob/main/packages/web/web/README.zh.md)。一条 `dsh plugin add`，你的 harness 就能通过 ZAI 的独立 Web 搜索 API 搜索网络——无需编辑基础包，更改设置也无需重启。

## 为什么用

- **聊天和搜索共用一把密钥。** 授权 GLM 聊天模型的同一个 `ZAI_API_KEY` 也授权此搜索。只要你有有效的 Coding Plan 或代币余额，就已经就绪。
- **运行时可配置。** 端点、引擎、时间窗口都是普通设置——提交后下一次搜索即生效，无需重启。
- **接入 seam，而非绕开它。** 提供方像内置的 DeepSeek 提供方一样注册进 `ctx.web`，[`dsh-tool-web`](https://github.com/deepseek-ai/deepseek-harness/blob/main/packages/web/tool-web/README.zh.md) 及 seam 之上的所有组件照常工作。
- **不编造字段。** 只映射 API 实际返回的内容——ZAI 不返回发布日期，你就不会看到虚构的日期。

## 工作原理

```
dsh ──▶ ctx.web ──▶ web-search-zai ──▶ POST {baseURL}/web_search
                        │                    ZAI（智谱/GLM）
                        ◀──────────────────── search_result[]
                        │
                        └──▶ 规范化的 WebSearchResult（sources + truncated）
```

ZAI 返回扁平的 `search_result[]`，没有生成式答案，因此每项映射为一个来源，`content` 省略：

| ZAI 字段 | Seam 字段 | 说明 |
|---|---|---|
| `link` | `url` | 缺失时丢弃该条 |
| `title` | `title` | 为空时省略 |
| `content` | `snippet` | 空白时丢弃该条 |
| — | `publishedAt` | API 不返回；省略而非编造 |

失败以标准 `WebError` 错误码呈现：`WEB_PROVIDER_ERROR`（HTTP／网络／坏响应体）、`WEB_ABORTED`（取消）、`WEB_PROVIDER_CREDENTIAL_MISSING`（无密钥）。经 `dsh-tool-web`，它们以消费方惯常的错误包装层到达模型。

## 快速开始

你需要已安装 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（`dsh` CLI 可用），以及一个 ZAI API 密钥。

1. **获取密钥**：在 [z.ai](https://z.ai)（国际）或 [open.bigmodel.cn](https://open.bigmodel.cn)（中国）注册，然后把它存进受管凭据，避免落入配置文件——通过 harness Web 界面（Models 页面）、`$DSH_HOME/.credentials.yaml` 中的 `ZAI_API_KEY` 条目，或启动环境变量。

   > Token Rhythm（聊天网关）密钥在这里**不可用**——只有 ZAI 原生密钥有效。

2. **安装插件：**

   ```sh
   dsh plugin add dsh-web-search-zai        # 从 npm
   dsh plugin add github:kenny2077/dsh-web-search-zai   # 从 git（预构建，无构建步骤）
   ```

   `cordis.patch.yml` 叠加层一步完成两件事：注册提供方，并把活动 `searchProvider` 从 `deepseek-official` 切换为 `zai`。切回：`dsh plugin remove dsh-web-search-zai`。

3. **搜索。** 让你的 harness 查一个时效性问题，看 `web_search` 工具返回 ZAI 结果。

## 配置

所有字段均可通过设置界面（`web-search-zai` 命名空间）在运行时调整；更改在下次搜索生效。

| 配置键 | 默认值 | 含义 |
|---|---|---|
| `apiKey` | （从凭据存储） | 字面 ZAI API 密钥。建议用 `apiKeyEnv`，避免密钥进入配置文件。 |
| `apiKeyEnv` | `ZAI_API_KEY` | 每次搜索解析的凭据引用。 |
| `baseURL` | `https://api.z.ai/api/paas/v4` | 端点基址；追加 `/web_search`。 |
| `searchEngine` | `search-prime` | `api.z.ai` 用 `search-prime`；`open.bigmodel.cn` 用 `search_pro`（下划线）。 |
| `searchRecency` | （未设置） | 时间窗口过滤：`day`、`week`、`month` 或 `year`。 |

## 已知限制

- 没有 `link` 或 `snippet` 的结果会被丢弃，因此返回来源可能少于请求数量。
- 极短的查询可能返回零结果（如 `"SP Tarkov mods installation"` → 0 条，加上 `"guide"` → 10 条）。这是上游后端行为，不是插件问题。
- 不提供 `publishedAt`——API 不稳定返回该字段。
- 引擎名因端点而异（`search-prime` 与 `search_pro`）；是配置项，不做自动推断。
- 只有名为 `AbortError` 的 `DOMException` 映射为 `WEB_ABORTED`；携带自定义原因的中止呈现为 `WEB_PROVIDER_ERROR`。
- chat 端 `web_search` 工具注入方式暂缓；本提供方仅使用独立 API。

## 开发

```sh
pnpm install     # 全部依赖（包括 DSH seam 包）均来自 npm
pnpm typecheck   # tsc --noEmit
pnpm build       # 产出 lib/*.js 与 lib/types/*.d.ts
pnpm test        # 单元测试（34 个）
```

实时 API 冒烟测试在没有密钥时自动跳过：

```sh
ZAI_API_KEY=<key> pnpm exec vitest run tests/zai.e2e.ts
```

贡献指南见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 许可证

[MIT](LICENSE)
