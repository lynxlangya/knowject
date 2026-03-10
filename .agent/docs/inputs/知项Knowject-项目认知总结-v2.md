# 知项 · Knowject 项目认知总结 v2

> 基于完整沟通过程 + 最新前端界面的全景梳理  
> 更新日期：2026-03-09  
> 相较 v1 的核心变化：引入全局资产三层架构、明确技能/智能体定义、成员页 MVP 范围收敛

---

## 一、产品定位

### 一句话定位

> 知项 · Knowject 是一个面向开发团队的项目级 AI 知识助手，目标是把文档、代码与设计上下文沉淀成可持续复用的项目记忆，让查询、理解与协作建立在真实项目语境之上。

### 核心价值

不是又一个 AI 聊天工具，而是**真正懂你项目的 AI 知识助手**。

现有 AI 工具能力足够强，但不了解项目上下文，每次提问都要手动粘贴大量背景。知项 · Knowject 把文档、代码与设计上下文沉淀成可持续复用的项目记忆，让查询、理解与协作建立在真实项目语境之上。

---

## 二、解决什么问题

**痛点一：信息极度分散**

```
需求文档  →  飞书 / Confluence
设计稿    →  Figma
代码      →  Git 仓库
讨论决策  →  群聊 / 会议记录
任务进展  →  Jira / 禅道
```

没有一个地方能完整回答"这个需求的上下文是什么"。

**痛点二：知识传递依赖人**

新人入项目靠老人口口相传，老人离职项目知识跟着消失，跨团队协作重复解释同样的背景。

**痛点三：AI 工具缺乏项目上下文**

通用 AI 能力再强，也不了解你的业务逻辑和技术决策历史，问具体问题还要手动粘贴大量背景。

**痛点四：可复用资产重复建设**（v2 新增）

代码规范、品牌文档、通用工具链，每个项目单独维护一份，更新不同步，质量参差不齐。

---

## 三、目标用户

**5 - 20 人的中小型软件开发团队**

```
公司类型：有自研产品的科技公司，或承接软件项目的乙方团队

团队构成：
├── 前端 / 后端 / 全栈开发  →  核心用户，使用最高频
├── 产品经理                →  需求上下文查询
└── 设计师                  →  设计规范一致性确认

为什么是这个群体：
├── 1-3 人团队    →  痛点不够强，不需要这个工具
├── 100+ 人团队   →  采购链条长，MVP 阶段打不进去
└── 5-20 人       →  痛点最真实，技术负责人一人拍板就能用
```

---

## 四、产品三层架构（v2 核心变化）

这是 v2 最重要的设计决策，引入了全局资产层。

```
┌─────────────────────────────────────────────┐
│                  全局层（公司级）              │
│                                              │
│   全局知识库      全局技能       全局智能体    │
│   跨项目共享      可复用工具     预配置Agent  │
│   的文档/代码     Function       实例，可被   │
│   资产库         Calling 集合   项目引入      │
└──────────────────────┬──────────────────────┘
                       │ 按需引入（绑定）
┌──────────────────────▼──────────────────────┐
│                  项目层（项目级）              │
│                                              │
│  项目私有知识库   已引入的技能   已引入的智能体 │
│  + 引入的全局     + 项目配置     + 项目配置    │
│  知识资产         的 Prompt      的 Prompt    │
└──────────────────────┬──────────────────────┘
                       │
┌──────────────────────▼──────────────────────┐
│                  对话层（用户级）              │
│                                              │
│         基于项目完整上下文的多轮对话           │
│    知识库检索 + 技能调用 + 智能体推理          │
└─────────────────────────────────────────────┘
```

### 为什么这个三层设计是对的

```
没有全局层（旧设计）：
代码规范文档  →  A项目维护一份
              →  B项目维护一份（可能已过期）
              →  C项目维护一份（和A不一致）

有了全局层（新设计）：
代码规范文档  →  全局维护一份，所有项目引入同一份
              →  更新一次，所有项目同步生效
```

---

## 五、核心概念定义

### 5.1 知识库（Knowledge）

