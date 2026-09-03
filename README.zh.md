# dsh-web-search-zai

**单密钥模式：复用你已有的 `ZAI_API_KEY`，聊天与搜索共用一把密钥。**

为 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 提供由 Z.ai（GLM）驱动的网络搜索。复用同一把密钥，并明确选择 Coding Plan MCP 额度或单独计费的 API 余额。

[![CI](https://github.com/kenny2077/dsh-web-search-zai/actions/workflows/ci.yml/badge.svg)](https://github.com/kenny2077/dsh-web-search-zai/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/dsh-web-search-zai)](https://www.npmjs.com/package/dsh-web-search-zai)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[English](README.md) | 中文

## 核心价值：一把密钥，聊天与搜索两用

`dsh-web-search-zai` 是一个社区插件，把 ZAI（智谱/GLM）搜索提供方接入 harness 的 [`ctx.web` 能力 seam](https://github.com/deepseek-ai/deepseek-harness/blob/main/packages/web/web/README.zh.md)。它存在的理由就是这把密钥：授权 GLM 聊天的同一个 `ZAI_API_KEY`，同样授权此搜索。插件在每次搜索时解析该凭据——来自 harness 凭据存储、启动环境或配置字面量——并使用所选计费模式。默认使用 Coding Plan。

- **无需新凭据。** 只要 `ZAI_API_KEY` 已为聊天配置好，搜索侧即告完成。密钥每次搜索都会重新读取，轮换密钥时搜索同步更新。
- **两种明确的计费模式。** `coding-plan` 消耗订阅的 MCP 额度，`api` 消耗 API 余额。插件绝不会自动回退到付费 API。
- **一条命令安装。** `dsh plugin add dsh-web-search-zai`——内置叠加层一步完成注册提供方，并把活动 `searchProvider` 从 `deepseek-official` 切换为 `zai`。
- **接入 seam，而非绕开它。** 像内置 DeepSeek 提供方一样注册进 `ctx.web`，[`dsh-tool-web`](https://github.com/deepseek-ai/deepseek-harness/blob/main/packages/web/tool-web/README.zh.md) 及 seam 之上的所有组件照常工作。
- **独立设置卡片。** 网页搜索（Z.ai）提供中英文界面，显示已保存的模式、密钥状态和高级选项。更改在下一次搜索时生效。
- **不编造字段。** 只映射 API 实际返回的内容——ZAI 不返回发布日期，你就不会看到虚构的日期。

> **从 0.1.0 升级：** 省略 `billingMode` 现在表示 `coding-plan`。要继续使用 REST API，请明确设置 `billingMode: "api"`。Coding Plan 需要符合条件的 Z.ai 订阅；共用密钥不代表共用计费额度。

## 工作原理

```text
model → web_search → ctx.web → web-search-zai
                                  │
                       同一个 ZAI_API_KEY
                         ┌────────┴────────┐
                         ▼                 ▼
                    coding-plan           api
                    Z.ai MCP         POST /web_search
                    套餐额度            API 余额
                         └────────┬────────┘
                                  ▼
                            标准化搜索来源
```

REST 返回 `search_result[]`；MCP 返回结构化结果或 JSON 文本（支持双重编码的数组）。两种模式均映射为来源，不生成答案：

| ZAI 字段 | Seam 字段 | 说明 |
|---|---|---|
| `link` | `url` | 缺失时丢弃该条 |
| `title` | `title` | 为空时省略 |
| `content` | `snippet` | 空白时丢弃该条 |
| — | `publishedAt` | 本插件不映射此字段 |

失败以标准 `WebError` 错误码呈现：`WEB_PROVIDER_ERROR`（HTTP／网络／坏响应体）、`WEB_ABORTED`（取消）、`WEB_PROVIDER_CREDENTIAL_MISSING`（无密钥）。经 `dsh-tool-web`，它们以消费方惯常的错误包装层到达模型。

## 快速开始

你需要已安装 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（`dsh` CLI 可用）。

1. **准备好 `ZAI_API_KEY`——大概率已经有了。** 如果你的 harness 在用 GLM 聊天，密钥已经存放在本插件读取的位置：harness Web 界面（Models 页面）、`$DSH_HOME/.credentials.yaml` 中的 `ZAI_API_KEY` 条目，或启动环境变量。还没有？在 [z.ai](https://z.ai)（国际）或 [open.bigmodel.cn](https://open.bigmodel.cn)（中国）获取。

   > Token Rhythm（聊天网关）密钥在这里**不可用**——只有 ZAI 原生密钥有效。

2. **安装插件：**

   ```sh
   dsh plugin add dsh-web-search-zai        # 从 npm
   dsh plugin add github:kenny2077/dsh-web-search-zai   # 从 git（预构建，无构建步骤）
   ```

   `cordis.patch.yml` 叠加层一步完成注册，并把该提供方选为活动 `searchProvider`。切回：`dsh plugin remove dsh-web-search-zai`。

3. **选择计费模式。** 打开设置 → 网页搜索（Z.ai）。默认使用 Coding Plan，API 模式消耗 API 余额。然后让 harness 搜索一个时效性问题。

## 配置

独立卡片使用 `web-search-zai` 设置命名空间。非密钥字段通过 DSH 共享设置镜像读取，并使用版本检查保存。密码框只向 DSH 凭据服务写入密钥；留空保留原值。替换默认 `ZAI_API_KEY` 也会影响使用同一密钥的聊天。

高级设置提供凭据引用名称及当前模式的选项。更改引用名称后，请先保存，再输入对应密钥。**重置搜索设置**只清除卡片管理的非密钥覆盖值，恢复继承配置，并保留共享密钥。编辑期间如有外部修改，请放弃更改后重试。部分保存失败时，界面会明确说明设置已保存但密钥保存失败。

密钥优先级保持不变：非空的配置字面值 `apiKey` 优先，其次由 DSH 凭据服务解析指定引用（未挂载凭据服务时读取启动环境）。卡片检测到明文覆盖值时，会提示移除该配置后再管理密钥。普通设置按用户设置 → 组合配置 → schema 默认值解析；REST 地址在未配置时读取 `ZAI_SEARCH_BASE_URL`，最后使用内置地址。

GUI 需要提供 `settingsScope` 和可写主机设置的 DSH Web 客户端。不可用、非回环连接或只读情况下，控件禁用；文件配置仍可使用。

| 配置键 | 默认值 | 含义 |
|---|---|---|
| `billingMode` | `coding-plan` | `coding-plan` 使用 MCP 额度；`api` 使用 API 余额，不会自动回退。 |
| `mcpURL` | `https://api.z.ai/api/mcp/web_search_prime/mcp` | 完整的 Coding Plan Streamable HTTP 地址。 |
| `apiKey` | （从凭据存储） | 字面 ZAI API 密钥。建议用 `apiKeyEnv`，避免密钥进入配置文件。 |
| `apiKeyEnv` | `ZAI_API_KEY` | 每次搜索解析的凭据引用。 |
| `baseURL` | `https://api.z.ai/api/paas/v4` | 仅 API 模式：端点基址；追加 `/web_search`。 |
| `searchEngine` | `search-prime` | 仅 API 模式：`api.z.ai` 用 `search-prime`；`open.bigmodel.cn` 用 `search_pro`（下划线）。 |
| `searchRecency` | （未设置） | 仅 API 模式：时间窗口过滤：`day`、`week`、`month` 或 `year`。 |

用户设置示例：

```yaml
web-search-zai:
  billingMode: coding-plan  # 改为 api 可使用 API 余额
  apiKeyEnv: ZAI_API_KEY
```

Coding Plan 使用 [Web Search MCP 地址](https://docs.z.ai/devpack/mcp/search-mcp-server)，而不是 `/api/coding/paas/v4/web_search`。当前额度请查看该文档，适用条件请参考 [Z.ai 使用政策](https://docs.z.ai/devpack/usage-policy)。这是社区集成，不宣称 DSH 获得 Z.ai 官方背书。

## 已知限制

- 没有 `link` 或 `snippet` 的结果会被丢弃，因此返回来源可能少于请求数量。
- 极短的查询可能返回零结果（如 `"SP Tarkov mods installation"` → 0 条，加上 `"guide"` → 10 条）。这是上游后端行为，不是插件问题。
- 本插件不映射发布日期。
- 引擎名因端点而异（`search-prime` 与 `search_pro`）；是配置项，不做自动推断。
- 调用方取消会映射为 `WEB_ABORTED`，包括自定义取消原因。Coding Plan 搜索整体限时 60 秒，插件卸载时取消进行中的搜索。
- Coding Plan 发送 `search_query`，仅在服务端声明 `count` 时发送数量提示。引擎和时间窗口设置仅适用于 REST。最终结果数量由 web 服务限制。
- 每次搜索独立创建并关闭 MCP 连接，不会自动重试搜索。
- 不实现聊天端的 `web_search` 工具注入方式。

## 开发

```sh
pnpm install     # 全部依赖（包括 DSH seam 包）均来自 npm
pnpm typecheck   # tsc --noEmit
pnpm build       # 产出 Node 代码、声明及 DSH lib/client.js 浏览器包
pnpm test        # REST、本地 MCP 服务、卡片及浏览器包测试
```

常规测试不调用 Z.ai；本地 MCP 测试需要回环监听权限。实时冒烟测试必须同时提供密钥和明确的计费模式，否则自动跳过：

```sh
# 先安全地设置 ZAI_API_KEY。每条命令执行一次实时搜索。
ZAI_LIVE_BILLING_MODE=coding-plan pnpm test:live
ZAI_LIVE_BILLING_MODE=api pnpm test:live  # 消耗 API 余额
```

贡献指南见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 许可证

[MIT](LICENSE)
