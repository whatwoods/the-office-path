# AI Provider Expansion And Model Picker Design Spec

## Overview

扩展《打工之道》的 AI 设置能力，覆盖三类用户诉求：

- 未配置 API 时，点击首页“新游戏”应直接弹出设置弹窗并阻止进入开局流程
- 设置页需要支持更多服务商，并增加一个“默认模型”配置项
- 模型输入必须始终允许手动填写；如果当前服务商成功返回模型列表，则在输入时提供可搜索候选下拉作为增强能力

这次改动只调整首页开局拦截和设置面板，不对 `/intro` 或 `/game` 页面增加新的强制门禁。

## Goals

- 在不破坏现有 LocalStorage 设置持久化的前提下扩展 AI 配置 schema
- 保持“默认模型优先，agent 单独覆盖可选”的配置体验
- 新增服务商时尽量复用统一的数据结构和 UI 组件
- 把“模型列表拉取失败”降级成非阻塞问题，不影响玩家手动填模型并开始游戏

## Non-Goals

- 不新增服务端模型列表代理
- 不要求每个服务商都必须稳定返回模型列表；拉取失败时允许完全回退到手动输入
- 不新增 `/intro`、`/game` 级别的 API 未配置拦截
- 不做 API Key 连通性测试按钮
- 不在本次中设计新的 AI 编排逻辑或新的 agent 类型

## Confirmed Product Decisions

- 新服务商列表：`硅基流动`、`魔搭`、`阿里云百炼`、`龙猫`、`Gemini`、`自定义`
- 保留现有服务商：`OpenAI`、`Anthropic`、`DeepSeek`
- 新增一个 `默认模型` 字段，四个 agent 默认继承它
- `world / event / npc / narrative` 的单独覆盖能力继续保留
- 模型选择使用“可输入的搜索框”，不是强制下拉
- 点击首页“新游戏”时，如果未设置 API Key，则直接弹设置窗并停止跳转
- `自定义` 服务商使用 OpenAI 兼容 `Base URL`

## Settings Data Model

AI 配置从目前的三服务商结构扩展为统一 provider 枚举，并增加 `baseUrl` 与 `defaultModel`：

```ts
type AIProvider =
  | 'openai'
  | 'anthropic'
  | 'deepseek'
  | 'siliconflow'
  | 'modelscope'
  | 'bailian'
  | 'longcat'
  | 'gemini'
  | 'custom'

interface AISettings {
  provider: AIProvider
  apiKey: string
  baseUrl?: string
  defaultModel?: string
  modelOverrides: {
    world?: string
    event?: string
    npc?: string
    narrative?: string
  }
}

interface Settings {
  ai: AISettings
  display: {
    narrativeSpeed: number
    fontSize: 'small' | 'medium' | 'large'
  }
  gameplay: {
    autoSave: boolean
  }
}
```

默认值：

```ts
const DEFAULT_SETTINGS: Settings = {
  ai: {
    provider: 'openai',
    apiKey: '',
    baseUrl: '',
    defaultModel: '',
    modelOverrides: {},
  },
  display: {
    narrativeSpeed: 40,
    fontSize: 'medium',
  },
  gameplay: {
    autoSave: true,
  },
}
```

### 持久化兼容性

- 继续使用 `localStorage['office_path_settings']`
- 现有 deep-merge 迁移策略保留不变
- 老存档里没有 `baseUrl` 和 `defaultModel` 时，读取后自动回填为空字符串
- `modelOverrides` 结构不变，因此已保存的覆盖模型值继续可用

## Provider Identity And Model Format

所有模型字段继续统一保存为完整规格字符串：

```ts
type ModelSpec = `${AIProvider}:${string}`
```

示例：

- `openai:gpt-4o-mini`
- `deepseek:deepseek-chat`
- `gemini:gemini-2.5-flash`
- `custom:qwen-plus`

这样做的原因：

- 单独覆盖与默认模型可以走同一套解析逻辑
- 切换服务商后，已有值仍能明确表达来源，不会丢失 provider 信息
- 后端 `resolveAgentModel()` 无需猜测模型属于哪个服务商

## Model Resolution Rules

`resolveAgentModel(agent, aiConfig)` 的优先级改为：

1. `aiConfig.modelOverrides[agent]`
2. `aiConfig.defaultModel`
3. `DEFAULT_MODELS_BY_PROVIDER[aiConfig.provider][agent]`
4. `AGENT_MODELS[agent]`（仅在 `aiConfig` 缺失时使用，兼容现有 `.env` 配置）

语义解释：

- `默认模型` 是所有 agent 的统一默认值
- `modelOverrides` 是可选的精细化偏离
- 如果玩家只选了服务商和 API Key，系统仍可落回每个 provider 的内置默认模型

## Provider Runtime Strategy

运行时 provider 分为两类：

### 1. 专有 SDK provider

- `anthropic`：继续使用 `@ai-sdk/anthropic`
- `gemini`：增加 Google/Gemini 对应的 provider 接入

