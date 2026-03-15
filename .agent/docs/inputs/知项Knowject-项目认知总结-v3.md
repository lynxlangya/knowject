# 知项 · Knowject 项目认知总结 v3

> 基于完整沟通过程 + 最新项目文档的全景梳理  
> 更新日期：2026-03-14  
> 相较 v2 的核心变化：引入独立 Python 索引服务层、更新实际落地技术栈、明确当前实现状态与未落地边界、修正路由命名、补充索引分层决策

---

## 〇、当前落地状态速查

> 这是 v3 新增的速查层，用于快速判断"现在哪里可以用、哪里还没有"。

```
已完全落地（可直接使用）
├── 登录 / 注册 / JWT 鉴权
├── 项目 CRUD / 项目成员管理
├── 全局成员概览
├── /knowledge 知识库 CRUD、文档上传、状态展示、最小轮询
├── /skills 正式 Skill 资产 CRUD、GitHub/URL 导入、草稿发布、绑定校验
├── /agents 正式 Agent CRUD、知识库 / Skill 绑定
├── global_docs 最小索引闭环（md / txt 上传 → 分块 → Chroma 写入）
├── 单文档 retry / delete
└── Python indexer 控制面（FastAPI + uv，/health + /internal/v1/index/documents）

部分落地（有基础，有边界）
├── 项目对话列表 / 详情读链路（已接后端，消息写侧未落地）
└── global_docs 检索（统一 service 已有，来源引用 UI 未落地）

明确未落地
├── 项目资源页 agents fallback 收口 + Skill / Agent 执行闭环
├── global_docs rebuild / diagnostics、知识库级重建
├── 项目私有知识库正式写入
├── global_code 真实 Git 导入与项目级合并检索
├── SSE 流式对话 + 来源引用渲染
└── Agent runtime（LLM 自主调用 Skill 编排链路）
```

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

**痛点四：可复用资产重复建设**

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

## 四、产品三层架构

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
内容：文档（PDF / Word / Markdown）+ 代码库（Git 仓库）
作用：向量化存储，供 AI 检索作为回答依据
层级：全局知识库（跨项目共享）/ 项目私有知识库

当前落地范围：
├── md / txt 已有完整上传 → 分块 → Chroma 写入闭环     ✅
├── 知识库 CRUD 与文档状态展示                          ✅
├── 单文档 retry / delete                              ✅
├── 知识库级 rebuild / diagnostics                     ⏳ 待落地
└── 项目私有知识库正式写入                              ⏳ 待落地

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

Skill 实现形式可以多样：
├── Function Calling   →  调用本地函数执行具体逻辑
├── API 调用           →  调用外部服务获取数据
├── 深度 RAG 检索      →  针对特定知识域的增强检索
├── 代码执行           →  运行脚本并返回执行结果
└── 工作流触发         →  触发一段自动化流程

Skill 的来源三种：
├── 用户自建           →  针对自身业务场景定制
├── 全局共享           →  公司内部公共 Skill 库，团队沉淀复用
└── GitHub / URL 导入  →  从公网引入外部社区的 Skill（当前已支持导入）

层级：全局 Skill（跨项目可复用）/ 项目层按需启用绑定

当前落地范围：
├── 全局 Skill CRUD / 草稿发布 / 绑定校验               ✅
├── GitHub / URL 导入                                   ✅
└── Skill / Agent 执行闭环（runtime）                    ⏳ 待落地
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

当前落地范围：
├── 全局 Agent CRUD / 知识库 + Skill 绑定校验            ✅
└── Agent runtime（LLM 自主调用 Skill 编排链路）          ⏳ 待落地

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
对话时的调用链（目标态）：

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

注：上述调用链是目标态。当前已完成资产层（知识库 / Skill / Agent 的配置与绑定），
    执行层（SSE / 来源引用 / Agent runtime）仍待落地。
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
仓库：pnpm workspace + Turborepo monorepo
部署：私有化部署（docker-compose 一键启动）
后续：第三阶段考虑 Electron 客户端（复用 Web 代码）
```

### 页面结构（当前实际路由）

```
全局层页面（左侧导航）
├── /login                  登录入口（固定，不新增 /register 路由）
├── /home                   登录后默认落点（项目列表）
├── /knowledge              全局知识库管理                ✅ 已接正式后端
├── /skills                 全局技能管理                  ✅ 已接正式后端
├── /agents                 全局智能体管理                ✅ 已接正式后端
├── /members                全局成员管理                  ✅ 已接正式后端
├── /analytics              分析看板（第二阶段）
└── /settings               全局设置

