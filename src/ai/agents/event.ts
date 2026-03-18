import { generateText, Output } from "ai";

import { type AIUsageCollector, normalizeAIUsage } from "@/lib/aiUsage";
import type { RequestContext } from "@/lib/observability/request-context";
import { getModel, resolveAgentModel } from "@/ai/provider";
import { EventAgentOutputSchema } from "@/ai/schemas";
import type {
  AgentInput,
  EventAgentOutput,
  WorldAgentOutput,
} from "@/types/agents";
import type { AIConfig } from "@/types/settings";

const MAIMAI_INSTRUCTIONS = `
## 麦麦帖子后果分析
- 仅在存在 maimaiActivity 时分析玩家发帖、点赞和评论
- 发帖需要判断传播等级、属性/NPC影响、是否暴露身份，并生成 1-5 条匿名回复
- 点赞和评论也要给出对应后果
`;

const OFFER_INSTRUCTIONS = `
如输入明确包含 offerRequested:true，则在 hrzhipin 的 phoneMessages 中生成 offer 消息。
`;

const STRICT_JSON_INSTRUCTIONS = `

结构化输出要求：
- 只返回单个 JSON 对象
- 顶层字段只能使用 events、phoneMessages、maimaiResults
- events 使用 type、title、description、severity、triggersCritical
- phoneMessages 使用 app、content，sender 可选
- app 必须使用 schema 的英文枚举值，例如 dingding、maimai、jinritiaotiao、hrzhipin，不要写中文标签
`;

function hasMaimaiActivity(input: AgentInput): boolean {
  const activity = input.maimaiActivity;
  if (!activity) {
    return false;
  }

  return (
    activity.playerPosts.length > 0 ||
    activity.playerLikes.length > 0 ||
    activity.playerComments.length > 0
  );
}

function buildSystemPrompt(input: AgentInput): string {
  const phase = input.state.phase;
  const quarter = input.state.currentQuarter;
  const level = input.state.job.level;

  let prompt = `你是"打工之道"游戏的事件编剧（Event Agent）。
你负责制造意外，让游戏不可预测。

当前状态：
- 游戏阶段：第${phase}阶段
- 当前季度：第${quarter}季度
- 玩家职级：${level}

你的职责：
1. 根据玩家状态和世界环境，决定本季度是否触发事件（0-3个）
2. 生成手机消息（麦麦匿名爆料、今日条条新闻等）

事件类型（第1阶段）：
- 职场事件（高频）：加需求、deadline提前、团建、同事离职、办公室政治
- 生活事件（中频）：房东涨租、搬家、相亲、家人生病、朋友借钱
- 行业事件（低频高影响）：公司被收购、行业裁员潮、竞争对手挖人

规则：
- 参考玩家数值状态：健康低→容易生病，声望高→容易被挖，心情低→容易爆发
- 事件要与上下文连贯，不要凭空出现
- severity决定影响程度，triggersCritical=true会触发关键期模式
- 不要每个季度都触发关键期，大约每3-5个季度触发一次
- 手机消息是被动信息，不花体力但提供情报
- 文字内容（事件描述、消息内容等）必须是中文，枚举字段使用schema定义的英文值`;

  if (phase === 2) {
    prompt += `

第2阶段事件类型：
- 经营事件（高频）：核心员工要离职、产品出BUG、客户投诉
- 融资事件（中频）：投资人约见、尽职调查
- 危机事件（低频高影响）：合伙人分歧、大客户流失、现金流断裂`;
  }

  const optionalInstructions = [
    hasMaimaiActivity(input) ? MAIMAI_INSTRUCTIONS : "",
    OFFER_INSTRUCTIONS,
    STRICT_JSON_INSTRUCTIONS,
  ]
    .filter(Boolean)
    .join("\n");

  prompt += `\n${optionalInstructions}`;

  return prompt;
}

function buildUserPrompt(
  input: AgentInput,
  worldContext: WorldAgentOutput,
): string {
  const player = input.state.player;
  const activeNpcs = input.state.npcs
    .filter((npc) => npc.isActive)
    .map((npc) => `${npc.name}(${npc.role}, 好感${npc.favor})`)
    .join("、");

  const history = input.recentHistory
    .map((entry) => `Q${entry.quarter}: ${entry.narrativeSummary}`)
    .join("\n");

  const news = worldContext.newsItems.join("、") || "无";
  const trends = worldContext.trends.join("、") || "无";

  let userPrompt = `世界环境：
- 经济周期：${worldContext.economy}
- 公司状态：${worldContext.companyStatus}
- 行业趋势：${trends}
- 最新新闻：${news}

玩家状态：
- 健康：${player.health}，心情：${player.mood}，声望：${player.reputation}
- 专业能力：${player.professional}，沟通：${player.communication}，管理：${player.management}
- 人脉：${player.network}，金钱：${player.money}元
- 当前住房：${input.state.housing.type}

活跃NPC：${activeNpcs || "无"}
${history ? `\n最近历史：\n${history}` : ""}

请生成本季度的事件和手机消息。`;

  if (input.maimaiActivity) {
    const { playerPosts, playerLikes, playerComments } = input.maimaiActivity;

    if (
      playerPosts.length > 0 ||
      playerLikes.length > 0 ||
      playerComments.length > 0
    ) {
      userPrompt += `\n\n## 本季度麦麦活动\n`;

      if (playerPosts.length > 0) {
        userPrompt += `玩家发帖：\n${playerPosts
          .map((post) => `- "${post.content}"`)
          .join("\n")}\n`;
      }

      if (playerLikes.length > 0) {
        userPrompt += `玩家点赞的帖子ID：${playerLikes.join(", ")}\n`;
      }

      if (playerComments.length > 0) {
        userPrompt += `玩家评论：\n${playerComments
          .map((comment) => `- 对帖子${comment.postId}: "${comment.content}"`)
          .join("\n")}\n`;
      }
    }
  }

  return userPrompt;
}

export async function runEventAgent(
  input: AgentInput,
  worldContext: WorldAgentOutput,
  aiConfig?: AIConfig,
  onUsage?: AIUsageCollector,
  ctx?: RequestContext,
): Promise<EventAgentOutput> {
  const modelSpec = resolveAgentModel("event", aiConfig);
  const provider = modelSpec.split(":")[0];
  const startedAt = Date.now();
  ctx?.log.info("step.start", "event agent started", {
    step: "run_event_agent",
    model: modelSpec,
    provider,
  });

  try {
    const result = await generateText({
      model: getModel(
        modelSpec,
        aiConfig?.apiKey,
        aiConfig?.baseUrl,
      ),
      output: Output.object({ schema: EventAgentOutputSchema }),
      temperature: 0,
      system: buildSystemPrompt(input),
      prompt: buildUserPrompt(input, worldContext),
    });
    const usage = normalizeAIUsage(result.usage);

    onUsage?.({
      agent: "event",
      model: modelSpec,
      ...usage,
    });

    ctx?.log.info("step.finish", "event agent finished", {
      step: "run_event_agent",
      durationMs: Date.now() - startedAt,
      model: modelSpec,
      provider,
      aiUsage: {
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        totalTokens: usage.totalTokens,
      },
    });

    return result.output!;
  } catch (error) {
    ctx?.log.error("step.error", "event agent failed", {
      step: "run_event_agent",
      durationMs: Date.now() - startedAt,
      errorType: "unexpected",
      errorName: error instanceof Error ? error.name : undefined,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      model: modelSpec,
      provider,
    });
    throw error;
  }
}
