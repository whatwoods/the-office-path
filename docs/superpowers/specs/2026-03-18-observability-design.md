# 项目可观测性加强设计

## Overview

本次为《打工之道》补齐一层轻量、项目内自洽的服务端可观测能力，优先解决 `/api/game/*` 请求链路难排查的问题。

设计目标不是引入完整监控平台，而是在不增加持久化依赖、不暴露线上诊断接口的前提下，让自托管环境中的服务器日志能够稳定回答以下问题：

- 哪个接口被调用了
- 这次请求是否通过了参数校验
- 总耗时和关键步骤耗时分别是多少
- 失败发生在哪一层
- 相关 AI 调用使用了哪个 provider / model，以及 token 摘要如何

## Goals

- 为 `src/app/api/game/*` 路由建立统一的结构化日志协议
- 为每次请求生成并贯穿全链路的 `requestId`
- 覆盖请求入口、参数校验、核心编排步骤、AI agent 调用和请求出口
- 区分校验错误、业务执行错误和未预期异常，提升服务器日志可读性
- 在不记录敏感配置和大体量业务载荷的前提下保留足够的排障信息
- 保持实现足够轻量，后续可平滑接入第三方日志/追踪平台

## Non-Goals

- 不引入 Sentry、Datadog、Grafana、Prometheus、OpenTelemetry Collector 等第三方观测服务
- 不增加数据库、SQLite、本地文件归档等持久化方案
- 不新增线上诊断 API、观测页面或游戏内调试面板
- 不将可观测性扩展到整个前端组件树，只关注服务端 API 链路
- 不在本次内为所有 engine 纯函数逐一加埋点

## Confirmed Constraints

- 线上环境为自托管服务
- 第一优先级是接口链路问题，而不是前端体验层诊断
- 可观测性数据只保留在服务器实时日志中
- 生产环境不暴露任何额外诊断入口
- 本地开发环境可以拥有更详细的调试字段，但仍以服务器日志为主

## Scope

本次覆盖范围分两层：

### 1. 请求入口层

为以下路由统一接入请求级日志：

- `src/app/api/game/new/route.ts`
- `src/app/api/game/turn/route.ts`
- `src/app/api/game/state/route.ts`
- `src/app/api/game/resign/route.ts`

### 2. 关键执行层

只在最影响链路排障的节点增加步骤日志：

- `src/ai/orchestration/quarterly.ts`
- `src/ai/orchestration/critical.ts`
- `src/ai/agents/world.ts`
- `src/ai/agents/event.ts`
- `src/ai/agents/npc.ts`
- `src/ai/agents/narrative.ts`

`src/engine/*` 继续保持以纯业务计算为主，不在本次中大面积加入日志逻辑。

## Design Summary

实现一个很薄的项目内 observability 工具层，统一负责三件事：

1. 创建请求上下文
2. 输出结构化 JSON 日志
3. 记录关键步骤的开始、结束、异常和耗时

业务代码不直接散落 `console.log`，而是通过统一工具输出日志，确保字段格式稳定。

## Log Model

所有日志统一输出为单行 JSON，便于：

- 本地开发直接查看终端输出
- 生产环境接入进程管理器或日志采集器时无需改日志格式
- 后续对接第三方日志平台时尽量减少代码调整

建议基础字段如下：

```ts
interface ObservabilityLog {
  timestamp: string
  level: 'info' | 'warn' | 'error'
  event:
    | 'request.start'
    | 'request.finish'
    | 'request.validation_failed'
    | 'request.error'
    | 'step.start'
    | 'step.finish'
    | 'step.error'
  message: string
  requestId: string
  route?: string
  method?: string
  step?: string
  statusCode?: number
  durationMs?: number
  errorType?: 'validation' | 'operation' | 'unexpected'
  provider?: string
  model?: string
  aiUsage?: {
    inputTokens?: number
    outputTokens?: number
    totalTokens?: number
  }
  metadata?: Record<string, unknown>
}
```

### Event Semantics

- `request.start`
  请求进入 route handler 时记录
- `request.finish`
  响应成功返回前记录，附带总耗时和状态码
- `request.validation_failed`
  请求体缺失、schema 校验失败或前置条件不满足时记录
- `request.error`
  捕获到未成功处理的异常时记录
- `step.start`
  关键步骤开始时记录
- `step.finish`
  关键步骤成功结束时记录，附带耗时和摘要
- `step.error`
  关键步骤抛错时记录