```
本质：RAG 的数据来源
内容：文档（PDF/Word/Markdown）+ 代码库（Git 仓库）
作用：向量化存储，供 AI 检索作为回答依据
层级：全局知识库（跨项目共享）/ 项目私有知识库

典型示例：
├── 移动端 UI 规范（全局）     →  设计规范，多项目通用
├── 品牌资产库（全局）         →  品牌文案和视觉规范
└── 营销宝开发迭代计划（项目）  →  仅属于当前项目
```

### 5.2 技能（Skill）

```
本质：封装好的能力单元，供大模型在适当时机自主调用，完成对应任务
作用：让 AI 具备超出"回答问题"的主动执行能力
关键：AI 自主判断何时需要调用哪个 Skill，调用后将结果纳入推理继续生成

Skill 不仅仅是 Function Calling，实现形式可以多样：
├── Function Calling   →  调用本地函数执行具体逻辑
├── API 调用           →  调用外部服务获取数据
├── 深度 RAG 检索      →  针对特定知识域的增强检索
├── 代码执行           →  运行脚本并返回执行结果
└── 工作流触发         →  触发一段自动化流程

Skill 的来源三种：
├── 用户自己创建       →  针对自身业务场景定制
├── 全局共享           →  公司内部公共 Skill 库，团队沉淀复用
└── 公网引入           →  类似插件市场，引入外部社区的 Skill

层级：全局 Skill（跨项目可复用）/ 项目层按需启用绑定

典型示例：
├── 搜索代码库      →  在当前项目代码中检索相关实现（Function Calling）
├── 查询 Git 日志   →  分析某文件或模块的变更历史（Function Calling）
├── 路由设计规范    →  深度检索路由架构知识库，给出规范建议（深度 RAG）
├── 接口契约治理    →  调用接口文档 API，检查字段稳定性（API 调用）
└── 生成测试用例    →  基于需求文档运行生成脚本（代码执行）
```

**Skill 与 Agent 的关系（核心边界）**

```
Skill   →  单一能力单元，完成一个具体任务，无状态，是"执行者"
Agent   →  多个 Skill + 知识库 + System Prompt 的组合体，有角色，是"调度者"

Agent 在推理过程中，自主决策：
"我需要搜索代码库"  →  调用 搜索代码库 Skill
"我需要查变更历史"  →  调用 Git 日志 Skill
"我需要查接口规范"  →  调用 接口契约治理 Skill
多个 Skill 协同完成一个复杂任务，结果汇入 Agent 继续推理生成最终回答
```

### 5.3 智能体（Agent）

```
本质：配置好的 Agent 实例，是知识库 + 技能 + System Prompt 的组合
作用：预设特定场景下的 AI 角色，开箱即用
层级：全局智能体（可复用）/ 项目引入（按需绑定）

典型示例：
├── 需求分析 Agent   →  专注需求理解和拆解
├── 代码审查 Agent   →  专注代码质量和规范检查
├── 项目助理 Agent   →  通用项目问答（每个项目默认创建）
└── 接口设计 Agent   →  专注 API 设计和契约治理

一个智能体的完整配置：
{
  name: "代码审查 Agent",
  systemPrompt: "你是一个严格的代码审查员...",
  boundSkills: ["search_codebase", "check_git_log"],
  boundKnowledge: ["代码规范库", "架构决策记录"],
  model: "gpt-4o"
}
```

### 5.4 三者关系

```
对话时的调用链：

用户提问
    ↓
智能体（Agent）收到问题
    ↓
    ├── 调用知识库（RAG 检索相关文档/代码）
    └── 调用技能（Function Calling 执行具体操作）
    ↓
组装上下文 + System Prompt
    ↓
调用 LLM 生成回答
    ↓
SSE 流式输出 + 来源引用
```

---

## 六、使用场景

**场景一：新人快速上手**
新成员加入项目，直接问项目助理 Agent 了解技术架构、模块设计、历史决策，AI 基于项目知识库实时回答，无需占用老人时间。

**场景二：需求理解与拆解**
产品发来新需求，问"这个需求会影响哪些现有模块"，需求分析 Agent 结合 PRD 文档和代码库给出有依据的分析。

