# 打工之道 — 前端 UI 设计文档

## 概述

为"打工之道"游戏构建完整的前端界面，包括游戏主界面三区布局（故事区、仪表盘、行动区）、10 个手机 App、存档管理、Phase 1/2 切换。

**技术选型：** Next.js 16 App Router、React 19、Zustand、Tailwind CSS v4 手写像素风、Vitest + React Testing Library

**设计原则：**
- 单一 Plan 覆盖所有前端 UI
- 纯 Tailwind 手写像素复古风，不用第三方 UI 库
- 手机 App 使用通用框架 + 核心 App 差异化渲染
- 组件单元测试（Vitest + RTL + jsdom）

---

## 一、路由结构

```
/           → LandingPage    — 游戏标题、新游戏、读取存档
/game       → GamePage       — 三区布局主界面
```

仅两个页面。存档管理以 Modal 形式覆盖在当前页面上。不使用更多路由——游戏天然适合单页模式，玩家在一个界面里看故事、查属性、打手机、选行动，不被路由跳转打断。

---

## 二、Zustand 状态管理

单一 `useGameStore`：

```typescript
interface GameStore {
  // 核心状态
  state: GameState | null        // 从 API 返回的完整游戏状态
  isLoading: boolean             // API 请求中
  error: string | null

  // UI 状态（不存档，纯前端）
  activePanel: 'attributes' | 'relationships' | 'phone'
  activePhoneApp: PhoneApp | null
  showSaveModal: boolean
  narrativeQueue: string[]       // 打字机效果的文字队列
  promotionInfo: {               // 从 /api/game/state 获取
    eligible: boolean
    nextLevels: string[]
    failReasons: string[]
  } | null

  // Actions
  newGame: () => Promise<void>           // POST /api/game/new
  submitQuarter: (plan: QuarterPlan) => Promise<void>  // POST /api/game/turn（发送 { state, plan }）
  submitChoice: (choice: CriticalChoice) => Promise<void> // POST /api/game/turn（发送 { state, choice }）
  refreshState: () => Promise<void>      // POST /api/game/state（获取晋升资格等计算字段）
  saveGame: (slot: string) => void       // 纯 LocalStorage，无服务端交互
  loadGame: (slot: string) => void       // 纯 LocalStorage，无服务端交互
}
```

**API 交互说明：**
- 所有 API 请求带 `/api/` 前缀（Next.js App Router 约定）
- API 是无状态的——每次请求需将当前 `state` 发送到服务端（如 `{ state, plan }`）
- `submitQuarter` 成功后自动触发 auto-save 到 `auto` 槽位
- `/api/game/turn` 是 Plan 2 新建的 AI 管线路由（取代旧的 `/api/game/action`）
- `/api/game/state` 返回 `{ computed: { promotionEligible, promotionNextLevels, promotionFailReasons } }`，store 映射为 `promotionInfo`
- 组件只读 store 状态，不直接调用 fetch

**类型扩展说明：**
- `PhoneMessage` 需要扩展 `replyOptions?: string[]` 字段（数据来源于 `NPCAgentOutput.chatMessages`）
- 玩家选中的回复存入 `PhoneMessage` 上新增的 `selectedReply?: string` 字段，下次 AI Agent 调用时作为上下文传递

---

## 三、像素风主题系统

用 Tailwind CSS 变量 + 像素字体实现：

- **像素字体**：引入中文像素字体（Zpix / 丁卯点阵体），用 `next/font/local` 加载 woff2 文件（放 `public/fonts/`），全局设为默认字体
- **调色板**：定义一组复古色 CSS 变量（深色背景、荧光绿/琥珀文字、像素边框色）
- **像素边框**：`box-shadow` 模拟像素风粗边框（`4px solid`，无圆角）
- **像素进度条**：属性值用分段式方块进度条（非平滑渐变）
- **文字样式**：CRT 荧光感，微弱 `text-shadow` 模拟发光

不引入第三方 UI 库，所有组件用 Tailwind 手写。

---

## 四、组件树

### LandingPage

```
LandingPage
├── GameTitle         — 像素风游戏标题 "打工之道"
├── MenuButtons       — 新游戏 / 读取存档 按钮
└── SaveModal         — 读取存档时复用存档弹窗（只读取功能）
```

### GamePage

