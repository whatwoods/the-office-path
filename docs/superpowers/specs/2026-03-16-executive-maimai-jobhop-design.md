# 留任高管 + 麦麦发帖 + 跳槽机制 设计文档

## 概述

本文档描述三个新增功能的完整设计，三者相互关联，统一设计以确保数据模型和 Agent 接口的一致性。

**三个功能：**

1. **留任高管路径** — L8 时与创业并列的第二阶段路线，在公司权力中心博弈
2. **麦麦匿名发帖** — 玩家可自由发帖、点赞、评论，AI 动态决定后果，影响公司/同事/行业/自身
3. **跳槽机制** — 完整换公司体验，新 NPC、新环境、薪资溢价

---

## 一、留任高管路径

### 1.1 核心定位

到达 L8 后，玩家面临选择：**创业** 或 **留任高管**。留任高管是一条与创业并列的第二阶段路线——不再关注个人晋升，而是在公司权力中心博弈：管理部门、推动战略、应对董事会、处理高管政治。

### 1.2 高管阶段体系

| 阶段 | 称呼 | 年薪参考 | 核心挑战 | 升级条件 |
|------|------|---------|---------|---------|
| E1 | VP / CTO | 180万+ | 站稳脚跟，获得CEO信任 | 部门业绩达标3季度，董事会支持率≥50% |
| E2 | SVP / 事业群总裁 | 300万+ | 管多条业务线，跨部门博弈 | 事业群营收增长≥30%，管理≥3个部门 |
| E3 | CEO / 联合创始人 | 500万+ | 终局——掌控公司命运 | 需要"权力交接"机遇事件触发 |

### 1.3 高管属性

替代创业路径的公司属性，这些是留任高管路线的核心指标：

| 属性 | 范围 | 说明 |
|------|------|------|
| departmentPerformance（部门业绩） | 0-100 | 你管辖范围的绩效表现 |
| boardSupport（董事会支持率） | 0-100 | 决定你的话语权和去留 |
| teamLoyalty（团队忠诚度） | 0-100 | 下属是否跟你走 |
| politicalCapital（政治资本） | 0-100 | 高管间博弈的筹码 |
| stockPrice（公司股价/市值） | 具体数字 | 影响期权收入和外部声誉 |

### 1.4 高管行动体系（季度制，10点体力）

| 行动 | 体力 | 效果 |
|------|------|------|
| push_business（推动业务） | 2点 | 部门业绩+5 |
| manage_board（向上管理CEO/董事会） | 2点 | 董事会支持率+8 |
| build_team（团队建设） | 2点 | 团队忠诚度+8 |
| political_maneuvering（政治运作） | 3点 | 政治资本+10，但有暴露风险 |
| strategic_planning（战略布局） | 3点 | 可推动重大决策（收购、裁员、新业务线） |
| industry_networking（社交/行业活动） | 2点 | 声望+5，人脉+3 |
| rest（休息调整） | 1点 | 健康+3，心情+8 |

### 1.5 高管关键期类型

| 类型 | 触发条件 | 天数 | 行动类别 |
|------|---------|------|---------|
| board_review（董事会审查） | 每4季度自动 / 业绩太差 | 3天 | 汇报/拉票/甩锅 |
| power_struggle（权力斗争） | 事件触发（其他高管挑战） | 5天 | 结盟/反击/妥协 |
| major_decision（重大决策） | 战略布局触发 | 3-5天 | 分析/推动/风控 |
| power_transition（权力交接） | E3晋升条件满足时 | 7天 | 布局/造势/谈判 |

### 1.6 高管失败条件

- 董事会支持率降至0 → 被迫辞职（可选择跳槽到其他公司当高管 / 创业）
- 连续2季度部门业绩<30 → 被边缘化，降为普通VP
- 卷入丑闻（政治运作失败 / 麦麦爆料被追溯） → 可能被开除

### 1.7 从第一阶段继承

与创业路径相同：金钱、人脉、声望、健康、心情、NPC 关系全保留。额外：在原公司的 NPC 关系更重要（领导变同僚、同事变下属）。

### 1.8 阶段过渡

`transitionToPhase2` 增加留任分支：

- 留任路径：`phase: 2`，不创建 `CompanyState`，改为创建 `ExecutiveState`
- 初始高管属性：部门业绩=50、董事会支持率=40、团队忠诚度=60、政治资本=20、公司股价=AI生成
- 进入"高管就任"关键期（3天），处理权力交接、团队重组

---

## 二、麦麦匿名发帖机制

### 2.1 核心定位