**场景三：代码上下文查询**
接手遗留代码，问"这个函数为什么这样设计"，AI 调用 Git 日志技能分析变更历史，结合架构文档回答。

**场景四：跨项目规范复用**
设计规范更新后，更新全局知识库中的规范文档，所有绑定了该知识库的项目 Agent 立即感知到最新规范，无需各项目单独同步。

**场景五：专项 Agent 协作**
代码提交前调用代码审查 Agent，Agent 自动调用代码库搜索技能，结合代码规范知识库给出具体的审查意见。

---

## 七、产品形态与页面结构

### 当前决策

```
形态：Web 应用（浏览器访问）
部署：私有化部署（docker-compose 一键启动）
后续：第三阶段考虑 Electron 客户端（复用 Web 代码）
```

### 页面结构

```
全局层页面（左侧导航）
├── /                      主页（项目列表）
├── /knowledge             全局知识库管理
├── /skills                全局技能管理
├── /agents                全局智能体管理
├── /members               全局成员管理
├── /analytics             分析看板（第二阶段）
└── /settings              全局设置

项目层页面（进入项目后）
├── /projects/:id          项目概览
├── /projects/:id/chat     对话（项目 Tab）
├── /projects/:id/resources 资源（引入的全局资产 + 私有知识库）
└── /projects/:id/members  成员（MVP 简化版）
```

### 当前已实现的页面评估

```
项目概览页   ✅  信息卡片清晰，快捷操作合理，整体布局很好
资源页       ✅  全局资产分类展示（知识库/技能/智能体）结构清晰
成员页       ✅  视觉设计超预期，MVP 阶段简化数据即可
对话页       ⚠️  对话列表已有，右侧空状态需要改成引导式
整体配色     ✅  白色系，干净克制，符合工具产品气质
产品命名     ⚠️  "Knowject" 需要重新考虑，读起来拗口
```

---

## 八、功能范围

### MVP 功能（第一阶段）

```
账号与权限
├── 注册 / 登录（JWT）
└── 创建项目、邀请成员（管理员 / 成员两个角色）

全局资产管理（基础版）
├── 全局知识库：创建、上传文档、接入本地 Git 仓库
├── 全局 Skill：内置 3 个核心 Skill，支持用户自建，暂不支持公网引入（MVP）
└── 全局智能体：创建、配置 System Prompt、绑定技能和知识库

项目管理
├── 创建项目（默认生成"项目助理 Agent"）
├── 引入全局资产（知识库 / 技能 / 智能体）
├── 项目私有知识库上传
└── 成员邀请（管理员 / 成员，角色简单两档）

对话
├── 项目内多轮对话
├── SSE 流式渲染
└── 回答附带知识来源引用

部署
└── docker-compose 一键启动
```

### 第二阶段

```
├── 模型可配置（OpenAI / Claude / DeepSeek / 通义切换）
├── GitHub / GitLab OAuth 接入
├── Figma REST API 接入
├── Skill 公网引入（类插件市场，引入外部社区 Skill）
├── Skill 更多实现类型开放（API 调用 / 代码执行 / 工作流触发）
├── 成员页完整协作状态（最近动作 / 活跃状态）
└── 分析看板（对话频次 / 知识库命中率）
```

### 第三阶段

```
├── MCP 协议支持（Figma MCP / 自定义 MCP Server）
├── 飞书 / 企业微信 / 钉钉 Bot 集成
└── Electron 客户端
```

### MVP 明确不做

```
❌ 模型可配置界面         →  先写死，第二阶段
❌ GitHub / GitLab 接入   →  OAuth 复杂，第二阶段
❌ Figma 接入             →  先支持上传 PDF 导出版本
❌ 公网 Skill 引入         →  第二阶段开放
❌ 高级 Skill 类型         →  API调用/代码执行/工作流，第二阶段
❌ 成员详细协作状态        →  MVP 只做邀请和角色，第二阶段
❌ 分析看板               →  第二阶段
❌ MCP 支持               →  第三阶段
```

---

## 九、技术架构

### 技术选型