项目层页面（进入项目后）
├── /project/:projectId/overview    项目概览
├── /project/:projectId/chat        对话（列表读链路已通，消息写侧未落地）
├── /project/:projectId/chat/:chatId 对话详情
├── /project/:projectId/resources   资源（引入的全局资产 + 私有知识库）
└── /project/:projectId/members     成员

兼容入口（只做重定向，不应继续作为主路径扩展）
├── /workspace              → /home
├── /home/project/*         → /project/:projectId/*
└── /project/:projectId/knowledge|skills|agents
                            → /project/:projectId/resources?focus=*
```

### 当前已实现的页面评估

```
项目概览页      ✅  信息卡片清晰，快捷操作合理
全局知识库页    ✅  CRUD、上传、状态展示、最小轮询已接正式后端
全局技能页      ✅  CRUD、导入、草稿发布已接正式后端
全局智能体页    ✅  CRUD、绑定校验已接正式后端
成员页          ✅  视觉设计超预期，已接正式后端
项目对话页      ⚠️  列表读链路已通，消息写链路 / SSE 未落地
项目资源页      ⚠️  agents fallback 尚未收口
整体配色        ✅  白色系，干净克制，符合工具产品气质
```

---

## 八、功能范围

### MVP 功能（第一阶段）

```
账号与权限                                               状态
├── 注册 / 登录（JWT + argon2id）                        ✅
└── 创建项目、邀请成员（管理员 / 成员两个角色）             ✅

全局资产管理
├── 全局知识库：创建、上传文档（md/txt）、索引状态展示       ✅ 最小闭环
├── 全局知识库：PDF/Word 解析、知识库级重建、diagnostics    ⏳
├── 全局 Skill：CRUD、GitHub/URL 导入、草稿发布、绑定校验   ✅
└── 全局智能体：创建、配置 System Prompt、绑定技能和知识库   ✅

项目管理
├── 创建项目 / 项目 CRUD                                  ✅
├── 引入全局资产（知识库 / 技能 / 智能体）                 ✅ 资源绑定已落地
├── 项目私有知识库上传                                     ⏳
└── 成员邀请（管理员 / 成员，角色简单两档）                 ✅

对话
├── 项目内对话列表 / 详情读链路                            ✅
├── 对话消息写链路                                        ⏳
├── SSE 流式渲染                                          ⏳
└── 回答附带知识来源引用                                   ⏳

部署
└── docker-compose 一键启动（已有基线）                    ✅
```

### 第二阶段

```
├── 模型可配置（OpenAI / Claude / DeepSeek / 通义切换）
├── GitHub / GitLab OAuth 接入（global_code 真实 Git 导入）
├── Figma REST API 接入
├── Skill 更多实现类型开放（API 调用 / 代码执行 / 工作流触发）
├── global_docs rebuild / diagnostics 完整运维能力
├── 项目级知识库与项目级合并检索
├── 成员页完整协作状态（最近动作 / 活跃状态）
└── 分析看板（对话频次 / 知识库命中率）
```

### 第三阶段

```
├── MCP 协议支持（Figma MCP / 自定义 MCP Server）
├── 飞书 / 企业微信 / 钉钉 Bot 集成
└── Electron 客户端
```

### 明确不做（当前阶段）

```
❌ 模型可配置界面                →  先写死，第二阶段
❌ GitHub / GitLab 接入           →  OAuth 复杂，第二阶段
❌ Figma 接入                     →  先支持上传 PDF 导出版本
❌ 高级 Skill 类型（API/代码执行）  →  第二阶段开放
❌ 成员详细协作状态                →  MVP 只做邀请和角色
❌ 分析看板                        →  第二阶段
❌ MCP 支持                        →  第三阶段
❌ global_code 真实 Git 导入       →  第二阶段
❌ 项目私有知识库正式写入           →  第二阶段
❌ SSE / 来源引用 / Agent runtime  →  当前阶段下一优先级
```

---

## 九、技术架构

### 技术选型（当前实际）

```
仓库结构
└── pnpm workspace + Turborepo monorepo

前端层（apps/platform）
├── React 19 + TypeScript
├── Vite 7
├── Ant Design 6
├── Tailwind CSS 4
└── packages/request（Axios 封装）/ packages/ui（通用 UI 组件）

后端层（apps/api）
├── Node.js + Express 4 + TypeScript
├── MongoDB Node.js Driver（业务主数据库）
└── JWT（HS256）+ argon2id

索引层（apps/indexer-py）               ← v3 新增独立服务层
├── Python + FastAPI + uv
├── 当前内部写侧入口：POST /internal/v1/index/documents
├── 运维探活：GET /health
├── 内部文档：/docs / /redoc / /openapi.json
└── 覆盖：parse / clean / chunk / embed / upsert / delete

向量数据库
└── Chroma（知识索引层 / 检索层，非业务主数据库）

AI / Embedding
├── OpenAI（provider 固定）
├── model：text-embedding-3-small（固定）
└── 开发环境缺 OPENAI_API_KEY 时：退化为 deterministic 本地 embedding

部署层
└── docker-compose（platform + api + indexer-py + mongodb + chroma）
    线上加 caddy 做反向代理
```

> **v2 → v3 的核心变化**：v2 技术栈把文档解析、chunking、embedding 全部放在 Node 层（并列举了 LangChain.js）。  
> 实际决策已冻结为 **Node 管业务主链路，Python 独立服务管索引处理链路**。  
> 这不是"全仓切 Python"，而是两层各司其职。

### 系统全景图（当前实际）

```
┌────────────────────────────────────────────────────────┐
│                       用户浏览器                         │
│         React 19 + Vite 7 + Ant Design 6 + Tailwind     │
│  /home / /knowledge / /skills / /agents / /members      │
│  /project/:id/overview|chat|resources|members           │
└────────────────────────┬───────────────────────────────┘
                         │ HTTPS / (SSE 待落地)
┌────────────────────────▼───────────────────────────────┐
│                  apps/api（Node.js + Express）           │
│                                                         │
│  auth      projects    members    knowledge             │
│  JWT       CRUD        overview   CRUD + 上传入口        │
│  argon2id  成员管理               状态查询              │
│                                   统一检索 service       │
│                                                         │
│  skills    agents      memory     （触发 Python indexer）│
│  资产治理  CRUD + 绑定  演示接口                         │
│  导入/发布 绑定校验                                      │
└────┬───────────────────────────────────┬───────────────┘
     │ 本地 HTTP                          │
     │ POST /internal/v1/index/documents  │
┌────▼──────────────────┐      ┌─────────▼──────────────┐
│   apps/indexer-py      │      │       MongoDB           │
│   Python FastAPI + uv  │      │                        │
│                        │      │  业务主数据             │
│  parse / clean / chunk │      │  用户 / 项目 / 成员     │
│  embed（OpenAI）       │      │  知识库元数据 / 文档记录 │
│  upsert / delete       │      │  索引状态 / 绑定关系    │
│  rebuild / retry       │      │  Skill / Agent 配置     │
│  diagnostics           │      │  对话列表（读链路已通）  │
└────────────┬───────────┘      └────────────────────────┘
             │ upsert / query
┌────────────▼───────────────────────────────────────────┐
│                        Chroma                           │
│                                                         │
│  global_docs           →  全局文档 chunks + embeddings  │
│  global_code           →  命名空间预留，真实导入待落地   │
│  （proj_{id}_docs/code  →  项目级，待落地）              │
└────────────────────────────────────────────────────────┘
```

### 索引分层的核心逻辑

```
为什么 Python 负责索引链路？
  真正复杂的地方不是"连接 Chroma"，而是：
  ├── 文档解析（PDF / Word / Markdown 不同格式）
  ├── 文本清洗
  ├── chunking（段落边界保留 / 代码按函数/类切分）
  ├── embedding 接入与批量重建
  └── 重试与诊断
  这些环节用 Python 生态处理比 Node 更自然。

为什么业务主链路保留在 Node？
  仓库已有稳定的 apps/api 基线（auth / projects / members / 错误处理 / env 管理），
  知识库 CRUD、文档记录、上传入口、状态查询、统一检索 API，
  以及 Skill / Agent 正式资产治理，留在 Node/Express 更一致。

固定边界：
  ├── MongoDB 业务状态只允许由 Node/Express 回写（Python 不直接写业务主状态表）
  ├── Skill 不直接操作 Chroma（只能调统一知识检索 service）
  └── MongoDB 是主数据源，Chroma 是衍生索引层
```

---

## 十、数据模型设计

### 核心数据结构（当前实际 + 目标态）

```typescript
// 用户
interface User {
  _id: ObjectId;
  username: string;
  passwordHash: string; // argon2id，不存明文
  name: string;
  avatar?: string;
  role: "admin" | "member";
}

// 全局知识库
interface Knowledge {
  _id: ObjectId;
  name: string;
  description: string;
  type: "document" | "git";
  createdBy: ObjectId;
  usedByProjects: number;
}

// 文档记录（含索引状态机）
interface KnowledgeDocument {
  _id: ObjectId;
  knowledgeId: ObjectId;
  name: string;
  status: "pending" | "processing" | "completed" | "failed"; // 状态机
  // 索引追踪字段（v3 新增）
  documentVersionHash?: string;
  embeddingProvider?: string;   // "openai" | "local_deterministic"
  embeddingModel?: string;      // "text-embedding-3-small"
  lastIndexedAt?: Date;
  retryCount: number;
  errorMessage?: string;
}

// 全局技能
interface Skill {
  _id: ObjectId;
  name: string;
  description: string;
  type: "function_calling" | "api_call" | "deep_rag" | "code_exec" | "workflow";
  source: "custom" | "global" | "public";
  status: "draft" | "published";
  functionDef?: { name: string; description: string; parameters: JSONSchema };
  apiConfig?: { endpoint: string; method: string; headers?: object };
  handler: string;
  usedByProjects: number;
  createdBy: ObjectId;
}

// 全局智能体
interface Agent {
  _id: ObjectId;
  name: string;
  description: string;
  systemPrompt: string;
  boundSkillIds: ObjectId[];
  boundKnowledgeIds: ObjectId[];
  model?: string;
  usedByProjects: number;
  createdBy: ObjectId;
}

// 项目
interface Project {
  _id: ObjectId;
  name: string;
  description: string;
  avatar?: string;
  ownerId: ObjectId;
  globalKnowledgeIds: ObjectId[];
  globalSkillIds: ObjectId[];
  globalAgentIds: ObjectId[];
  privateKnowledgeIds: ObjectId[]; // 待落地
  members: Array<{
    userId: ObjectId;
    role: "admin" | "member";
    joinedAt: Date;
  }>;
}

// 对话 & 消息（读链路已通，写链路待落地）
interface Conversation {
  _id: ObjectId;
  projectId: ObjectId;
  userId: ObjectId;
  agentId?: ObjectId;
  title: string;
  messageCount: number;
}

interface Message {
  _id: ObjectId;
  conversationId: ObjectId;
  role: "user" | "assistant";
  content: string;
  sources?: Array<{         // 来源引用，待落地
    knowledgeId: ObjectId;
    documentName: string;
    chunkContent: string;
    score: number;
    type: "document" | "code";
  }>;
  toolCalls?: Array<{       // Skill 调用记录，待落地
    skillName: string;
    input: object;
    output: object;
  }>;
}
```

### Chroma metadata 最小字段

```
每个 chunk 写入 Chroma 时附带：
├── knowledgeId    →  关联知识库
├── documentId     →  关联文档记录
├── type           →  "document" | "code"
├── source         →  原始文件名 / 路径
├── chunkIndex     →  第几个 chunk
└── chunkId        →  唯一 chunk 标识
```

---

## 十一、AI 核心层设计

### Chroma 命名空间策略

```
已落地：
global_docs          →  全局文档资产（md/txt 最小闭环已验证）

命名空间预留（真实导入待落地）：
global_code          →  全局代码资产
proj_{id}_docs       →  项目私有文档
proj_{id}_code       →  项目私有代码

检索时合并策略（目标态，项目对话时）：
├── 检索项目私有集合（proj_{id}_docs + proj_{id}_code）
├── 检索该项目已引入的全局知识库（global_docs 过滤 knowledgeId）
└── 合并结果，统一排序，过滤 score < 0.6
```

### 索引处理管道（由 apps/indexer-py 负责）

**文档管道（当前已落地）**

```
上传/接入 → 类型识别 → 内容提取（md/txt 已通，PDF/Word 待扩展）
→ 文本清洗 → 智能分块（1000字符/200重叠，保留段落边界）
→ embedding（text-embedding-3-small，开发态可退化为 deterministic）
→ upsert 到 Chroma → 结果交回 Node → Node 回写状态
```

**代码管道（命名空间预留，真实导入待落地）**

```
读取 Git 仓库 → 文件过滤（include/exclude 规则）
→ 按函数/类级别切分（不按字符数，与文档管道严格隔离）
→ 附加元数据（文件路径/行号/语言/函数名）
→ embedding → upsert 到 Chroma
```

### 最小调用链（当前已落地的闭环路径）

```
1. 用户通过前端上传文档
2. apps/api 创建 knowledge/document 元数据记录
3. 文档状态初始化为 pending
4. Node 保存文件到本地存储
5. Node 调 Python POST /internal/v1/index/documents
6. Python 解析、清洗、分块、embedding、写入 Chroma
7. Python 把结果交回 Node
8. Node 回写 processing / completed / failed
9. Node 统一知识检索 service 查询 Chroma
10. search_documents Skill 只能调统一知识检索 service，不能自己直连 Chroma
```

### Agent 对话调用链（目标态，执行层待落地）

```typescript
async function runAgent(
  userMessage: string,
  project: Project,
  agent: Agent,
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

  // 4. 流式调用
  const result = await streamText({
    model: getModel(),
    system: systemPrompt,
    messages: formatHistory(conversationHistory),
    tools,
    maxToolRoundtrips: 3,
    onChunk: ({ chunk }) => { /* SSE 推送文本片段 */ },
    onFinish: ({ text, toolCalls }) => { /* 保存消息 + 工具调用记录 */ },
  });

  return { content: result.text, sources: chunks, toolCalls: result.toolCalls };
}
```

### SSE 事件结构（目标态）

```javascript
{ type: 'chunk',     content: '文本片段' }
{ type: 'tool_call', skill: '路由设计', result }
{ type: 'sources',   sources: [...] }
{ type: 'done' }
{ type: 'error',     message: '错误信息' }
```

---

## 十二、关键风险与应对

| 风险 | 严重度 | 应对策略 |
|------|--------|----------|
| RAG 检索质量差，AI 答非所问 | 高 | 展示来源引用；score < 0.6 丢弃；找不到时明确告知不乱编 |
| Node → Python 状态同步不一致（超时/崩溃/部分成功） | 高 | retryCount + errorMessage 字段已设计；补偿逻辑应在扩展文档类型前明确 |
| 代码切分破坏语义 | 高 | 按函数/类切分；保留文件路径和行号；文档/代码管道严格隔离 |
| 全局资产和项目资产检索混乱 | 中 | Chroma 严格按命名空间隔离；检索时精确指定集合范围 |
| Skill 执行失败 | 中 | 每种类型有独立 fallback；失败时明确告知用户而非静默忽略 |
| 大文件处理时间长 | 中 | 异步处理 + 前端轮询状态；单文件 500KB / 单仓库 1000 文件限制（目标） |
| 前端 Mock 数据历史缓存结构变更 | 中 | knowject_projects / knowject_project_resource_bindings 等历史 localStorage 键应尽早明确清理时机 |
| "最小闭环"边界蔓延 | 中 | rebuild/diagnostics、agents fallback 等应严格作为独立阶段推进，不随主链路顺带展开 |

---

## 十三、开发节奏

```
Week 1-2   基础框架                                        ✅ 已完成
           ├── 前后端初始化 + docker-compose 跑通
           ├── 用户注册/登录（JWT + argon2id）
           └── 项目 CRUD + 成员邀请