麦麦从纯被动信息展示升级为玩家可主动参与的匿名社交平台。玩家可以自由输入任何内容发帖，也可以点赞、评论其他帖子。所有互动的后果由 AI 分析内容后动态决定。

### 2.2 发帖规则

- 不消耗体力，在手机面板随时可操作
- 每季度限发 2 帖（关键期内不可发帖）
- 玩家打开麦麦 → 点击"发帖" → 自由输入文字内容 → 发布
- AI 在季度结算时分析帖子文本，自主判断其性质、影响范围和后果

### 2.3 互动：点赞与评论

AI 生成的帖子和玩家自己的帖子都会出现在麦麦信息流中。玩家可以：

| 操作 | 说明 | 限制 |
|------|------|------|
| 点赞 | 给帖子点赞，表达态度 | 每帖只能赞一次 |
| 评论 | 自由输入评论内容 | 每帖限评论1条 |

点赞和评论也会产生影响——你点赞了一条爆料公司的帖子，就等于站了队。

### 2.4 AI 处理流程

```
玩家发帖/互动
  → 存入 maimaiPosts / 更新互动数据
  → 季度结算时，事件 Agent 接收所有本季度麦麦活动：
      - 玩家原创帖（自由文本）
      - 玩家对哪些帖子点赞了
      - 玩家发的评论（自由文本）
  → 事件 Agent 分析内容语义，输出后果：
      {
        postResults: [{
          postId: "xxx",
          aiAnalysis: "玩家吐槽公司加班文化",
          viralLevel: "trending",
          consequences: {
            playerEffects: { reputation: +3, mood: +5 },
            companyEffects: { ... },
            npcReactions: [...],
            worldEffects: { ... },
            identityExposed: false,
            exposedTo: []
          },
          generatedReplies: [
            { sender: "匿名用户A", content: "深有同感..." },
            { sender: "匿名用户B", content: "这说的是XX公司吧？" }
          ]
        }],
        interactionResults: [{
          targetPostId: "yyy",
          type: "like" | "comment",
          consequences: { ... }
        }]
      }
  → 叙事 Agent 将麦麦动态编织进季度叙事
```

### 2.5 传播等级

AI 根据帖子内容的爆炸性、相关性、时机自主判断传播等级。没有硬编码概率，完全由 AI 决定：

| 传播等级 | 效果范围 |
|---------|---------|
| ignored（无人问津） | 几乎无影响，可能只有1-2条无关痛痒的回复 |
| small_buzz（小范围讨论） | 影响1-2个NPC，轻微属性变化，几条回复 |
| trending（公司内热帖） | 公司内热帖，影响公司状态、多个NPC反应，大量回复 |
| viral（全网爆火） | 影响行业趋势，可能触发关键期事件 |

### 2.6 身份暴露

由 AI 自主判断暴露风险，考虑因素：

- 帖子内容是否涉及只有少数人知道的信息
- 玩家声望高低（名人更容易被猜到）
- 评论/点赞是否暴露了立场
- 帖子是否与玩家最近的行为高度相关

暴露后果由 AI 决定严重程度：从"被同事私下猜到"到"被公司HR约谈"不等。

### 2.7 信息流 UI

```
┌──────────────────────────┐
│  麦麦  [发帖+]            │
├──────────────────────────┤
│ 匿名用户                  │
│ "听说XX公司年终奖缩水..."   │
│ 🔥 32赞  💬 8评论          │
│ [👍 点赞] [💬 评论]        │
├──────────────────────────┤
│ 我（匿名）                 │
│ "新来的领导天天开会..."     │
│ 🔥 128赞  💬 23评论        │
│ ↳ 匿名A: "深有同感"       │
│ ↳ 匿名B: "赶紧跑吧兄弟"   │
├──────────────────────────┤
│ 匿名用户                  │
│ "有个好消息，行业回暖了"    │
│ 👍 5赞  💬 1评论           │
│ [👍 点赞] [💬 评论]        │
└──────────────────────────┘
```

### 2.8 第二阶段特殊交互

- **创业路径**：可以发帖宣传自己产品（变相营销），但太明显会被嘲讽
- **留任高管路径**：麦麦是政治暗战的战场——匿名爆料政敌、试探舆论风向

---

## 三、跳槽机制

### 3.1 核心定位

跳槽是第一阶段的完整换公司体验——进入一个新的职场环境：新公司名、新行业状态、新 NPC 阵容、可能的职级跳升和薪资溢价。部分旧关系保留，但要在新环境重新建立根基。

### 3.2 跳槽流程

