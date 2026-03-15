import { generateText, Output } from "ai";

import { AGENT_MODELS, getModel } from "@/ai/provider";
import { WorldAgentOutputSchema } from "@/ai/schemas";
import type { AgentInput, WorldAgentOutput } from "@/types/agents";

function buildSystemPrompt(input: AgentInput): string {
  const phase = input.state.phase;
  const quarter = input.state.currentQuarter;

  let prompt = `你是"打工之道"游戏的世界编剧（World Agent）。
你负责管理游戏世界的大环境，让世界有"呼吸感"。

当前状态：
- 游戏阶段：第${phase}阶段
- 当前季度：第${quarter}季度
- 当前经济周期：${input.state.world.economyCycle}
- 公司状态：${input.state.world.companyStatus}

你的职责：
1. 判定本季度的经济环境（boom繁荣/stable平稳/winter寒冬）
2. 生成1-3条行业趋势
3. 判定玩家所在公司的经营状态（expanding扩张/stable稳定/shrinking收缩）
4. 生成1-3条"今日条条"新闻

规则：
- 经济周期有惯性：如果上季度是繁荣，本季度大概率继续繁荣或转为平稳，极少直接变寒冬
- 公司状态受经济周期影响：寒冬时公司更可能收缩
- 新闻要贴近中国职场/互联网行业现实，有细节感
- 文字内容（趋势、新闻等）必须是中文，枚举字段使用schema定义的英文值`;

  if (phase === 2 && input.state.company) {
    prompt += `

第2阶段额外信息（创业公司）：
- 公司阶段：${input.state.company.stage}
- 产品质量：${input.state.company.productQuality}
- 品牌知名度：${input.state.company.brandAwareness}
- 季度营收：${input.state.company.quarterlyRevenue}
- 现金流：${input.state.company.cashFlow}

第2阶段特别关注：
- 市场环境对创业公司的影响更大
- 生成与创业、融资、竞争相关的趋势和新闻`;
  }

  return prompt;
}

function buildUserPrompt(input: AgentInput): string {
  const history = input.recentHistory
    .map((entry) => `Q${entry.quarter}: ${entry.narrativeSummary}`)
    .join("\n");

  return `请根据当前状态生成本季度的世界环境判定。

玩家所在公司：${input.state.job.companyName}
玩家职级：${input.state.job.level}
${history ? `\n最近历史：\n${history}` : ""}

请输出本季度的经济环境、行业趋势、公司状态和新闻。`;
}

export async function runWorldAgent(
  input: AgentInput,
): Promise<WorldAgentOutput> {
  const { output } = await generateText({
    model: getModel(AGENT_MODELS.world),
    output: Output.object({ schema: WorldAgentOutputSchema }),
    system: buildSystemPrompt(input),
    prompt: buildUserPrompt(input),
  });

  return output!;
}