Week 3-4   全局资产基础                                    ✅ 主体已完成
           ├── 全局知识库：文档上传 + 索引状态展示
           ├── apps/indexer-py FastAPI + uv 落地
           ├── global_docs 最小索引闭环（md/txt → Chroma）
           ├── Skill CRUD / 导入 / 草稿发布 / 绑定校验
           └── Agent CRUD / 知识库 + Skill 绑定

Week 5-6   索引运维 + 项目层消费                           ⏳ 下一阶段
           ├── global_docs rebuild / diagnostics
           ├── 更多文档类型（PDF/Word 解析）
           ├── 项目资源页 agents fallback 收口
           └── 项目私有知识库上传正式落地

Week 7-8   对话核心                                        ⏳
           ├── 对话消息写链路
           ├── RAG 检索（全局 + 项目合并检索）
           ├── Agent 调用链（知识库 + 技能 + System Prompt）
           ├── SSE 流式对话
           └── 来源引用 + 技能调用展示

Week 9-10  Skill / Agent runtime + global_code             ⏳
           ├── LLM 自主调用 Skill 编排链路
           ├── local Git 仓库读取 + 代码管道
           └── 项目级合并检索

Week 11    打磨 + 部署
           ├── 错误处理完善
           ├── 知识索引运维能力（回滚 / 监控）
           └── 核心流程测试 + docker-compose 部署验证