```
前端层
├── React 18 + TypeScript
├── Tailwind CSS
├── Zustand（全局状态）
├── React Query（服务端状态 + 缓存）
└── Vercel AI SDK（流式对话 useChat hook）

服务端层
├── Node.js + Express
├── MongoDB（用户 / 项目 / 对话历史 / 权限 / 资产配置）
└── Chroma（向量数据库）

AI 层
├── Vercel AI SDK（主力：streamText / generateText / tool）
├── LangChain.js（按需：文档解析 / 文本切分）
└── 模型 MVP 先写死，第二阶段做可配置

数据接入层
├── 文档：pdf-parse / mammoth / 直接读取 Markdown
├── Git：simple-git（本地 MVP）→ GitHub/GitLab OAuth（第二阶段）
└── Figma：REST API（第二阶段）→ MCP（第三阶段）

部署层
└── docker-compose（Express + MongoDB + Chroma）
```

### 系统全景图

```
┌────────────────────────────────────────────────────┐
│                     用户浏览器                       │
│           React + TypeScript + Tailwind              │
│  概览 / 对话 / 资源管理 / 全局资产 / 成员管理         │
└──────────────────────┬─────────────────────────────┘
                       │ HTTPS / SSE
┌──────────────────────▼─────────────────────────────┐
│                Node.js + Express                    │
│                                                     │
│  Auth    Project   Knowledge   Chat    Agent        │
│  模块    模块      模块        模块    模块          │
│  JWT     CRUD      文档解析    SSE     RAG+工具调用  │
│  RBAC    权限      向量化      流式    Function      │
│                    Git读取     输出    Calling       │
└──────┬─────────────────────┬──────────────────────┬┘
       │                     │                      │
┌──────▼──────┐    ┌─────────▼──────┐   ┌──────────▼──────┐
│   MongoDB   │    │     Chroma     │   │   外部 AI API    │
│             │    │                │   │                  │
│ 用户/项目   │    │ global_docs    │   │ OpenAI / Claude  │
│ 对话历史    │    │ global_code    │   │ DeepSeek / 通义  │
│ 权限/配置   │    │ proj_{id}_docs │   │ MVP 先写死一个   │
│ 技能/智能体 │    │ proj_{id}_code │   │                  │
└─────────────┘    └────────────────┘   └─────────────────┘
```

---

## 十、数据模型设计

### 核心数据结构

```typescript
// 用户
interface User {
  _id: ObjectId;
  email: string;
  passwordHash: string;
  name: string;
  avatar?: string;
  role: "admin" | "member"; // 全局角色
}

// 全局知识库
interface GlobalKnowledge {
  _id: ObjectId;
  name: string;
  description: string;
  type: "document" | "git";
  indexStatus: "pending" | "processing" | "completed" | "failed";
  chunkCount: number;
  usedByProjects: number; // 被多少项目引用
  maintainer: string; // 维护方
  createdBy: ObjectId;
}

// 全局技能
interface GlobalSkill {
  _id: ObjectId;
  name: string;
  description: string;

  // Skill 实现类型
  type: "function_calling" | "api_call" | "deep_rag" | "code_exec" | "workflow";

  // Function Calling 类型：工具参数定义
  functionDef?: {
    name: string;
    description: string;
    parameters: JSONSchema;
  };

  // API 调用类型：外部服务配置
  apiConfig?: {
    endpoint: string;
    method: string;
    headers?: object;
  };

  // 来源
  source: "custom" | "global" | "public"; // 自建 / 全局共享 / 公网引入

  // 实际执行逻辑（内置 Skill 在后端实现，自定义 Skill 用户配置）
  handler: string;
  usedByProjects: number;
  createdBy: ObjectId;
}

// 全局智能体
interface GlobalAgent {
  _id: ObjectId;
  name: string;
  description: string;
  systemPrompt: string;
  boundSkillIds: ObjectId[];
  boundKnowledgeIds: ObjectId[];
  model?: string; // 第二阶段：可配置模型
  usedByProjects: number;
}

// 项目
interface Project {
  _id: ObjectId;
  name: string;
  description: string;
  avatar?: string;
  ownerId: ObjectId;

  // 引入的全局资产
  globalKnowledgeIds: ObjectId[];
  globalSkillIds: ObjectId[];
  globalAgentIds: ObjectId[];

  // 项目私有配置
  privateKnowledgeIds: ObjectId[];

  members: [
    {
      userId: ObjectId;
      role: "admin" | "member";
      joinedAt: Date;
    },
  ];
}

// 对话 & 消息
interface Conversation {
  _id: ObjectId;
  projectId: ObjectId;
  userId: ObjectId;
  agentId?: ObjectId; // 使用哪个 Agent 对话
  title: string;
  messageCount: number;
}

interface Message {
  _id: ObjectId;
  conversationId: ObjectId;
  role: "user" | "assistant";
  content: string;
  sources?: [
    {
      // 来源引用
      knowledgeId: ObjectId;
      documentName: string;
      chunkContent: string;
      score: number;
      type: "document" | "code";
    },
  ];
  toolCalls?: [
    {
      // 技能调用记录
      skillName: string;
      input: object;
      output: object;
    },
  ];
}
```