## Request Context Design

每个 API 请求进入后立即创建一个请求上下文对象，内容至少包括：

```ts
interface RequestContext {
  requestId: string
  route: string
  method: string
  startedAt: number
  log: {
    info: (event: string, message: string, extra?: Record<string, unknown>) => void
    warn: (event: string, message: string, extra?: Record<string, unknown>) => void
    error: (event: string, message: string, extra?: Record<string, unknown>) => void
  }
  createStep: (step: string) => StepLogger
}
```

`requestId` 由服务端生成，不依赖客户端传值。格式无需复杂，使用时间戳加随机后缀即可，例如：

```ts
req_1710748800000_ab12cd
```

这个上下文会从 route handler 继续传到 orchestration 和 agent 调用层，用来保证同一次请求的日志都能串起来。

## Timed Step Helper

新增一个小型计时工具，用统一方式包裹关键步骤：

```ts
await withObservedStep(ctx, 'run_world_agent', async () => {
  return runWorldAgent(...)
}, {
  metadata: { phase: settledState.phase, quarter: settledState.currentQuarter },
})
```

这个 helper 负责：

1. 输出 `step.start`
2. 记录耗时
3. 成功时输出 `step.finish`
4. 失败时输出 `step.error` 后继续抛出异常

这样可以避免每个调用点自己手写开始时间、结束时间和异常日志。

## Route-Level Integration

### `POST /api/game/new`

记录以下节点：

- 请求进入
- 请求体解析完成
- 初始状态创建完成
- narrative agent 首次调用开始/结束
- critical choices 校验完成（如存在）
- 请求成功返回
- 捕获异常

### `POST /api/game/turn`

记录以下节点：

- 请求进入
- 请求体解析完成
- `state` 校验通过或失败
- 分支选择：
  - `critical` 流程
  - `quarterly` 流程
  - `executive quarterly` 流程
- 核心 pipeline 执行耗时
- 请求成功返回
- 捕获异常

### `POST /api/game/state`

记录以下节点：

- 请求进入
- 请求体解析完成
- `state` 校验通过或失败
- promotion 检查完成
- 请求成功返回
- 捕获异常

### `POST /api/game/resign`

记录以下节点：

- 请求进入
- 请求体解析完成
- `state` 校验通过或失败
- 创业资格检查结果
- narrative agent 调用开始/结束
- critical choices 校验完成（如存在）
- 请求成功返回
- 捕获异常

## Orchestration Integration

### Quarterly Pipeline

`src/ai/orchestration/quarterly.ts` 需要覆盖这些关键步骤：

- `settle_quarter_engine`
- `run_world_agent`
- `run_event_agent`
- `validate_events`
- `apply_event_effects`
- `run_npc_agent`
- `append_phone_messages`
- `run_narrative_agent`
- `create_history_summary`
- `maybe_generate_critical_choices`

这里不要求每一步都记录完整业务对象，而是记录排障摘要，例如：

- 当前 `phase`
- `currentQuarter`
- 事件数量
- NPC 动作数量
- 手机消息数量
- 是否进入 critical period

### Critical Pipeline

`src/ai/orchestration/critical.ts` 应以同样方式记录：

- 输入选择校验
- 关键期推进逻辑
- 相关 narrative / event 生成
- 结束状态判断

目标是让一次关键期请求在日志中也能形成清晰的步骤链。

## AI Agent Integration

四个 agent 统一通过相同模式记录：

- `step.start`
  包含 agent 名称、provider、model
- `step.finish`
  包含耗时和 AI usage 摘要
- `step.error`
  包含 agent 名称、provider、model 和错误分类

记录字段示例：

```ts
{
  step: 'run_world_agent',
  provider: 'openai',
  model: 'openai:gpt-4o-mini',
  aiUsage: {
    inputTokens: 1200,
    outputTokens: 320,
    totalTokens: 1520,
  }
}
```

### AI Usage Policy

不重复设计新的 token 统计体系，继续复用现有 `src/lib/aiUsage.ts` 的能力。

日志只记录聚合摘要，不记录：

- 原始 prompt
- 原始 response 文本
- API Key
- 完整 `aiConfig`

## Error Classification

为日志增加明确的错误分类，帮助快速判断故障性质：

### 1. `validation`

适用于：

- 缺少 `state`
- 缺少 `plan`
- 缺少 `choice`
- schema 校验失败
- 等级不足等明确前置条件不满足