```

---

## 十四、待明确的问题

```
1. 对话时用户如何选择用哪个 Agent？
   方案A：对话框顶部有 Agent 切换下拉（推荐）
   方案B：新建对话时选择 Agent

2. 全局智能体引入项目后，是否支持项目层覆盖配置？
   建议：引入后在项目层可以覆盖 System Prompt，
         但 Skill / 知识库绑定以全局配置为基础叠加

3. 内置 Skill MVP 阶段最终做哪几个？
   建议优先实现：
   ├── 搜索代码库（Function Calling）  →  开发者最高频需求
   ├── 查询 Git 日志（Function Calling）→  理解代码变更历史
   └── 全文搜索文档（深度 RAG）         →  跨知识库精准检索

4. Node → Python 超时 / 部分成功时的补偿逻辑具体怎么设计？
   这个问题需要在扩展文档类型之前明确，否则状态机一致性难以保证。
```

---

## 十五、简历价值

```
独立设计并实现知项 · Knowject —— 面向开发团队的项目级 AI 知识助手，
把文档、代码与设计上下文沉淀成可持续复用的项目记忆

核心技术亮点：
├── 设计三层资产架构（全局层/项目层/对话层），实现知识资产跨项目复用
├── 设计并落地"Node 管业务主链路 + Python 独立索引服务"分层架构（FastAPI + uv）
├── 基于 RAG 构建知识检索，文档与代码双管道处理，Chroma 多命名空间隔离
├── 设计多形态 Skill 体系（Function Calling / API调用 / 深度RAG / 代码执行）
    支持自建、全局共享与 GitHub/URL 导入三种来源
├── SSE 流式输出含来源引用可解释输出（待落地，架构已设计）
├── pnpm workspace + Turborepo monorepo，多服务本地联调与容器化部署
└── docker-compose 一键私有化部署，从 0 到 1 独立完成全栈开发
```

---

_v3 相较 v2 的核心变化：新增当前落地状态速查层 / 引入独立 Python 索引服务（apps/indexer-py FastAPI + uv）/ 修正路由命名为 /project/:projectId（单数）/ 更新实际技术栈（React 19 + Vite 7 + Ant Design 6 + pnpm workspace + Turborepo）/ 补充文档状态机字段和 Chroma metadata 最小字段 / 明确当前已落地边界与未落地边界 / 更新开发节奏以反映实际进度 / 精简待明确问题（已决策项已移除）_