```
GamePage
├── TopStatusBar              — 游戏标题 | 季度 | 职级 | 金钱 | 存档按钮
├── ErrorBanner               — 错误提示横幅（error 非空时显示）
├── MainArea (flex, 70%/30%)
│   ├── StoryPanel            — 左侧故事区 (70%)
│   │   ├── NarrativeDisplay  — 打字机效果逐字显示叙事
│   │   ├── EventPopup        — 事件弹窗（触发时覆盖在故事区）
│   │   └── QuarterTransition — 季度过渡动画
│   └── DashboardPanel        — 右侧仪表盘 (30%)
│       ├── PanelTabs         — [属性] [关系] [📱] 标签切换
│       ├── AttributesTab     — 像素进度条显示 8 项属性
│       ├── RelationshipsTab  — NPC 列表
│       └── PhoneTab          — 手机面板
│           ├── PhoneAppGrid  — 10个App图标网格
│           └── PhoneAppView  — 当前打开的App内容区
├── ActionBar                 — 底部行动区
│   ├── QuarterlyActions      — 季度模式：行动卡片 + 体力分配
│   ├── CriticalChoices       — 关键期模式：AI生成的情境选择卡片
│   └── SubmitButton          — "结束本季度" / "确认选择"
└── SaveModal                 — 存档管理弹窗（4 槽位）
```

### 布局规则

- **顶部状态栏**：固定高度，像素风横条
- **主区域**：`flex`，左 70% 右 30%，最小宽度 1024px（桌面优先）
- **底部行动区**：固定在视口底部，行动卡片水平排列
- **Phase 切换**：Phase 2 时 `AttributesTab` 多一个"公司"折叠区，`ActionBar` 切换为第二阶段行动集，其余布局不变
- **小屏幕**：视口宽度 < 1024px 时显示全屏提示"请使用电脑访问"，不渲染游戏内容
- **错误提示**：store 的 `error` 状态非空时，在 TopStatusBar 下方显示红色错误横幅，3s 后自动消失或手动关闭

---

## 五、故事区

### NarrativeDisplay

- **打字机效果**：AI 返回的叙事文字逐字显示，每字间隔 30-50ms
- **跳过按钮**：玩家可点击"跳过"立即显示全部文字
- **NPC 对话气泡**：叙事文本中用标记格式标识 NPC 对话：`【NPC:王建国】"台词内容"`。`lib/narrative.ts` 解析此格式，渲染为像素风对话气泡（左侧 NPC 名字标签 + 右侧气泡文本）。非对话段落正常渲染为叙事文字
- **分段显示**：叙事文本按段落分段，每段打完后停顿 300ms 再开始下一段

实现方式：

```
narrativeQueue (Zustand)
  → NarrativeDisplay 组件消费队列
  → useEffect + setInterval 逐字追加到显示区
  → 显示完毕后从队列移除，开始下段
```

不做 streaming（AI 返回完整文本）。打字机效果纯前端模拟。

### QuarterTransition

每季度开始时显示全屏过渡卡片："第 N 季度"，1.5s 后淡出。关键期模式显示："关键期：入职第一周 — 第 X 天"。

### EventPopup

事件触发时（`triggersCritical: true`），在故事区中心弹出事件卡片：标题 + 描述 + 严重程度标签。玩家点击确认后进入关键期。

---

## 六、仪表盘面板

### AttributesTab — 属性面板

- 7 项属性用**像素分段进度条**（10 格方块，每格代表 10 点）：健康、专业、沟通、管理、人脉、心情、声望
- 金钱单独一行，显示具体数字（`¥12,000`），不用进度条
- 数值变化时**闪烁动画**：增加绿色闪、减少红色闪，持续 1s
- **晋升提示**：当 `promotionInfo.eligible` 为 true 时，顶部显示"可晋升"标签 + 可选职级列表；否则灰色显示未满足条件
- Phase 2 底部多"公司"折叠区：阶段、产品质量、团队满意度、客户数、员工数、品牌知名度、营收、支出、现金流、估值、股权比例

### RelationshipsTab — 关系面板

- 活跃 NPC 列表，每行：名字 + 角色 + 好感度进度条 + 当前状态标签
- 好感度颜色分级：≤20 红色、21-50 黄色、51-80 绿色、81+ 金色
- 点击 NPC 行展开详情：性格描述、隐藏目标（好感≥60 才显示 hiddenGoal）
- 底部"历史人物"折叠区，显示 `isActive: false` 的 NPC