---

## 十一、AI 核心层设计

### Chroma 命名空间策略

```
全局知识库集合：
global_docs          →  全局文档资产
global_code          →  全局代码资产

项目知识库集合：
proj_{id}_docs       →  项目私有文档
proj_{id}_code       →  项目私有代码

检索时合并策略（项目对话时）：
├── 检索项目私有集合（proj_{id}_docs + proj_{id}_code）
├── 检索该项目已引入的全局知识库（global_docs 过滤 knowledgeId）
└── 合并结果，统一排序，过滤 score < 0.6
```

### 两套处理管道

**文档管道**

```
上传/接入 → 类型识别 → 内容提取
→ 文本清洗 → 智能分块（1000字符/200重叠，保留段落边界）
→ 向量化 → 存入 Chroma → 更新状态为 completed
```

**代码管道**（与文档不同，绝对不能混用）

```
读取 Git 仓库 → 文件过滤（include/exclude 规则）
→ 按函数/类级别切分（不按字符数）
→ 附加元数据（文件路径/行号/语言/函数名）
→ 向量化 → 存入 Chroma
```

### Agent 对话完整调用链

```typescript
async function runAgent(
  userMessage: string,
  project: Project,
  agent: GlobalAgent,
  conversationHistory: Message[],
) {
  // 1. RAG 检索（并行查项目私有 + 引入的全局知识库）
  const chunks = await retrieveFromProject(userMessage, project);

  // 2. 构建工具集（Agent 绑定的技能）
  const tools = buildTools(agent.boundSkillIds);

  // 3. 构建完整 System Prompt
  const systemPrompt = `
    ${agent.systemPrompt}

    ## 项目知识参考：
    ${formatChunks(chunks)}

    ## 回答要求：
    - 基于知识库内容回答，不要编造
    - 找不到相关内容时明确告知
    - 引用来源时注明文档名称
  `;

  // 4. 流式调用（Vercel AI SDK streamText）
  const result = await streamText({
    model: getModel(),
    system: systemPrompt,
    messages: formatHistory(conversationHistory),
    tools, // 技能作为 tools 传入
    maxToolRoundtrips: 3, // 允许多轮工具调用
    onChunk: ({ chunk }) => {
      // SSE 推送文本片段
    },
    onFinish: ({ text, toolCalls }) => {
      // 保存消息 + 工具调用记录
    },
  });

  return { content: result.text, sources: chunks, toolCalls: result.toolCalls };
}
```

### SSE 事件结构

```javascript
{ type: 'chunk',     content: '文本片段' }      // 实时推送
{ type: 'tool_call', skill: '路由设计', result } // 技能调用过程
{ type: 'sources',   sources: [...] }            // 来源引用
{ type: 'done' }                                 // 结束
{ type: 'error',     message: '错误信息' }       // 异常
```

---

## 十二、关键风险与应对

