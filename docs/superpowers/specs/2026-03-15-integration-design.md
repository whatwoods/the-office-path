# 打工之道 — 集成设计文档

## 概述

将 Plan 1（游戏引擎）、Plan 2（AI Agent 管线）、Plan 3（前端 UI）三大系统端到端打通。修复数据流断层、引擎 Bug、API 响应格式，并添加集成测试。

**技术范围：** Store 增强、UI 联动、API 修复、引擎修复、集成测试

**不做：** 不新增 UI 组件（Plan 3 已全覆盖），不改 AI Agent 内部逻辑，不改游戏规则

---

## 一、Store 增强

### 新增字段

```typescript
interface GameStore {
  // 已有字段保持不变...

  // 新增：关键期选择（AI 生成）
  criticalChoices: CriticalChoice[]

  // 新增：最近事件（用于 EventPopup）
  currentEvent: GameEvent | null

  // 新增：季度过渡（用于 QuarterTransition）
  showQuarterTransition: boolean

  // 新增：绩效结果（季度结束时显示）
  lastPerformance: {
    rating: string
    salaryChange: number
  } | null
}
```

### submitQuarter 增强

当前：只读 `data.state` 和 `data.narrative`。

改为：
1. 设置 `showQuarterTransition: true`（触发过渡动画）
2. 将 `data.narrative` 加入 `narrativeQueue`
3. 如果 `data.performanceRating` 非 null，存入 `lastPerformance`
4. 如果 `data.events` 中有 `triggersCritical: true` 的事件，存入 `currentEvent`
5. 自动调用 `refreshState()`（获取晋升资格）
6. Auto-save 到 `auto` 槽位

### submitChoice 增强

当前：只读 `data.state` 和 `data.narrative`。

改为：
1. 将 `data.narrative` 加入 `narrativeQueue`
2. 将 `data.nextChoices`（如有）存入 `criticalChoices`
3. 如果 `data.isComplete === true`，清空 `criticalChoices`，设 `showQuarterTransition: true`（关键期结束过渡）

### 新增 Actions

```typescript
dismissQuarterTransition: () => void   // 过渡动画结束后调用
dismissEvent: () => void               // 事件弹窗确认后调用
dismissPerformance: () => void         // 绩效弹窗关闭后调用
```

---

## 二、UI 联动

### GamePage 联动

- 渲染 `QuarterTransition`：当 `showQuarterTransition === true` 时显示，`onComplete` 调用 `dismissQuarterTransition()`
- 渲染 `EventPopup`：当 `currentEvent !== null` 时显示，`onConfirm` 调用 `dismissEvent()`
- 渲染 `PerformancePopup`（新组件）：当 `lastPerformance !== null` 时显示绩效弹窗（评级 + 薪资变动），关闭后调用 `dismissPerformance()`

### ActionBar 联动

- `CriticalChoices` 的 `choices` prop 改为从 store 读 `criticalChoices`（替代当前的空数组 `[]`）
- 关键期第一天的 choices 需由 API 首次返回——当事件触发关键期时，`/api/game/turn` 的 quarterly 响应需包含初始 choices

### PerformancePopup（新增小组件）

- 像素风弹窗，显示：绩效评级（S/A/B+/B/C）+ 薪资变动（+X 或 -X）
- 用现有 `Modal` 组件包裹
- 关闭后调 `dismissPerformance()`

---

## 三、API 响应格式统一

### `/api/game/turn` Quarterly 响应

```typescript
{
  success: true
  state: GameState
  narrative: string
  events: GameEvent[]              // 始终返回（可为空数组）
  performanceRating: string | null // 非评审季度为 null
  salaryChange: number | null      // 非评审季度为 null
  // worldContext、npcActions、phoneMessages 已合并进 state，不单独返回
}
```

移除 `worldContext`、`npcActions`、`phoneMessages` 字段——这些数据已通过管线合并进 `state.phoneMessages`、`state.npcs` 等，前端无需单独读取。

### `/api/game/turn` Critical 响应

```typescript
{
  success: true
  state: GameState
  narrative: string
  nextChoices: CriticalChoice[]    // 始终返回（最后一天为空数组）
  isComplete: boolean
}
```

移除 `npcActions` 字段，同理已合并进 state。

### `/api/game/new` 响应增强

```typescript
{
  success: true
  state: GameState
  narrative: string                // 新增：开场叙事（"你拖着行李箱..."）
  criticalChoices: CriticalChoice[] // 新增：入职关键期初始选择
}
```

`createNewGame()` 返回 `timeMode: 'critical'`（入职第一周），因此需要同时返回第一天的 AI 生成选择。这意味着 `/api/game/new` 需要调用 narrative agent 生成开场叙事和初始 choices。

---

## 四、引擎修复

### 修复 1：Critical Day 体力重置硬编码

**文件：** `src/engine/critical-day.ts` 第 55 行

当前：`newState.staminaRemaining = 3`

改为：`newState.staminaRemaining = newState.criticalPeriod!.staminaPerDay`

### 修复 2：Phone Messages 去重

**文件：** `src/ai/orchestration/quarterly.ts`

在 `allMessages` 合并后、`push` 进 `state.phoneMessages` 前，按 `content + sender + app` 做去重：

