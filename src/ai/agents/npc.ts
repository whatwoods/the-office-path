import { generateText, Output } from "ai";

import { AGENT_MODELS, getModel } from "@/ai/provider";
import { NPCAgentOutputSchema } from "@/ai/schemas";
import type {
  AgentInput,
  EventAgentOutput,
  NPCAgentOutput,
  WorldAgentOutput,
} from "@/types/agents";
import type { ActionAllocation } from "@/types/actions";

function buildSystemPrompt(input: AgentInput): string {
  const phase = input.state.phase;
  const quarter = input.state.currentQuarter;

  let prompt = `你是"打工之道"游戏的人物编剧（NPC Agent）。
你负责扮演所有NPC，让每个人有自己的"灵魂"。

当前状态：
- 游戏阶段：第${phase}阶段
- 当前季度：第${quarter}季度

你的职责：
1. 根据每个NPC的性格、背景和隐藏目标，决定他们本季度的行动和反应
2. 生成NPC发给玩家的小信/叮叮消息
3. 在适当时机引入新NPC或让老NPC淡出

规则：
- 每个NPC有独立的性格和目标，行为必须符合人设
- 好感度变化要有合理原因，不要无故涨跌
- 同时活跃的重要NPC不超过8个
- 当需要新NPC入场时，优先让低好感度或低剧情相关性的NPC淡出
- NPC的对话风格要符合其性格
- 小信消息要自然、口语化，像真人发的微信
- 某些NPC可以作为信息渠道，传递世界或事件动态
- 文字内容（对话、消息等）必须是中文，枚举字段使用schema定义的英文值`;

  if (phase === 2) {
    prompt += `

第2阶段NPC角色类型变化：
- 合伙人：高好感度同盟，但可能有经营分歧
- 员工：有满意度，不满会离职
- 投资人：好感决定融资成功率
- 竞争对手：抢市场、挖人
- 客户：好感影响续约和营收

前同事可能转变为以上任何角色，根据其性格和与玩家的关系决定新角色。`;
  }

  return prompt;
}

function buildUserPrompt(
  input: AgentInput,
  worldContext: WorldAgentOutput,
  eventContext: EventAgentOutput,
  playerActions: ActionAllocation[],
  playerContext?: string,
): string {
  const npcProfiles = input.state.npcs
    .filter((npc) => npc.isActive)
    .map(
      (npc) =>
        `- ${npc.name}（${npc.role}）：性格"${npc.personality}"，隐藏目标"${npc.hiddenGoal}"，好感度${npc.favor}，状态：${npc.currentStatus}`,
    )
    .join("\n");

  const actions = playerActions
    .map((action) =>
      action.target
        ? `${action.action}（目标：${action.target}）`
        : action.action,
    )
    .join("、");

  const events = eventContext.events
    .map((event) => `${event.title}：${event.description}`)
    .join("\n");

  const history = input.recentHistory
    .map((entry) => `Q${entry.quarter}: ${entry.narrativeSummary}`)
    .join("\n");

  return `世界环境：
- 经济周期：${worldContext.economy}
- 公司状态：${worldContext.companyStatus}
- 行业趋势：${worldContext.trends.join("、") || "无"}

当前活跃NPC：
${npcProfiles || "无"}

本季度玩家行动：${actions || "无"}
${playerContext ? `\n关键期玩家选择：${playerContext}` : ""}

本季度事件：
${events || "无"}

${history ? `最近历史：\n${history}\n\n` : ""}请生成各NPC的反应、行动和消息。注意NPC的行为要与其性格和隐藏目标一致。`;
}

export async function runNPCAgent(
  input: AgentInput,
  worldContext: WorldAgentOutput,
  eventContext: EventAgentOutput,
  playerActions: ActionAllocation[],
  playerContext?: string,
): Promise<NPCAgentOutput> {
  const { output } = await generateText({
    model: getModel(AGENT_MODELS.npc),
    output: Output.object({ schema: NPCAgentOutputSchema }),
    system: buildSystemPrompt(input),
    prompt: buildUserPrompt(
      input,
      worldContext,
      eventContext,
      playerActions,
      playerContext,
    ),
  });

  return output!;
}
