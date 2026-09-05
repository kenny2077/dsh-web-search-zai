/**
 * Bilingual (EN / ZH) locale dictionaries for the settings card.
 *
 * Keys are shared between both languages and typed as {@link MessageKey}.
 * The dictionaries are registered under the `settings.plugins.zai` namespace
 * so the DSH locale service selects the active language at runtime.
 *
 * @module dsh-web-search-zai/client/locales
 */

export const en = {
  title: 'Web Search (Z.ai)',
  description: 'Use your Z.ai key for web search. Changes apply to the next search.',
  billingMode: 'Billing mode',
  codingPlan: 'Coding Plan — subscription MCP quota',
  api: 'API — API balance',
  billingHint: 'Search never switches to paid API automatically.',
  codingHint: 'Requires an eligible subscription. Search uses plan quota even without chat inference. Points are not model tokens.',
  apiHint: 'Uses the standalone REST API. Upgrading from 0.1.0? Save this mode to keep API billing.',
  activeMode: 'Saved mode',
  apiKey: 'API key',
  keyHint: 'Leave blank to keep the current key. Replacing this shared key also affects chat.',
  configured: 'Configured',
  missing: 'Not configured',
  literalKey: 'A literal apiKey in your configuration overrides the managed key. Remove that literal to manage the key here.',
  getKey: 'Manage Z.ai API keys ↗',
  zhipuGuide: 'Zhipu Coding Plan setup ↗',
  advanced: 'Advanced settings',
  apiKeyEnv: 'Credential reference',
  refHint: 'Default: ZAI_API_KEY. Save a changed reference before entering its key.',
  mcpURL: 'Coding Plan MCP endpoint',
  endpointHint: 'Choose the service that issued your key, then Save. The endpoint is not chosen from your language or location.',
  useZai: 'Use Z.ai (international)',
  useZhipu: 'Use Zhipu (China)',
  baseURL: 'REST API base URL',
  baseHint: 'An inherited endpoint may come from configuration or ZAI_SEARCH_BASE_URL.',
  searchEngine: 'API search engine',
  searchRecency: 'API recency filter',
  inherited: 'Inherited / default',
  day: 'Past day', week: 'Past week', month: 'Past month', year: 'Past year',
  save: 'Save', saving: 'Saving…', reset: 'Reset search settings', discard: 'Discard edits',
  storage: 'The key is stored by DSH credentials. Other fields use DSH settings. Reset restores inherited search settings and keeps your shared key.',
  unavailable: 'Settings are loading, unavailable, or read-only in this connection.',
  stale: 'Settings changed while you were editing. Discard edits and try again.',
  saved: 'Saved.', settingsFailed: 'Search settings were not saved. Review the current values and retry.',
  keyFailed: 'The key was not saved. Check credential storage access and retry.',
  partialSave: 'Search settings were saved, but the key was not saved. Re-enter the key and save again.',
  resetDone: 'Search overrides cleared. Your shared key was kept.',
  invalid: 'Check the endpoint, credential reference, or selected value.',
}
export type MessageKey = keyof typeof en
export const zh: Record<MessageKey, string> = {
  title: '网页搜索（Z.ai）',
  description: '使用 Z.ai 密钥进行网页搜索。更改将在下一次搜索时生效。',
  billingMode: '计费模式', codingPlan: 'Coding Plan — 套餐 MCP 额度', api: 'API — API 账户余额',
  billingHint: '搜索不会自动切换到付费 API。', activeMode: '已保存的模式',
  codingHint: '需要符合条件的订阅。即使没有聊天推理请求，搜索也会消耗套餐额度。积分不是模型 token。',
  apiHint: '使用独立 REST API。从 0.1.0 升级？请选择并保存此模式以保留 API 计费。',
  apiKey: 'API 密钥', keyHint: '留空保留当前密钥。替换此共享密钥也会影响聊天。',
  configured: '已配置', missing: '未配置',
  literalKey: '配置中的 apiKey 明文值优先于凭据服务中的密钥。请移除该明文值后在此管理密钥。',
  getKey: '管理 Z.ai API 密钥 ↗', advanced: '高级设置', apiKeyEnv: '凭据引用名称',
  zhipuGuide: '智谱 Coding Plan 配置说明 ↗',
  refHint: '默认：ZAI_API_KEY。更改引用名称后，请先保存，再输入对应密钥。',
  mcpURL: 'Coding Plan MCP 地址', baseURL: 'REST API 基础地址',
  endpointHint: '请选择签发密钥的平台，然后保存。插件不会根据界面语言或所在地自动选择地址。',
  useZai: '使用 Z.ai（国际）', useZhipu: '使用智谱（中国）',
  baseHint: '继承的地址可能来自配置或 ZAI_SEARCH_BASE_URL。',
  searchEngine: 'API 搜索引擎', searchRecency: 'API 时间范围', inherited: '继承 / 默认',
  day: '最近一天', week: '最近一周', month: '最近一个月', year: '最近一年',
  save: '保存', saving: '保存中…', reset: '重置搜索设置', discard: '放弃更改',
  storage: '密钥由 DSH 凭据服务保存，其他字段使用 DSH 设置。重置会恢复继承的搜索设置，并保留共享密钥。',
  unavailable: '设置正在加载、不可用，或当前连接仅允许读取。',
  stale: '编辑期间设置已更改。请放弃更改后重试。', saved: '已保存。',
  settingsFailed: '搜索设置未保存。请检查当前值后重试。', keyFailed: '密钥未保存。请检查凭据存储权限后重试。',
  partialSave: '搜索设置已保存，但密钥未保存。请重新输入密钥并再次保存。',
  resetDone: '已清除搜索覆盖值，保留了共享密钥。', invalid: '请检查地址、凭据引用名称或所选值。',
}
