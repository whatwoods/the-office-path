import { generateText, Output } from "ai";

import { getModel, resolveAgentModel } from "@/ai/provider";
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
import type { AIConfig } from "@/types/settings";

type PromptAction = {
  action: string;
  target?: string;
};

const STRICT_JSON_INSTRUCTIONS = `

结构化输出要求：
- 只返回单个 JSON 对象
- 不要直接输出正文、markdown、标题、分隔线、解释、额外说明
- 顶层字段只能使用 narrative、narrativeSummary、choices
- 故事正文必须放在 narrative 字段里
- 季度模式可返回 narrative + narrativeSummary，不要返回 choices
- 关键期模式必须返回 narrative；是否返回 choices 由当前指令决定
`;

function buildSystemPrompt(
  input: AgentInput,
  isCriticalPeriod: boolean,
  generateChoices: boolean = isCriticalPeriod,
): string {
  if (input.state.phase2Path === "executive") {
    const executive = input.state.executive;
    const categories =
      input.state.criticalPeriod
        ? CRITICAL_PERIOD_CATEGORIES[input.state.criticalPeriod.type] ?? ["行动"]
        : ["行动"];

    return `你是一个职场模拟游戏的叙事者。玩家现在是公司高管（${executive?.stage}），正在公司权力中心博弈。

叙事风格：
- 描述公司政治、董事会动态、部门竞争
- 引用高管属性（部门业绩: ${executive?.departmentPerformance ?? 0}/100, 董事会支持率: ${executive?.boardSupport ?? 0}/100）
- 如果本季度有麦麦活动，将其后果编织进叙事
- 关注权力博弈和战略决策的张力

${isCriticalPeriod
  ? `当前关键期：${input.state.criticalPeriod?.type}
生成150-300字的每日叙事${generateChoices ? " + 3-4个情境选择" : ""}，选择必须属于以下类别：${categories.join("/")}
每个选择需要结构化效果（对ExecutiveState和PlayerAttributes的影响）
返回格式：${generateChoices ? '{"narrative":"...", "choices":[...]}' : '{"narrative":"..."}'}`
  : '生成300-500字的季度叙事 + 一句话 narrativeSummary\n返回格式：{"narrative":"...", "narrativeSummary":"..."}'}
${STRICT_JSON_INSTRUCTIONS}`;
  }

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
     - statChanges 只允许使用这些属性键：health、professional、communication、management、network、mood、money、reputation
     - riskEvent 如存在，必须是对象，包含 probability、description、statChanges；如果没有风险事件，就省略 riskEvent
   - category: 必须是以下之一：${categories.join("、")}
   - choices 数组在当前关键期是必填字段，不允许省略

选项设计原则：
- 每个选项有不同的策略倾向和风险收益权衡
- 至少一个低风险选项、一个高收益高风险选项
- 效果数值要合理（属性变化±1~5，好感变化±5~15）

返回格式：
{
  "narrative": "当天叙事正文",
  "choices": [...]
}`;
    } else {
      prompt += `
2. 今天是该关键期的最后一天，只生成当天叙事，不要生成choices。

返回格式：
{
  "narrative": "当天叙事正文"
}`;
    }
  } else {
    prompt += `

你需要：
1. 生成季度叙事总结（300-500字），将玩家行动、事件和NPC反应编织成一段连贯的故事
2. 生成narrativeSummary：一句话总结本季度核心事件（用于历史记录）
不需要生成choices（季度模式没有选择卡片）。

返回格式：
{
  "narrative": "季度叙事正文",
  "narrativeSummary": "一句话总结"
}`;
  }

  return `${prompt}\n\n${STRICT_JSON_INSTRUCTIONS}`;
}

function buildUserPrompt(
  input: AgentInput,
  worldContext: WorldAgentOutput,
  eventContext: EventAgentOutput,
  npcContext: NPCAgentOutput,
  playerActions: PromptAction[],
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

  let userPrompt = `世界环境：经济${worldContext.economy}，公司${worldContext.companyStatus}
行业趋势：${worldContext.trends.join("、") || "无"}

玩家行动：${actions || "无"}

本季度事件：
${events || "无"}

NPC动态：
${npcActions || "无"}

${history ? `最近历史：\n${history}` : ""}
${playerContext ? `\n关键期玩家选择：${playerContext}` : ""}

请编织以上素材，生成本${input.state.timeMode === "critical" ? "天" : "季度"}的叙事。`;

  if (input.state.executive) {
    userPrompt += `\n\n## 高管状态
阶段: ${input.state.executive.stage}
部门业绩: ${input.state.executive.departmentPerformance}/100
董事会支持率: ${input.state.executive.boardSupport}/100
团队忠诚度: ${input.state.executive.teamLoyalty}/100
政治资本: ${input.state.executive.politicalCapital}/100
股价: ¥${input.state.executive.stockPrice}
管辖部门数: ${input.state.executive.departmentCount}`;
  }

  if (eventContext.maimaiResults?.postResults?.length) {
    userPrompt += `\n\n## 麦麦动态后果`;
    for (const postResult of eventContext.maimaiResults.postResults) {
      userPrompt += `\n- ${postResult.aiAnalysis}（传播等级: ${postResult.viralLevel}${
        postResult.consequences.identityExposed ? "，身份被暴露！" : ""
      }）`;
    }
  }

  return userPrompt;
}

export async function runNarrativeAgent(
  input: AgentInput,
  worldContext: WorldAgentOutput,
  eventContext: EventAgentOutput,
  npcContext: NPCAgentOutput,
  playerActions: PromptAction[],
  isCriticalPeriod: boolean,
  playerContext?: string,
  generateChoices: boolean = isCriticalPeriod,
  aiConfig?: AIConfig,
): Promise<NarrativeAgentOutput> {
  const { output } = await generateText({
    model: getModel(
      resolveAgentModel("narrative", aiConfig),
      aiConfig?.apiKey,
      aiConfig?.baseUrl,
    ),
    output: Output.object({ schema: NarrativeAgentOutputSchema }),
    temperature: 0,
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

  if (isCriticalPeriod && generateChoices && !output?.choices?.length) {
    throw new Error("Narrative agent must return choices during active critical periods");
  }

  return output!;
}
