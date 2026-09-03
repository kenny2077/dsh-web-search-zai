# DeepSeek Harness 网页搜索（Z.ai）

在 DeepSeek Harness 中使用 **Z.ai 或智谱**联网搜索，提供原生中英文设置卡片。明确选择 **Coding Plan MCP 套餐额度**或 **REST API 余额**；已有的 `ZAI_API_KEY` 若适用于所选服务，可直接复用。

[![CI](https://github.com/kenny2077/dsh-web-search-zai/actions/workflows/ci.yml/badge.svg)](https://github.com/kenny2077/dsh-web-search-zai/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/dsh-web-search-zai)](https://www.npmjs.com/package/dsh-web-search-zai)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[English](README.md) | 中文 · 已收录于 [Awesome DSH Plugins](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/data/plugins/kenny2077__dsh-web-search-zai.yml)

> **0.2.0 发布准备中：** GUI 和 Coding Plan 支持已在 GitHub 提供。npm 当前仍为 **0.1.0（仅 REST）**，上方 npm 徽章显示已发布版本。要在 npm 发布前测试升级，请使用下方 GitHub 安装命令。
>
> **已有用户：** 默认模式从 REST 改为 Coding Plan。要保留原来的 API 计费方式，请在升级后的第一次搜索前选择并保存 **API — API 账户余额**。详见[从 0.1.0 升级](#从-010-升级)。

## 0.2 带来的变化

- **两种计费模式。** 默认使用 Coding Plan；API 模式保留原有 REST 请求、引擎和时间范围选项。不会自动回退到付费 API。
- **原生设置卡片。** 在设置 → 网页搜索（Z.ai）中选择模式、管理密钥、选择 Z.ai 或智谱 MCP 地址。更改在下一次搜索时生效。
- **保持 DSH 接口。** 提供方 ID `zai`、设置命名空间 `web-search-zai` 和模型使用的搜索工具均保持不变。
- **密钥由凭据服务管理。** 密码框留空保留共享密钥；重置只清除搜索设置覆盖值，不删除密钥。

| 模式 | 消耗 | 适用情况 |
| --- | --- | --- |
| **Coding Plan**（`coding-plan`，默认） | 套餐 MCP 额度 | 密钥具有符合条件的 Coding Plan 订阅 |
| **API**（`api`） | 单独计费的 API 余额 | 使用 REST 搜索，或保留 0.1.0 的配置 |

即使没有聊天推理请求，搜索仍可能消耗额度。我们的智谱测试观察到一次搜索消耗 **1 积分**。积分不是模型 token；这个观察结果不代表固定费率或额度承诺。请以当前 [Z.ai 搜索文档](https://docs.z.ai/devpack/mcp/search-mcp-server)、[Z.ai 使用政策](https://docs.z.ai/devpack/usage-policy)及[智谱搜索文档](https://docs.bigmodel.cn/cn/coding-plan/mcp/search-mcp-server)为准。这是社区插件，社区目录收录不代表 DSH 或 Z.ai 官方背书。

## 安装与配置

需要 DeepSeek Harness 的 `dsh` CLI 和 Web 设置服务，以及 **Node 22.19+（22 系列）或 Node 24+**。请使用所选平台的原生密钥；不支持第三方聊天网关密钥。

将 GitHub 版本安装到 **web** 配置环境：

```sh
dsh plugin --profile web add github:kenny2077/dsh-web-search-zai
dsh web
```

仓库包含预构建 JavaScript，包管理器负责安装运行依赖，无需允许插件构建脚本。如果从 DSH 源码仓库运行，请在该仓库中将 `dsh` 替换为 `pnpm dsh`。

安装 npm 已发布版本（当前为 0.1.0，仅支持 REST）：

```sh
dsh plugin --profile web add dsh-web-search-zai@latest
```

打开 **设置 → 网页搜索（Z.ai）**：

1. 选择 **Coding Plan — 套餐 MCP 额度**或 **API — API 账户余额**。
2. 如果 DSH 已保存正确的 `ZAI_API_KEY`，密码框留空；否则输入密钥。替换共享密钥也会影响使用该凭据的聊天。
3. **智谱国内 Coding Plan** 密钥：展开**高级设置**，点击**使用智谱（中国）**并保存。默认地址为 Z.ai 国际平台；密钥格式和界面语言不会自动决定地址。
4. 保存后，让 DSH 执行一次搜索。卡片显示的是**已保存的模式**，可能与尚未保存的选项不同。

### 安装本地源码目录

本地路径安装会链接到源码目录。注册前先安装插件依赖；每次拉取升级后，再运行一次 `pnpm install --frozen-lockfile`：

```sh
git clone https://github.com/kenny2077/dsh-web-search-zai.git
cd dsh-web-search-zai
pnpm install --frozen-lockfile
dsh plugin --profile web add .
dsh web
```

如果从 DSH 源码运行，先安装插件依赖，再到 DSH 仓库执行 `pnpm dsh plugin --profile web add <插件绝对路径>`。

## 从 0.1.0 升级

密钥、凭据引用名称、REST 地址、引擎和时间范围设置的含义保持不变。**省略 `billingMode` 现在会选择 Coding Plan**，包括 0.1.0 创建的配置。插件不会猜测订阅状态或自动替你迁移计费选择。

### 保留 REST API 计费

升级后，在卡片中选择 **API — API 账户余额**，并在**搜索前保存**。使用文件配置时，停止 DSH，将以下字段合并到 `$DSH_HOME/settings.yaml` 中现有的命名空间：

```yaml
web-search-zai:
  billingMode: api
  # 保留已有的 apiKeyEnv、baseURL、searchEngine 和 searchRecency。
```

只合并该字段，不要覆盖整个设置文件。已有的 REST `baseURL` 或 `ZAI_SEARCH_BASE_URL` 不会自动选择 API 模式。

### 使用 Coding Plan

保存 **Coding Plan**，并选择与密钥签发平台对应的地址：

| 平台 | `mcpURL` |
| --- | --- |
| Z.ai 国际平台（默认） | `https://api.z.ai/api/mcp/web_search_prime/mcp` |
| 智谱国内平台 | `https://open.bigmodel.cn/api/mcp/web_search_prime/mcp` |

智谱示例：

```yaml
web-search-zai:
  billingMode: coding-plan
  mcpURL: https://open.bigmodel.cn/api/mcp/web_search_prime/mcp
  apiKeyEnv: ZAI_API_KEY
```

套餐额度耗尽或不符合条件时返回错误；只有用户主动选择 API 模式，才会使用 API 余额。

### 更新安装

停止 DSH，按安装来源执行更新，再重启 DSH 并刷新浏览器页面：

| 安装来源 | 更新方式 |
| --- | --- |
| npm | **0.2.0 发布后：** `dsh plugin --profile web update dsh-web-search-zai --latest` |
| GitHub | `dsh plugin --profile web update dsh-web-search-zai --latest` |
| 本地目录 | 在插件源码目录运行 `git pull --ff-only`，再运行 `pnpm install --frozen-lockfile` |

从 npm 切换到 GitHub 测试版，执行上方 GitHub 安装命令即可。回退到旧版可执行 `dsh plugin --profile web add dsh-web-search-zai@0.1.0` 并重启；该版本始终使用 REST。共享密钥仍保存在 DSH 中。

## 设置参考

| 字段 | 默认值 | 用途 |
| --- | --- | --- |
| `billingMode` | `coding-plan` | `coding-plan` 或 `api` |
| `mcpURL` | 上方 Z.ai 国际地址 | 完整 MCP 地址，仅 Coding Plan 使用 |
| `apiKeyEnv` | `ZAI_API_KEY` | 每次搜索解析的 DSH 凭据引用 |
| `apiKey` | 未设置 | 可选明文密钥，优先于凭据服务中的密钥 |
| `baseURL` | `https://api.z.ai/api/paas/v4` | 仅 REST 使用，追加 `/web_search` |
| `searchEngine` | `search-prime` | 仅 REST 使用；智谱使用 `search_pro` |
| `searchRecency` | 未设置 | 仅 REST 使用；`day`、`week`、`month` 或 `year` |

智谱 REST 使用 `baseURL: https://open.bigmodel.cn/api/paas/v4` 和 `searchEngine: search_pro`。MCP 使用独立的完整地址，不使用聊天地址或 REST 基础地址。

卡片通过 DSH 设置保存非密钥字段，仅通过 DSH 凭据服务写入密钥，不会将已保存的密钥读入浏览器。配置中的明文 `apiKey` 优先于凭据服务；卡片会提示该覆盖值，并禁用密钥编辑，直到移除明文配置。未挂载凭据服务时，提供方从启动环境读取指定凭据引用。

**保存**仅写入编辑过的字段，并检查设置版本。如果编辑期间设置发生变化，请放弃旧的编辑再重试。设置保存成功而密钥失败时，会单独报告；重新输入密钥即可重试。更改凭据引用名称后，请先保存，再输入对应密钥。

**重置搜索设置**仅清除卡片管理的非密钥用户覆盖值，恢复继承设置；没有组合配置覆盖时，模式恢复为默认 Coding Plan。共享密钥不变。主机设置或凭据服务不可用、只读时，相应控件会禁用。

## 常见问题

| 现象 | 检查方法 |
| --- | --- |
| `Cannot find package '@modelcontextprotocol/sdk'` | 本地链接安装时，在**插件源码目录**执行 `pnpm install --frozen-lockfile`，再重启 DSH。`git pull` 不会安装新依赖。 |
| 升级后搜索失败 | 检查**已保存的模式**。原 REST 用户需要明确选择 `api`。 |
| 认证或额度错误 | 检查密钥与 Z.ai／智谱地址是否匹配，以及所选模式的套餐额度或 API 余额。“已配置”只代表存在密钥，不代表认证成功。 |
| 没有新卡片 | 确认安装到 `web` 环境，重启 DSH 并刷新浏览器。npm 0.1.0 没有此卡片。 |
| 设置只读 | 使用支持可写设置与凭据的 DSH 主机连接；仍可使用文件配置。 |
| 结果少于请求数量 | 缺少 URL 或非空摘要的条目会被丢弃；最终数量由 DSH web 服务限制。 |

## DSH 集成方式

```text
DSH 模型 → web_search 工具 → ctx.web → zai 提供方
                                       ├─ coding-plan → MCP 搜索 → 套餐额度
                                       └─ api → REST /web_search → API 余额
                                                     ↓
                                          来源链接、标题和摘要
```

插件注册到已有的 `ctx.web` 服务并返回来源，由聊天模型决定如何使用这些来源生成答案。插件不编造发布日期或生成答案，也不会启用模型提供方另行提供的聊天侧 `web_search` 选项。

MCP 每次搜索创建独立连接，结束后关闭。Coding Plan 操作整体限时 60 秒，支持调用方取消，并在插件卸载时取消。HTTP 重定向会被拒绝；搜索不会自动重试。错误保留 DSH 标准码：`WEB_PROVIDER_ERROR`、`WEB_PROVIDER_CREDENTIAL_MISSING`、`WEB_ABORTED`。

## 验证与开发

自动测试覆盖 REST 回归、本地 MCP JSON/SSE 服务、认证请求头、工具发现、额度错误、异常和双重编码响应、取消、超时、设置冲突、部分保存及浏览器包。CI 在 Windows 和 Ubuntu 上运行 Node 22、24 测试。

实时验证单独记录：智谱 Coding Plan 已通过直接调用和 DSH 注册后的 `ctx.web` 返回真实结果。维护者也在 Windows 的 DSH 中验证了插件，并在此前测试过 REST 模式。这些结果不保证其他账户或地址的额度可用性。

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build
pnpm test
```

常规测试使用本地服务，不消耗搜索额度。实时测试需要 `ZAI_API_KEY` 和明确的 `ZAI_LIVE_BILLING_MODE`（`coding-plan` 或 `api`）；智谱请额外设置 `ZAI_SEARCH_MCP_URL`。每次运行 `pnpm test:live` 执行一次搜索。完整命令及发布检查见 [CONTRIBUTING.md](CONTRIBUTING.md)，变更见 [CHANGELOG.md](CHANGELOG.md)。

## 许可证

[MIT](LICENSE)