通常对应 `400` 或受控失败。

### 2. `operation`

适用于：

- 季度计划校验失败
- 编排阶段的规则冲突
- AI 返回结构可解析，但业务规则校验未通过

这类错误不是程序崩溃，但说明一次业务操作未成功。

### 3. `unexpected`

适用于：

- 未预期异常
- SDK 抛错
- 空值访问
- 未被识别的运行时错误

这类错误通常需要优先排查代码或外部依赖。

## Data Minimization And Redaction

为了兼顾排障价值和安全性，本次采用默认克制的日志策略。

### 明确不记录

- API Key
- 完整 `aiConfig`
- 完整 `state`
- 完整 `plan`
- 完整 `choice`
- 完整 narrative 文本
- 完整 prompt / completion 内容

### 允许记录的摘要

- `state.timeMode`
- `state.phase`
- `state.currentQuarter`
- `plan.actions.length`
- `choice.id` 或 `choice.title`
- narrative 是否存在、文本长度
- 事件数量、消息数量、NPC 动作数量
- AI usage token 汇总

### 环境差异

- `development`
  - 可输出 `errorStack`
  - metadata 可以更丰富
- `production`
  - 默认不输出 `errorStack`
  - 仅保留排障必要摘要字段

## Proposed Utility Files

建议新增以下工具模块：

### `src/lib/observability/logger.ts`

职责：

- 统一生成 JSON 日志行
- 处理 `info / warn / error`
- 自动补充时间戳和公共字段

### `src/lib/observability/request-context.ts`

职责：

- 创建 `requestId`
- 创建请求级日志上下文
- 暴露步骤日志构造能力

### `src/lib/observability/timed.ts`

职责：

- 提供 `withObservedStep()` 之类的 helper
- 统一记录关键步骤耗时与异常

## Files To Modify

### 新增

- `src/lib/observability/logger.ts`
- `src/lib/observability/request-context.ts`
- `src/lib/observability/timed.ts`
- 对应测试文件

### 修改

- `src/app/api/game/new/route.ts`
- `src/app/api/game/turn/route.ts`
- `src/app/api/game/state/route.ts`
- `src/app/api/game/resign/route.ts`
- `src/ai/orchestration/quarterly.ts`
- `src/ai/orchestration/critical.ts`
- `src/ai/agents/world.ts`
- `src/ai/agents/event.ts`
- `src/ai/agents/npc.ts`
- `src/ai/agents/narrative.ts`

## Testing Strategy

### Unit Tests

新增 observability 工具层测试，覆盖：

- 日志对象结构是否稳定
- `requestId` 是否生成
- `withObservedStep()` 在成功/失败时是否输出正确事件
- 生产/开发环境字段裁剪是否符合预期

### Route Tests

更新现有 route 测试或新增测试，覆盖：

- 请求成功时输出 `request.start` 与 `request.finish`
- 参数缺失时输出 `request.validation_failed`
- 异常时输出 `request.error`

这里不校验控制台文本本身的排版，而是校验日志调用产生的结构化对象。

### Orchestration And Agent Tests

补充或更新测试，确保：

- pipeline 在关键步骤调用日志 helper
- AI agent 成功时会记录 provider / model / token 摘要
- AI agent 失败时会记录 `step.error`

## Rollout Plan

建议按以下顺序实施：

1. 先实现 observability 工具层和对应单元测试
2. 接入四个 `/api/game/*` route
3. 接入 `quarterly` 和 `critical` 编排层
4. 接入四个 AI agent
5. 运行现有测试并补齐新增测试

这个顺序有两个好处：

- 先把请求入口统一起来，再逐层加深链路
- 即使中途停止，也已经能从 route 入口获得基础排障信息

## Risks And Trade-Offs

- 不做持久化意味着生产环境日志无法在项目内查询历史
  - 这是已确认约束，当前通过标准化 stdout 日志接受这一取舍
- 日志过多可能增加终端噪音
  - 通过只覆盖关键路径、避免记录大对象来控制体量
- 观测层若侵入业务签名过深，会增加维护成本
  - 通过薄封装和摘要字段控制改动范围
- 生产环境不输出完整 stack，某些疑难问题定位速度会下降
  - 这是安全与信息量之间的有意取舍

## Out Of Scope

- 线上可视化观测后台
- 指标聚合仪表盘
- 前端页面级错误采集
- 全项目函数级 tracing
- 自动报警、告警阈值和通知渠道
