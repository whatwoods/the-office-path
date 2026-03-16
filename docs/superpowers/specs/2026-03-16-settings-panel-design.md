# Settings Panel Design Spec

## Overview

为打工之道添加设置面板，支持 AI 模型配置、显示与叙事、游戏性三类设置。通过 Modal 弹窗呈现，主菜单和游戏内均可访问。

## Settings Data Model

```ts
interface Settings {
  ai: {
    provider: 'openai' | 'anthropic' | 'deepseek'
    apiKey: string
    modelOverrides: {
      world?: string
      event?: string
      npc?: string
      narrative?: string
    }
  }
  display: {
    narrativeSpeed: number   // ms/字符, 默认 40, 范围 10-100
    fontSize: 'small' | 'medium' | 'large'
  }
  gameplay: {
    autoSave: boolean        // 默认 true
  }
}
```

默认值：

```ts
const DEFAULT_SETTINGS: Settings = {
  ai: {
    provider: 'openai',
    apiKey: '',
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

## 持久化

- 存储位置：浏览器 LocalStorage，key 为 `the-office-path-settings`
- 格式：JSON 序列化的完整 Settings 对象
- 读写时机：settingsStore 初始化时读取，每次修改立即写入

## 新增文件

### `src/store/settingsStore.ts`

独立的 Zustand store，与 gameStore 解耦。

职责：
- 持有 Settings 状态
- 初始化时从 LocalStorage 读取，merge 到默认值（兼容新增字段）
- 提供 `updateAI()`, `updateDisplay()`, `updateGameplay()` 等 action
- 每次 update 后同步写入 LocalStorage

### `src/components/game/SettingsModal.tsx`

设置弹窗组件，复用现有 `Modal` 组件。

内部结构：

```
SettingsModal
├── Tab 栏: [AI 模型] [显示] [游戏]
├── AI 模型 Tab
│   ├── Provider 下拉选择 (openai / anthropic / deepseek)
│   ├── API Key 输入框 (password 类型, 带显示/隐藏切换)
│   └── Agent 模型覆盖 (4 个可选输入框, 留空用默认)
├── 显示 Tab
│   ├── 叙事速度滑块 (快 ←→ 慢, 10ms-100ms)
│   └── 字体大小选择 (小/中/大)
└── 游戏 Tab
    └── 自动存档开关
```

像素风格与 SaveModal 保持一致，使用项目现有 CSS 变量（`--pixel-bg`, `--pixel-text-bright`, `--pixel-border` 等）和 `pixel-btn`, `pixel-border-light` 等 class。

## 修改文件

### `src/app/page.tsx` — 主菜单加"设置"按钮

在"新游戏"和"读取存档"按钮下方增加一个"设置" PixelButton。点击后打开 SettingsModal。

### `src/components/game/TopStatusBar.tsx` — 游戏内加齿轮按钮

在"存档"按钮旁增加一个齿轮图标按钮（使用 Unicode ⚙ 或 SVG），点击后打开 SettingsModal。showSettingsModal 状态放在 settingsStore 中（因为主菜单也需要控制它）。

### `src/ai/provider.ts` — 支持动态 API Key

改造 `getModel()` 函数签名：

```ts
// 之前
export function getModel(spec: ModelSpec)

// 之后
export function getModel(spec: ModelSpec, dynamicApiKey?: string)
```

逻辑：
- 如果 `dynamicApiKey` 非空，用它创建临时 provider 实例
- 否则回退到 `process.env`（兼容现有 .env 配置）

同时导出一个辅助函数，根据前端传入的 aiConfig 解析出实际要用的 ModelSpec：

```ts
export function resolveAgentModel(
  agent: keyof typeof AGENT_MODELS,
  aiConfig?: { provider?: string; modelOverrides?: Record<string, string> }
): ModelSpec
```

### `src/components/game/NarrativeDisplay.tsx` — 读取叙事速度

将硬编码的 `CHAR_INTERVAL = 40` 改为从 settingsStore 读取 `display.narrativeSpeed`。

### API route handlers (`/api/game/new`, `/api/game/turn`, `/api/game/resign`)

请求 body 新增可选字段 `aiConfig`:

```ts
interface AIConfig {
  provider: 'openai' | 'anthropic' | 'deepseek'
  apiKey: string
  modelOverrides?: Record<string, string>
}
```

route handler 提取 aiConfig 后传递给 orchestration 层，orchestration 再传给 provider.ts。如果 aiConfig 缺失，行为与现在一致（用 .env）。

## AI Key 流转

```
用户在 SettingsModal 填写 API Key
         ↓
settingsStore 存入 LocalStorage
         ↓
前端 fetch 时从 settingsStore 读取, 放入 request body.aiConfig
         ↓
后端 route handler 提取 aiConfig
         ↓
provider.ts getModel(spec, aiConfig.apiKey)
  → 有 apiKey: 创建临时 provider 实例
  → 无 apiKey: 回退到 process.env
```

安全考虑：
- API Key 仅存在浏览器 LocalStorage，通过 HTTPS 传输到同域 Next.js API route
- 后端不持久化 API Key，仅在本次请求中使用
- 单用户本地游戏场景，风险可接受

## 字体大小实现

通过 CSS 变量控制，在根 layout 或 game page 上根据 settingsStore 的 fontSize 设置对应 class：

| fontSize | 正文字号 |
|----------|---------|
| small    | 12px    |
| medium   | 14px (当前默认) |
| large    | 16px    |

影响范围：StoryPanel 内的叙事文本和对话文本。不影响 UI 控件（按钮、状态栏等）。

## 自动存档

当前 gameStore.submitQuarter 中已有 `storageSave(data.state, 'auto')` 逻辑。改为：

```ts
if (settingsStore.getState().settings.gameplay.autoSave) {
  storageSave(data.state, 'auto')
}
```

## 不包含的内容

- 难度系统：不在本次范围内
- 音频设置：项目无音频系统
- 语言切换：项目目前仅中文
- 快捷键配置：暂不需要