```
1. 投简历/被猎头联系
   ← 通过 job_interview 行动（3体力）或 HR直聘 收到猎头消息
   → 生成 Offer（公司名、职级、薪资、公司状况）

2. 收到 Offer
   ← 存入 HR直聘 消息 + jobOffers 列表，玩家可查看
   → 玩家选择：忽略 / 接受 / 谈判

3. 跳槽谈判关键期（选择"谈判"时触发，3天）
   ← 已有的 job_negotiation 关键期类型
   → 谈薪资、职级、期权等

4. 确认跳槽
   ← 接受 Offer 或谈判成功
   → 触发"入职新公司"过渡
   → 进入新公司入职关键期（3天）

5. 新公司状态生效
```

### 3.3 Offer 生成规则（硬规则）

**薪资溢价公式：**

- 基础溢价 = 当前薪资 × 1.15（15%起跳）
- 声望加成 = 声望 × 0.3%（声望80 → 额外+24%）
- 专业能力加成 = 专业能力 × 0.2%（专业80 → 额外+16%）
- 最大溢价上限 = 当前薪资 × 1.5（50%封顶）

**职级规则：**

- 大多数情况平级跳（同 Level）
- 满足下一级晋升条件 → 50% 概率升一级跳
- 不可能降级跳槽

**Offer 频率：**

- 每次 `job_interview` 行动有 60% 概率获得 Offer
- HR直聘被动收到猎头消息：每季度由事件 Agent 决定（受声望和人脉影响）
- 同时最多持有 2 个未过期 Offer

### 3.4 换公司时的状态变化

| 维度 | 变化 |
|------|------|
| 保留 | 所有属性值（健康/专业/沟通/管理/人脉/心情/金钱/声望） |
| 保留 | 绩效历史、项目计数 |
| 重置 | `quartersAtLevel` 归零（新公司任期重新计） |
| 更新 | `job.companyName`、`job.salary`、可能 `job.level` |
| NPC | 旧 NPC 标记 inactive，生成新 NPC 阵容 |
| 世界 | 新公司可能处于不同经营状态（AI 生成） |

### 3.5 NPC 过渡机制

**离开旧公司：**

- 所有旧公司 NPC 标记为 `isActive: false`
- 保留在 `npcs` 列表中，好感度不变
- 前同事可能偶尔通过小信联系你（AI 生成）
- 部分前同事将来可能出现在新公司（涌现剧情）

**进入新公司：**

- NPC Agent 生成 5 个新 NPC（角色配置）：
  - 1 个直属领导
  - 2-3 个同组/跨组同事
  - 1 个部门高管
  - 1 个辅助角色（行政/HR等）
- 新 NPC 初始好感度 = 50（中性起点）
- 声望影响初始态度：高声望可能让领导初始好感更高，但也引起同级竞争者警惕

### 3.6 新公司入职关键期

新增类型 `new_company_onboarding`，3天，比初始入职短：

| 行动类别 | 示例选项 |
|---------|---------|
| 适应 | "快速熟悉业务/向新同事请教/研究公司文档" |
| 社交 | "主动约同事午饭/参加团建/低调观察" |
| 表现 | "第一个项目全力以赴/提出改进建议/保持低调融入" |

### 3.7 跳槽的风险与代价

- 离开时若有未完成的重大项目 → 声望 -10
- 短期内频繁跳槽（3季度内再跳） → AI 生成"频繁跳槽者"标签，后续 Offer 质量下降
- 跳槽后前领导好感归零（觉得你背叛了他）
- 新公司可能暗藏问题（跳进去才发现是个坑）

### 3.8 与其他功能的交叉

- **麦麦**：跳槽后在麦麦发帖吐槽前公司，可能被前同事看到；晒 Offer 可能刺激前同事也跳槽
- **留任高管**：到达 L8 时如果持有外部 Offer，多一个选择——跳去另一家当高管

---

## 四、数据模型变更

### 4.1 新增类型

