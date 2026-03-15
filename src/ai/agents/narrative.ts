import { generateText, Output } from "ai";

import { AGENT_MODELS, getModel } from "@/ai/provider";
import {
  CRITICAL_PERIOD_CATEGORIES,
  NarrativeAgentOutputSchema,
} from "@/ai/schemas";
import type {
  AgentInput,
  EventAgentOutput,
  NarrativeAgentOutput,
  NPCAgentOutput,
  WorldAgentOutput,
} from "@/types/agents";
import type { ActionAllocation } from "@/types/actions";

function buildSystemPrompt(
  input: AgentInput,
  isCriticalPeriod: boolean,
  generateChoices: boolean = isCriticalPeriod,
): string {
  let prompt = `你是"打工之道"游戏的故事编剧（Narrative Agent）。
你负责把所有发生的事情写成好看的故事。

文风要求：
- 幽默、接地气的打工人口吻，偶尔扎心
- 有画面感，像读小说一样
- 用第二人称"你"叙述
- 语言生动，避免流水账
- 300-500字为宜

当前状态：
- 游戏阶段：第${input.state.phase}阶段
- 当前季度：第${input.state.currentQuarter}季度
- 玩家职级：${input.state.job.level}（${input.state.job.companyName}）`;

  if (isCriticalPeriod && input.state.criticalPeriod) {
    const cp = input.state.criticalPeriod;
    const categories = CRITICAL_PERIOD_CATEGORIES[cp.type] ?? ["行动"];
    prompt += `

当前处于关键期：${cp.type}（第${cp.currentDay}天/共${cp.maxDays}天）
每天体力：${cp.staminaPerDay}点，玩家剩余体力：${input.state.staminaRemaining}点

你需要：
1. 生成当天的叙事（150-300字）`;

    if (generateChoices) {
      prompt += `
2. 生成3-4个行动选项（choices），每个选项必须包含：
   - choiceId: 唯一标识（格式：${cp.type}_d${cp.currentDay}_a/b/c）
   - label: 选项显示文本
   - staminaCost: 体力消耗（1-2点，不能超过剩余体力${input.state.staminaRemaining}点）
   - effects: 结构化效果（statChanges, npcFavorChanges, riskEvent）
   - category: 必须是以下之一：${categories.join("、")}

选项设计原则：
- 每个选项有不同的策略倾向和风险收益权衡
- 至少一个低风险选项、一个高收益高风险选项
- 效果数值要合理（属性变化±1~5，好感变化±5~15）`;
    } else {
      prompt += `
2. 今天是该关键期的最后一天，只生成当天叙事，不要生成choices。`;
    }
  } else {
    prompt += `

你需要：
1. 生成季度叙事总结（300-500字），将玩家行动、事件和NPC反应编织成一段连贯的故事
2. 生成narrativeSummary：一句话总结本季度核心事件（用于历史记录）
不需要生成choices（季度模式没有选择卡片）。`;
  }

  return prompt;
}

function buildUserPrompt(
  input: AgentInput,
  worldContext: WorldAgentOutput,
  eventContext: EventAgentOutput,
  npcContext: NPCAgentOutput,
  playerActions: ActionAllocation[],
  playerContext?: string,
): string {
  const actions = playerActions
    .map((action) =>
      action.target
        ? `${action.action}（目标：${action.target}）`
        : action.action,
    )
    .join("、");

  const events = eventContext.events
    .map((event) => `【${event.title}】${event.description}`)
    .join("\n");

  const npcActions = npcContext.npcActions
    .map((action) =>
      `${action.npcName}${action.action}${action.dialogue ? `，说："${action.dialogue}"` : ""}`,
    )
    .join("\n");

  const history = input.recentHistory
    .map((entry) => `Q${entry.quarter}: ${entry.narrativeSummary}`)
    .join("\n");

  return `世界环境：经济${worldContext.economy}，公司${worldContext.companyStatus}
行业趋势：${worldContext.trends.join("、") || "无"}

玩家行动：${actions || "无"}

本季度事件：
${events || "无"}

NPC动态：
${npcActions || "无"}

${history ? `最近历史：\n${history}` : ""}
${playerContext ? `\n关键期玩家选择：${playerContext}` : ""}

请编织以上素材，生成本${input.state.timeMode === "critical" ? "天" : "季度"}的叙事。`;
}

export async function runNarrativeAgent(
  input: AgentInput,
  worldContext: WorldAgentOutput,
  eventContext: EventAgentOutput,
  npcContext: NPCAgentOutput,
  playerActions: ActionAllocation[],
  isCriticalPeriod: boolean,
  playerContext?: string,
  generateChoices: boolean = isCriticalPeriod,
): Promise<NarrativeAgentOutput> {
  const { output } = await generateText({
    model: getModel(AGENT_MODELS.narrative),
    output: Output.object({ schema: NarrativeAgentOutputSchema }),
    system: buildSystemPrompt(input, isCriticalPeriod, generateChoices),
    prompt: buildUserPrompt(
      input,
      worldContext,
      eventContext,
      npcContext,
      playerActions,
      playerContext,
    ),
  });

  return output!;
}