| 风险                        | 严重度 | 应对策略                                                       |
| --------------------------- | ------ | -------------------------------------------------------------- |
| RAG 检索质量差，AI 答非所问 | 高     | 展示来源引用；score < 0.6 丢弃；找不到时明确告知不乱编         |
| 代码切分破坏语义            | 高     | 按函数/类切分；保留文件路径和行号；chunk 间 200 字符重叠       |
| 全局资产和项目资产检索混乱  | 中     | Chroma 严格按命名空间隔离；检索时精确指定集合范围              |
| Skill 执行失败（任意类型）  | 中     | 每种 Skill 类型有独立 fallback；失败时明确告知用户而非静默忽略 |
| 大仓库处理时间长            | 中     | 异步处理 + 前端轮询状态；单文件 500KB / 单仓库 1000 文件限制   |
| API Key 安全                | 中     | AES-256 加密存储；只在服务端使用；日志屏蔽 Key                 |

---

## 十三、开发节奏建议

```
Week 1-2   基础框架
           ├── 前后端初始化 + docker-compose 跑通
           ├── 用户注册/登录（JWT）
           └── 项目 CRUD + 成员邀请

Week 3-4   全局资产基础
           ├── 全局知识库：文档上传 + 解析 + 向量化
           ├── Chroma 集成（global_docs / global_code）
           ├── 内置 Skill 定义（搜索代码库 / Git日志 / 全文搜索，共3个）
           └── 全局智能体：创建 + System Prompt + 绑定 Skill 和知识库配置

Week 5-6   项目层 + 资产引入
           ├── 项目引入全局资产（知识库/技能/智能体）
           ├── 本地 Git 仓库读取 + 代码管道
           └── 项目私有知识库

Week 7-8   对话核心
           ├── RAG 检索（全局 + 项目合并检索）
           ├── Agent 调用链（知识库 + 技能 + System Prompt）
           ├── SSE 流式对话
           └── 来源引用 + 技能调用展示

Week 9     打磨 + 部署
           ├── 错误处理完善
           ├── 知识库索引状态展示
           ├── docker-compose 部署验证
           └── 核心流程测试
```

---

## 十四、待明确的问题

以下问题还没有最终决策，需要在开发前确认：

```
1. 内置 Skill MVP 阶段做哪几个？
   建议优先实现：
   ├── 搜索代码库（Function Calling）  →  开发者最高频需求
   ├── 查询 Git 日志（Function Calling）→  理解代码变更历史
   └── 全文搜索文档（深度 RAG）         →  跨知识库精准检索
   这三个覆盖最核心场景，实现难度由低到高，可按序推进

2. 用户自建 Skill 的 MVP 范围？
   建议 MVP 支持：填写名称 + 描述 + 选择类型（先只开放 Function Calling）
   + 配置参数定义。复杂类型（API调用/代码执行）第二阶段再开放

2. 项目创建时默认 Agent 是怎样的？
   建议：默认创建一个"项目助理"Agent
   System Prompt 模板：引导用户填写项目背景和规范

3. 对话时用户如何选择用哪个 Agent？
   方案A：对话框顶部有 Agent 切换下拉（推荐）
   方案B：新建对话时选择 Agent

4. 全局智能体和项目 Agent 的关系？
   全局智能体：可被多项目引入的模板
   项目 Agent：引入后是否可以在项目层覆盖配置？
```

---

## 十五、简历价值

```
独立设计并实现知项 · Knowject —— 面向开发团队的项目级 AI 知识助手，把文档、代码与设计上下文沉淀成可持续复用的项目记忆

核心技术亮点：
├── 设计三层资产架构（全局层/项目层/对话层），实现知识资产跨项目复用
├── 基于 RAG 构建知识检索，文档与代码双管道处理，Chroma 多命名空间隔离
├── 设计多形态 Skill 体系（Function Calling / API调用 / 深度RAG / 代码执行），支持自建、全局共享与公网引入三种来源
├── Vercel AI SDK streamText 实现 SSE 流式输出，含来源引用可解释输出
├── 支持技能调用过程实时展示，对话链路完全透明可追溯
└── docker-compose 一键私有化部署，从 0 到 1 独立完成全栈开发
```

---

_v2 相较 v1 的核心变化：引入全局资产三层架构 / 重新定义 Skill 为多形态能力单元（不只是 Function Calling）/ 明确 Skill 三种来源（自建/全局/公网）/ 明确 Agent 与 Skill 的调度关系 / 成员页 MVP 收敛 / 开发节奏延长至 9 周_