```typescript
// === 留任高管 ===

type ExecutiveStage = 'E1' | 'E2' | 'E3';

interface ExecutiveState {
  stage: ExecutiveStage;
  departmentPerformance: number;   // 0-100
  boardSupport: number;            // 0-100
  teamLoyalty: number;             // 0-100
  politicalCapital: number;        // 0-100
  stockPrice: number;              // 具体数字
  departmentCount: number;         // 管辖部门数
  consecutiveLowPerformance: number; // 连续低业绩季度
}

type ExecutiveAction =
  | 'push_business'
  | 'manage_board'
  | 'build_team'
  | 'political_maneuvering'
  | 'strategic_planning'
  | 'industry_networking'
  | 'rest';

// === 麦麦 ===

interface MaimaiPost {
  id: string;
  quarter: number;
  author: 'player' | 'anonymous';
  content: string;
  likes: number;
  playerLiked: boolean;
  comments: MaimaiComment[];
  viralLevel?: ViralLevel;
  identityExposed?: boolean;
}

interface MaimaiComment {
  id: string;
  author: 'player' | 'anonymous';
  content: string;
  authorName: string;
}

type ViralLevel = 'ignored' | 'small_buzz' | 'trending' | 'viral';

// === 跳槽 ===

interface JobOffer {
  id: string;
  companyName: string;
  companyProfile: string;
  offeredLevel: JobLevel;
  offeredSalary: number;
  companyStatus: 'expanding' | 'stable' | 'shrinking';
  expiresAtQuarter: number;
  negotiated: boolean;
}

interface PastJob {
  companyName: string;
  level: JobLevel;
  salary: number;
  startQuarter: number;
  endQuarter: number;
  reasonLeft: 'job_hop' | 'startup' | 'fired' | 'executive';
}
```

### 4.2 GameState 扩展

```typescript
interface GameState {
  // ...existing fields

  // 留任高管（第二阶段，与 company 互斥）
  executive: ExecutiveState | null;

  // 麦麦（独立于 phoneMessages）
  maimaiPosts: MaimaiPost[];
  maimaiPostsThisQuarter: number;  // 本季度已发帖数

  // 跳槽
  jobOffers: JobOffer[];
  jobHistory: PastJob[];
}
```

### 4.3 CareerPath 扩展

```typescript
type CareerPath = 'undecided' | 'tech' | 'management' | 'executive';
```

### 4.4 CriticalPeriodType 扩展

```typescript
type CriticalPeriodType =
  | ...existing
  | 'new_company_onboarding'  // 跳槽后新公司入职
  | 'board_review'            // 董事会审查
  | 'power_struggle'          // 权力斗争
  | 'major_decision'          // 重大决策
  | 'power_transition';       // 权力交接（E3晋升）
```

### 4.5 Phase2Path 类型

```typescript
type Phase2Path = 'startup' | 'executive';
```

`GameState` 可通过 `company !== null` 判断创业路径，`executive !== null` 判断留任路径。两者互斥。

---

## 五、Agent 接口变更

### 5.1 事件 Agent 输出扩展

新增麦麦后果输出：

```typescript
interface EventAgentOutput {
  // ...existing
  maimaiResults?: {
    postResults: Array<{
      postId: string;
      aiAnalysis: string;
      viralLevel: ViralLevel;
      consequences: {
        playerEffects?: Partial<PlayerAttributes>;
        companyEffects?: Partial<{ companyStatus: string }>;
        executiveEffects?: Partial<ExecutiveState>;
        npcReactions?: Array<{ npcName: string; favorChange: number }>;
        worldEffects?: { triggerEvent?: string };
        identityExposed: boolean;
        exposedTo: string[];
      };
      generatedReplies: Array<{ sender: string; content: string }>;
    }>;
    interactionResults: Array<{
      targetPostId: string;
      type: 'like' | 'comment';
      consequences: {
        playerEffects?: Partial<PlayerAttributes>;
        npcReactions?: Array<{ npcName: string; favorChange: number }>;
      };
    }>;
  };
}
```

### 5.2 Agent 输入扩展

Agent 共享输入新增：

```typescript
interface AgentInput {
  state: GameState;  // 已包含 executive、maimaiPosts、jobOffers、jobHistory
  recentHistory: QuarterSummary[];
  // 新增
  maimaiActivity?: {
    playerPosts: MaimaiPost[];      // 本季度玩家发的帖
    playerLikes: string[];          // 本季度玩家点赞的帖子ID
    playerComments: Array<{         // 本季度玩家的评论
      postId: string;
      content: string;
    }>;
  };
}
```

### 5.3 关键期行动约束模板扩展

```typescript
const CRITICAL_PERIOD_CATEGORIES = {
  // ...existing
  new_company_onboarding: ['适应', '社交', '表现'],
  board_review: ['汇报', '拉票', '甩锅'],
  power_struggle: ['结盟', '反击', '妥协'],
  major_decision: ['分析', '推动', '风控'],
  power_transition: ['布局', '造势', '谈判'],
};
```

---

## 六、存档兼容性

版本号从 `"1.0"` 升级为 `"1.1"`。迁移函数处理：

- 新增 `executive: null`
- 新增 `maimaiPosts: []`、`maimaiPostsThisQuarter: 0`
- 新增 `jobOffers: []`、`jobHistory: []`
- 已有的 `phoneMessages` 中 maimai 类型消息保留不变（向后兼容）