### PhoneTab — 手机面板

两层结构：

1. **App 网格**：10 个 App 图标排列成 2×5 网格，每个图标带未读消息红点计数
2. **App 内容视图**：点击图标进入该 App，顶部显示 App 名 + 返回按钮

---

## 七、手机 App 通用框架

### PhoneAppView 容器

每个 App 共享 `PhoneAppView` 容器组件，提供统一的：
- 顶栏（App 名 + 返回按钮）
- 滚动消息列表容器
- 消息卡片基础样式

内部按 `PhoneApp` 类型分发到不同的内容组件。

### 各 App 差异化渲染

| App | 内容组件 | 特色样式 |
|-----|---------|---------|
| 小信 (xiaoxin) | `XiaoxinApp` | 聊天气泡样式，NPC 头像在左，支持 replyOptions 按钮（纯展示型——点击后标记消息已读并高亮选中项，不触发 API 调用。回复内容会作为上下文在下次 AI Agent 调用时传递） |
| 麦麦 (maimai) | `MaimaiApp` | 论坛帖子样式，匿名头像，"热度"标签 |
| 今日条条 (jinritiaotiao) | `JinritiaotiaoApp` | 新闻卡片列表，标题 + 摘要 |
| 支付呗 (zhifubei) | `ZhifubeiApp` | 收支流水列表，收入绿色/支出红色，底部余额 |
| HR直聘 (hrzhipin) | `HrzhipinApp` | 职位卡片，公司名 + 薪资 + 标签 |
| 饱了吗 (baolema) | `GenericMessageApp` | 通用消息流 |
| 花甲找房 (huajiazhaogang) | `GenericMessageApp` | 通用消息流 |
| 天天财富 (tiantian) | `GenericMessageApp` | 通用消息流 |
| 叮叮 (dingding) | `GenericMessageApp` | Phase 2 专属，通用消息流 |
| 画饼通 (huabingtong) | `GenericMessageApp` | Phase 2 专属，通用消息流 |

核心 App（小信、麦麦、今日条条、支付呗、HR直聘）有独立样式组件，其余 5 个共用 `GenericMessageApp`。

---

## 八、行动区

### 季度模式 (QuarterlyActions)

- 横向排列行动卡片，每张显示：行动名（中文）、emoji 图标、体力消耗
- 点击卡片添加到本季度计划，叠加"×N"计数徽章；再次点击减少一次
- 右侧体力条：`已用 / 10` 分段进度条，满 10 时禁用所有卡片
- Phase 1 显示 7 张（work_hard ~ job_interview），resign_startup 为独立按钮（L6+ 才显示）
- Phase 2 显示 7 张（improve_product ~ rest）
- `study` 点击时弹出浮层选择目标能力：专业/沟通/管理（从 `PlayerAttributes` 中可提升的能力字段）
- `socialize` 点击时弹出浮层选择目标 NPC：列出 `npcs.filter(n => n.isActive)` 的名字列表
- 浮层交互：选择目标后确认，将 `{ action, target }` 加入本季度计划

### resign_startup 特殊流程

`resign_startup` 不消耗体力，不走常规体力分配逻辑：
- 按钮样式与行动卡片不同（独立的红色/警示色按钮，位于行动卡片右侧）
- 点击后弹出确认对话框："确定辞职创业？此操作不可逆"
- 确认后调用 `submitChoice`（或专用 API），触发"创业启动"关键期，进入 Phase 2 流程

### 关键期模式 (CriticalChoices)

- 替换整个 ActionBar 内容
- 显示 AI 生成的 3-4 张选择卡片：label、category 标签、staminaCost、effects 预览
- 有风险事件的选项显示橙色 ⚠ 标记 + 概率
- 每天选 1 个 choice，选中后立即提交
- 顶部显示：`关键期第 X / N 天 | 今日体力: X / 3`

### SubmitButton

- 季度模式："结束本季度 ▶"，点击后 loading 状态
- 关键期最后一天选择后自动显示"关键期结束"过渡，恢复季度模式
- 体力未分配完时带确认："还有 N 点体力未使用，确定结束？"

---

## 九、存档管理 (SaveModal)