### 2. OpenAI-compatible provider

统一复用 `createOpenAI({ apiKey, baseURL, name })`：

- `openai`
- `deepseek`
- `siliconflow`
- `modelscope`
- `bailian`
- `longcat`
- `custom`

这类 provider 通过 provider catalog 提供默认 `baseURL` 与展示名称。`custom` 的 `baseURL` 来自用户输入，其他服务商使用内置默认值。

## Provider Catalog

新增一个前后端共用的 provider catalog 模块，职责：

- 定义 provider label、默认 `baseURL`、运行时类别、模型列表拉取方式
- 让设置页、settings store、provider runtime 解析都依赖同一份 provider 元数据

建议结构：

```ts
interface ProviderCatalogEntry {
  id: AIProvider
  label: string
  runtime: 'openai-compatible' | 'anthropic' | 'gemini'
  defaultBaseUrl?: string
  modelListMode: 'openai-compatible' | 'gemini' | 'manual'
}
```

建议策略：

- `openai` / `deepseek` / `siliconflow` / `modelscope` / `bailian` / `longcat` / `custom`
  - `modelListMode = 'openai-compatible'`
- `gemini`
  - `modelListMode = 'gemini'`
- `anthropic`
  - `modelListMode = 'manual'`

这里把 `anthropic` 标记为 `manual` 的目的是避免为了“必须展示列表”强行引入脆弱的浏览器请求方案。对玩家来说，Anthropic 的体验仍然是“可直接手填”，不会阻塞开玩。

## Frontend Model List Fetching

模型列表由前端直接请求，不新增服务端代理。

### 拉取时机

- 模型输入框首次 `focus` 时触发
- 前提条件：
  - 当前 provider 已确定
  - `apiKey` 非空
  - 如果 provider 为 `custom`，则 `baseUrl` 非空

### 拉取方式

- `openai-compatible`
  - 对 `{baseURL}/models` 发起请求
  - 使用 `Authorization: Bearer <apiKey>`
  - 解析统一的 `{ data: [{ id: string }] }` 结构
- `gemini`
  - 请求 Google/Gemini 的模型列表接口
  - 将返回结果映射为统一的 `[{ id, label }]`
- `manual`
  - 不自动发请求，直接走手动输入模式

### 缓存策略

模型列表只做页面级内存缓存，不写入 LocalStorage。缓存 key 建议为：

```ts
`${provider}|${apiKey}|${baseUrl}`
```

这样可以避免：

- 同一页面里频繁重复请求
- 切换 Key 或切换自定义 `baseURL` 时复用旧结果

### 失败回退

以下情况统一视为“模型列表不可用”：

- 网络异常
- 超时
- CORS 失败
- 401 / 403 / 404
- 返回结构与预期不匹配
- 列表为空

失败后的统一行为：

- 输入框仍然可编辑
- 允许保存设置
- 不阻止点击“新游戏”
- UI 只提示：`未获取到模型列表，可手动输入`

## Searchable Model Input UX

`默认模型` 与四个 agent 覆盖项都使用同一个“可输入搜索框”组件。

### 组件行为

- 输入框始终允许自由输入
- 成功加载模型列表后：
  - 根据当前输入做前端模糊过滤
  - 显示候选浮层
  - 点击候选后写入完整 `ModelSpec`
- 列表不可用时：
  - 不显示候选浮层
  - 输入框照常保存手填值

### 模糊搜索规则

- 以 `model.id` 为主进行大小写不敏感匹配
- 同时支持包含匹配，不要求前缀完全一致
- 由于 provider 已在当前上下文确定，候选展示可只显示模型 ID，但写入值时必须自动补全 provider 前缀

示例：

- 当前 provider = `siliconflow`
- 用户输入 `deepseek`
- 候选可展示 `deepseek-ai/DeepSeek-V3`
- 选中后保存值为 `siliconflow:deepseek-ai/DeepSeek-V3`

### 状态文案

- 未满足拉取条件：`填写 API Key 后可尝试获取模型列表`
- 拉取中：`正在获取模型列表...`
- 拉取失败：`未获取到模型列表，可手动输入`
- 拉取成功但无匹配：`无匹配模型，继续输入可手动保存`

## Settings Modal Layout

AI Tab 的结构调整为：

```text
AI 模型
├── AI 服务商
├── API Key
├── Base URL（仅 custom 显示）
├── 默认模型（可输入搜索框）
└── 高级设置（默认折叠）
    ├── world 覆盖模型（可输入搜索框）
    ├── event 覆盖模型（可输入搜索框）
    ├── npc 覆盖模型（可输入搜索框）
    └── narrative 覆盖模型（可输入搜索框）
```

设计原则：

- 首屏优先满足“先填 key、选默认模型、开始游戏”的主路径
- 把四个覆盖项收进高级设置，降低第一次配置时的信息密度
- 所有模型位复用同一种交互，避免一个下拉、一个文本框的混搭感

## New Game Gating

本次只改首页“新游戏”按钮的行为。

