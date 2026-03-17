# API 连通性测试设计

## 概述

为游戏增加 AI API 连通性测试功能，让用户在配置 API Key 后能立即验证连接是否正常，并在游戏开始前自动检测，避免进入游戏后才发现 API 不可用。

## 方案

采用服务端轻量 ping 方案：通过 Next.js API Route 在服务端调用 `generateText` 发送极短请求（`prompt: "hi"`, `maxTokens: 1`），验证 API Key 有效性、网络可达性和模型可调用性。

## 组件设计

### 1. API Route — `POST /api/ai/ping`

**文件：** `src/app/api/ai/ping/route.ts`

**请求体：**

```typescript
interface PingRequest {
  provider: AIProvider
  apiKey: string
  baseUrl?: string   // custom provider 必填，其他可选
  model?: string     // 可选，未指定则取 provider 默认模型
}
```

**逻辑：**

1. 解析并校验请求参数（provider、apiKey 必填）
2. 确定测试用模型：优先用 `model` 参数，否则取 `PROVIDER_CATALOG[provider].defaultModels.world`
3. 构造 `ModelSpec`（`provider:modelId` 格式），调用 `getModel(spec, apiKey, baseUrl)` 创建模型实例
4. 记录起始时间，调用 `generateText({ model, prompt: "hi", maxTokens: 1 })`
5. 计算延迟

**成功响应 (200)：**

```json
{ "success": true, "model": "openai:gpt-4o-mini", "latencyMs": 342 }
```

**失败响应 (200)：**

```json
{ "success": false, "error": "Invalid API key" }
```

注意：业务错误仍返回 200 状态码，`success: false` 表示失败。仅在请求格式错误时返回 400。

### 2. 客户端 Hook — `useApiPing`

**文件：** `src/lib/useApiPing.ts`

**接口：**

```typescript
type PingStatus = 'idle' | 'testing' | 'success' | 'error'

interface UseApiPingReturn {
  ping: () => Promise<void>
  status: PingStatus
  error: string | null
  latencyMs: number | null
}
```

**实现：**

- 使用 `useState` 管理 `status`、`error`、`latencyMs`
- `ping()` 从 `useSettingsStore` 读取当前 AI 配置，POST 到 `/api/ai/ping`
- 调用前重置状态为 `testing`
- 调用成功后根据 `response.success` 设置 `success` 或 `error`
- fetch 本身失败（网络错误）也设置为 `error`

### 3. 设置页面集成

**修改文件：** `src/components/game/SettingsModal.tsx` 的 `AITab` 组件

在 API Key 输入行下方添加「测试连接」按钮和状态反馈：

- **按钮状态：**
  - `idle`：显示「测试连接」
  - `testing`：显示「测试中...」，按钮禁用
  - `success`：显示绿色文本「连接成功 (XXms)」
  - `error`：显示红色文本 + 错误信息

- **触发条件：** API Key 非空时按钮可用

- **样式：** 使用现有 `pixel-btn` 样式，状态文本使用 `text-xs`

### 4. 游戏开始前自动检测

**修改位置：** 创建新游戏的调用处（游戏页面或 intro 流程中调用 `/api/game/new` 之前）

**逻辑：**

1. 在发起 `/api/game/new` 请求之前，先调用 `/api/ai/ping`
2. 成功：继续创建游戏
3. 失败：显示警告弹窗，内容为错误信息 + 两个按钮「仍然继续」和「去设置」
   - 「仍然继续」：忽略警告，继续创建游戏
   - 「去设置」：打开设置弹窗

## 错误信息处理

将常见的 AI SDK 错误映射为用户友好的中文提示：

| 原始错误 | 用户提示 |
|----------|---------|
| 401 / Invalid API key | API Key 无效，请检查后重试 |
| 403 / Forbidden | API Key 无此模型的访问权限 |
| 404 / Model not found | 模型不存在，请检查模型名称 |
| 429 / Rate limit | 请求频率超限，请稍后重试 |
| Network error / ECONNREFUSED | 无法连接到 AI 服务，请检查网络 |
| 其他 | 连接失败：{原始错误信息} |

## 测试计划

### 单元测试

- `tests/app/api/ai/ping.test.ts`：测试 API route 的参数校验、成功/失败路径、默认模型回退逻辑
- `tests/lib/useApiPing.test.ts`：测试 hook 状态流转（idle → testing → success/error）

### 组件测试

- `tests/components/game/SettingsModal.test.tsx`：测试「测试连接」按钮的渲染、点击交互、状态显示

## 文件变更清单

| 操作 | 文件 |
|------|------|
| 新建 | `src/app/api/ai/ping/route.ts` |
| 新建 | `src/lib/useApiPing.ts` |
| 修改 | `src/components/game/SettingsModal.tsx` |
| 修改 | 游戏创建流程相关组件（需确认具体位置） |
| 新建 | `tests/app/api/ai/ping.test.ts` |
| 新建 | `tests/lib/useApiPing.test.ts` |