- **触发**：TopStatusBar 的存档图标按钮；LandingPage 的"读取存档"
- **样式**：Modal 覆盖游戏界面，背景半透明遮罩
- **槽位**：4 个存档卡片（auto、slot1、slot2、slot3）
  - 有数据：显示季度数、职级、金钱、保存时间
  - 空槽位：显示"空"
- **操作**：保存（覆盖确认）、读取（确认后刷新 GameState）、删除
- LandingPage 复用此组件（只显示读取功能）

---

## 十、测试策略

Vitest + React Testing Library + jsdom 环境。

### 测试覆盖

| 模块 | 测试重点 |
|------|---------|
| `useGameStore` | newGame、submitQuarter、submitChoice、save/load |
| `ActionBar` | 体力分配逻辑、卡片交互、phase 切换 |
| `AttributesTab` | 数值正确渲染、Phase 2 公司属性显示 |
| `PhoneTab` | 未读计数、App 切换、消息列表渲染 |
| `NarrativeDisplay` | 文字队列消费、跳过逻辑 |
| `SaveModal` | 槽位读写、空槽位状态 |

### 不测

- 打字机动画的视觉效果
- CSS 像素样式（靠人眼验收）
- 具体 AI 返回内容

### 技术配置

- 新增 `vitest.workspace.ts` 区分 engine 测试（node 环境）和 UI 测试（jsdom 环境），取代现有的单一 `vitest.config.ts`
- 新增依赖：`zustand`、`@testing-library/user-event`、`jsdom`

---

## 十一、新增依赖

| 包 | 用途 |
|----|------|
| `zustand` | 前端状态管理 |
| `@testing-library/user-event` | 测试中模拟用户交互 |
| `jsdom` | UI 测试环境 |

`@testing-library/react` 已在 devDependencies 中。

---

## 十二、文件结构预览

```
src/
  app/
    page.tsx                    — LandingPage（改写现有文件）
    layout.tsx                  — 根布局（加载像素字体）
    globals.css                 — 像素风主题 CSS 变量
    game/
      page.tsx                  — GamePage 入口
  components/
    ui/
      PixelButton.tsx           — 像素风按钮基础组件
      PixelProgressBar.tsx      — 像素分段进度条
      PixelCard.tsx             — 像素风卡片容器
      Modal.tsx                 — 通用 Modal 组件
    game/
      TopStatusBar.tsx          — 顶部状态栏
      ErrorBanner.tsx           — 错误提示横幅
      StoryPanel.tsx            — 故事区容器
      NarrativeDisplay.tsx      — 打字机叙事渲染
      EventPopup.tsx            — 事件弹窗
      QuarterTransition.tsx     — 季度过渡动画
      DashboardPanel.tsx        — 右侧仪表盘容器
      PanelTabs.tsx             — 标签切换
      AttributesTab.tsx         — 属性面板
      CompanyStats.tsx          — Phase 2 公司属性折叠区
      RelationshipsTab.tsx      — 关系面板
      PhoneTab.tsx              — 手机面板入口
      PhoneAppGrid.tsx          — App 图标网格
      PhoneAppView.tsx          — App 内容容器（通用框架）
      phone/
        XiaoxinApp.tsx          — 小信（聊天气泡）
        MaimaiApp.tsx           — 麦麦（论坛帖子）
        JinritiaotiaoApp.tsx    — 今日条条（新闻卡片）
        ZhifubeiApp.tsx         — 支付呗（收支流水）
        HrzhipinApp.tsx         — HR直聘（职位卡片）
        GenericMessageApp.tsx   — 通用消息流（饱了吗等5个App共用）
      ActionBar.tsx             — 行动区容器
      QuarterlyActions.tsx      — 季度行动卡片
      CriticalChoices.tsx       — 关键期选择卡片
      SubmitButton.tsx          — 提交按钮
      SaveModal.tsx             — 存档管理弹窗
  store/
    gameStore.ts                — Zustand store
  lib/
    narrative.ts                — 叙事文本解析工具（分段、NPC对话识别）
public/
  fonts/
    zpix.woff2                  — 像素字体文件
tests/
  components/
    game/
      TopStatusBar.test.tsx
      NarrativeDisplay.test.tsx
      AttributesTab.test.tsx
      RelationshipsTab.test.tsx
      PhoneTab.test.tsx
      QuarterlyActions.test.tsx
      CriticalChoices.test.tsx
      SaveModal.test.tsx
  store/
    gameStore.test.ts
```