### Landing Page 行为

- 页面初始化仍继续执行 `loadSettings()`
- 点击“新游戏”时：
  - 若 `settings.ai.apiKey.trim()` 为空，`showSettings = true`，并停止 `router.push('/intro')`
  - 若存在 API Key，则正常跳转 `/intro`

### 明确不做的拦截

- 不在 `/intro` 页面自动弹设置
- 不在 `/game` 页面自动弹设置
- 不阻止玩家读取旧存档

这与确认过的产品决策保持一致：拦截发生在“开始新游戏”的入口，而不是整个站点的全局门禁。

## Settings Store Changes

`settingsStore` 需要扩展以下能力：

- `settings.ai.baseUrl`
- `settings.ai.defaultModel`
- `getAIConfig()` 返回 `baseUrl` 和 `defaultModel`
- `updateAI()` 继续保持浅合并 + `modelOverrides` 深一层合并

`getAIConfig()` 的拦截条件维持简单：

- 仅在 `apiKey` 为空时返回 `null`
- `custom` 的 `baseUrl` 是否为空，不在这里直接判错；由 UI 和实际调用阶段分别处理

这样可以保持 store 的职责简单，避免把“配置完整性校验”塞进全局状态层。

## AI Runtime Changes

`provider.ts` 需要扩展两部分：

### 1. Provider union 与默认模型映射

- 扩大 `ModelSpec` 的 provider 前缀
- 为新增 provider 增加默认模型映射

### 2. 动态 provider 创建

- 对 `openai-compatible` provider：用动态 `apiKey` 和 catalog `baseURL` 创建 provider
- 对 `custom`：用 `aiConfig.baseUrl` 创建 provider
- 对 `anthropic` / `gemini`：使用各自 provider factory

### 3. `resolveAgentModel()` 使用新优先级

- override
- defaultModel
- provider built-in default
- env fallback

## Files To Introduce Or Modify

### 新增

- `docs/superpowers/specs/2026-03-17-ai-provider-model-picker-design.md`
- 一个 provider catalog 模块（例如 `src/ai/providerCatalog.ts`）
- 一个可复用的模型输入组件（例如 `src/components/game/ModelSearchInput.tsx`）

### 修改

- `src/types/settings.ts`
- `src/store/settingsStore.ts`
- `src/components/game/SettingsModal.tsx`
- `src/app/page.tsx`
- `src/ai/provider.ts`
- 相关测试文件：
  - `tests/store/settingsStore.test.ts`
  - `tests/components/game/SettingsModal.test.tsx`
  - `tests/ai/provider.test.ts`
  - `tests/app/page.test.tsx`

## Error Handling

需要明确覆盖的错误路径：

- 用户未填 API Key 点“新游戏”
  - 结果：打开设置，不跳转
- 用户选择 `custom` 但未填 `Base URL`
  - 结果：模型列表不拉取，只显示可手填状态
- 某个 provider 拉模型列表失败
  - 结果：仅显示轻提示，不清空当前模型值
- 用户切换 provider 后再切回来
  - 结果：已保存值保留；新的列表缓存按当前 provider 重新计算
- 用户手填了不存在的模型名
  - 结果：允许保存；真正调用失败时沿用现有错误提示链路

## Testing Strategy

### Store

- 扩展后的默认值与 LocalStorage deep-merge 兼容
- `baseUrl`、`defaultModel` 能正常持久化
- `getAIConfig()` 返回新增字段

### Provider runtime

- `resolveAgentModel()` 正确体现 `override > defaultModel > provider default`
- `custom` provider 能使用 `baseUrl`
- 新 provider 前缀能被 `getModel()` 接受

### SettingsModal

- 服务商下拉显示所有 provider
- 选择 `custom` 后显示 `Base URL`
- 默认模型输入存在
- 高级设置默认折叠，可展开看到四个覆盖项
- 模型输入在“有列表 / 无列表 / 拉取失败”三种状态下行为正确

### LandingPage

- 未设置 API Key 时点击“新游戏”会打开设置，不跳转
- 已设置 API Key 时点击“新游戏”会正常跳转 `/intro`

## Risks And Trade-Offs

- 前端直连第三方模型列表接口可能遇到 CORS 或浏览器兼容问题
  - 已接受的 trade-off：失败直接回退手填，不再引入服务端代理复杂度
- 新增 provider 后，运行时调用方式不再全是单一 SDK
  - 解决方式：通过 provider catalog 显式区分 `openai-compatible`、`anthropic`、`gemini`
- `ModelSpec` 继续保留 provider 前缀，用户手填时更长
  - 解决方式：UI 组件在当前 provider 上下文内自动补前缀，用户不需要手敲完整 `provider:`

## Out Of Scope

- 为每个 provider 设计独立的连接测试页
- 在服务端缓存模型列表
- 把模型列表保存进 LocalStorage
- 新增“读取存档前也必须先配置 API”的限制
- 调整显示设置和自动存档逻辑以外的其他设置页结构