```typescript
const seen = new Set<string>()
const uniqueMessages = allMessages.filter(m => {
  const key = `${m.app}:${m.sender ?? ''}:${m.content}`
  if (seen.has(key)) return false
  seen.add(key)
  return true
})
```

---

## 4.5、resign_startup 流程

### 问题

Plan 3 的 `ActionBar` 把 `resign_startup` 按钮做成了 `submitChoice()` 调用，但 `/api/game/turn` 在 `timeMode === 'quarterly'` 时只接受 `plan`，不接受 `choice`——API 会直接返回 400。真正的 Phase 2 切换逻辑在 `transitionToPhase2()`（`src/engine/phase-transition.ts`），需要专门的 API 路由。

### 方案

新建 `/api/game/resign` 路由：

```typescript
{
  success: true
  state: GameState           // transitionToPhase2 后的状态（phase=2, timeMode='critical', startup_launch）
  narrative: string          // 创业开场叙事
  criticalChoices: CriticalChoice[]  // 创业第一天的 AI 生成选择
}
```

前端变更：
- `gameStore` 新增 `resignStartup()` action，调用 `/api/game/resign`
- `ActionBar` 的 resign_startup 按钮改为调用 `resignStartup()` 而非 `submitChoice()`

### 前置校验

`canStartup(state.job.level)` 返回 `false` 时，路由返回 400。前端在 L6 以下不显示按钮（Plan 3 已处理）。

---

## 4.6、手机回复上下文传递

### 问题

Plan 3 在小信 App 里把玩家回复存入 `PhoneMessage.selectedReply`，文档声称"下次 AI Agent 调用时传递"，但当前 AI 管线（`quarterly.ts`、`critical.ts`）构建 prompt 时完全没读 `phoneMessages.selectedReply`。`runNarrativeAgent` 和 `runNPCAgent` 的 `buildUserPrompt` 也没有包含手机消息。

### 方案

在季度和关键期管线中，调用 `runNarrativeAgent` / `runNPCAgent` 前，从 `state.phoneMessages` 提取最近有 `selectedReply` 的消息，拼为 `playerContext` 字符串传入（两个 agent 的函数签名已有 `playerContext?: string` 参数，无需改签名）。

```typescript
// 在 quarterly.ts 和 critical.ts 中，调用 narrative/npc agent 前构建：
const recentReplies = settledState.phoneMessages
  .filter(m => m.selectedReply)
  .slice(-5)
  .map(m => `[${m.app}] ${m.sender}: "${m.content}" → 玩家回复: "${m.selectedReply}"`)
  .join('\n')

const playerContext = recentReplies || undefined
```

然后将 `playerContext` 传入 `runNarrativeAgent(..., playerContext)` 和 `runNPCAgent(..., playerContext)`。

不改 agent 内部 prompt 结构——`buildUserPrompt` 已有 `playerContext` 占位，只是之前季度模式没传值。

---

## 五、集成测试

测试环境：Vitest + node 环境（测 API 和管线逻辑，mock AI 调用）

### 测试覆盖

| 场景 | 验证 |
|------|------|
| 季度流程 | plan → API → engine → store 更新、narrative 入队、auto-save |
| 关键期流程 | choice → API → nextChoices 返回 → store.criticalChoices 更新 |
| 关键期结束 | isComplete → criticalChoices 清空、timeMode 切回 quarterly |
| 绩效评审 | 评审季度返回 performanceRating + salaryChange |
| 事件触发关键期 | events 中 triggersCritical → store.currentEvent 设置 |
| 新游戏 | /api/game/new → state + narrative + criticalChoices |
| 辞职创业 | /api/game/resign → phase 2 state + narrative + choices |
| 手机回复上下文 | selectedReply 传入 AI agent prompt |
| 存档读取继续 | loadGame → state 恢复、refreshState 触发 |

### Mock 策略

- AI Agent 调用 mock 为固定返回值（不测 AI 本身，只测集成流）
- `fetch` mock 用 vi.stubGlobal
- localStorage mock 用 vi.stubGlobal

---

## 六、文件结构

```
src/
  store/
    gameStore.ts                — 修改：新增字段和 actions（含 resignStartup）
  app/
    api/game/
      new/route.ts             — 修改：调用 narrative agent 生成开场
      turn/route.ts            — 修改：统一响应格式
      resign/route.ts          — 新建：辞职创业路由
    game/page.tsx              — 修改：接入 QuarterTransition、EventPopup、PerformancePopup
  components/game/
    PerformancePopup.tsx       — 新建：绩效弹窗
    ActionBar.tsx              — 修改：CriticalChoices 从 store 读 choices + resign_startup 用 resignStartup()
  engine/
    critical-day.ts            — 修改：stamina 硬编码
  ai/orchestration/
    quarterly.ts               — 修改：phone message 去重 + 手机回复上下文传递
    critical.ts                — 修改：手机回复上下文传递
tests/
  integration/
    quarterly-flow.test.ts     — 新建：季度集成测试
    critical-flow.test.ts      — 新建：关键期集成测试
    new-game-flow.test.ts      — 新建：新游戏集成测试
    resign-flow.test.ts        — 新建：辞职创业集成测试
```
