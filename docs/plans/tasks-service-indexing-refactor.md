# 服务端与索引架构重构任务拆解（Milestone 0-6，规划拆解）

状态：已完成（2026-03-18 已完成 Milestone 0 + 1 + 2 + 3 + 4 + 5 + 6）
优先级：P0
阶段：Node / Python / Database / Docker 协同重构
关联模块：`apps/api` / `apps/indexer-py` / `packages/request` / `docker` / `scripts` / MongoDB / Chroma / `docs`

当前结论：

- 这次重构不适合 big-bang，必须按“先护栏、再抽 seam、再调状态机、最后清 Docker 契约”的顺序推进。
- 最高收益点是 `knowledge` 链路，不是通用框架化。Node 的 [knowledge.service.ts](../../../apps/api/src/modules/knowledge/knowledge.service.ts) 与 Python 的 [pipeline.py](../../../apps/indexer-py/app/domain/indexing/pipeline.py) 是当前最重的复杂度中心。
- 数据库层的主问题不是命名，而是状态迁移、汇总策略、查询/索引错位和 Node / Python 对 Chroma 生命周期的重复认知。
- 项目对话应该先把 runtime / service 拆出来，再决定是否迁到独立 collection；不要第一步直接做数据迁移。
- Docker 拓扑本身基本正确，真正要优先收口的是 `env / secrets / compose flow / 脚本职责` 四条契约。
- 本轮重构明确不做：`BaseRepository`、通用 Router DSL、全仓命名大扫除、直接重写对外 API 路由族。

## 治理依赖

本计划的每一步都要明确对齐以下治理标准：

- `docs/standards/code-structure-governance.md`（结构治理）：该标准定义了何为巨石文件、职责失真、拆分例外等边界，Milestone 0-5 中 `knowledge.service.ts`、`pipeline.py`、`projects.service.ts`、`compose`/`scripts` 脚本等大体量文件的拆分必须先对照此标准的触发矩阵判断是否满足拆分条件并记录例外。
- `docs/standards/config-security-governance.md`（配置与安全）：所有与 Docker、Mongo、Chroma、env/secrets/env_FILE 的改动（特别是 Milestone 6 的契约收口）都要依此复核，含新增/internal 路由、health/check 手段，应记录风险、同步文档、并使用该标准里的文档同步点确认 `docker/README.md`、`docs/current/docker-usage.md` 等已更新。
- `docs/standards/review-checklist.md`（评审清单）：Node/Python/Docker 相关改动需走评审清单的结构治理、配置与安全、文档同步等 checkpoint；每次触发“巨石文件”/“core config change”/“Docker env change”都要在 PR 描述中对照 review checklist 勾选并说明处理结果，以避免漏掉关键治理项。

---

## 一、目标

本计划的目标不是“把服务端和索引系统重写一遍”，而是在不破坏当前正式链路的前提下，把最重的复杂度热点拆成可单独推进、可单独回滚的小任务包。

本计划结束时，至少要达到以下结果：

- Node `knowledge` 链路从“单体大 service + 大 client”拆成职责明确的应用层组件。
- Python indexer 从“单文件 pipeline”拆成可单测、可替换、可继续扩 parser/provider 的内部结构。
- `knowledge` 状态机从“读后判断再写”收口为更清晰的条件更新与受控汇总策略。
- Node / Python / MongoDB / Chroma 的边界更加稳定，不再继续扩大过渡期双重职责。
- 项目对话 runtime 从项目聚合主 service 中剥离，为后续消息持久化演进留出空间。
- Docker 与本地开发脚本的配置契约收口为单一真相源，降低环境漂移和运维认知成本。

## 二、事实基线

### 2.1 当前事实真相源文件

- `docs/current/architecture.md`
- `docs/contracts/chroma-decision.md`
- `apps/api/src/modules/knowledge/*`
- `apps/api/src/modules/projects/*`
- `apps/api/src/modules/settings/*`
- `apps/api/src/app/create-app.ts`
- `apps/indexer-py/app/domain/indexing/pipeline.py`
- `apps/indexer-py/app/api/routes/indexing.py`
- `apps/indexer-py/app/services/indexing_service.py`
- `docker/*`
- `compose.yml`
- `compose.local.yml`
- `compose.production.yml`
- `scripts/knowject.sh`

### 2.2 已确认事实（2026-03-18 深度扫描汇总）

- Node 复杂度最高的文件集中在：
  - `apps/api/src/modules/knowledge/knowledge.service.ts`（3249 行）
  - `apps/api/src/modules/knowledge/knowledge.search.ts`（741 行）
  - `apps/api/src/modules/projects/projects.service.ts`（1194 行）
  - `apps/api/src/modules/settings/settings.service.ts`（1063 行）
- Python 复杂度几乎全部压在 `apps/indexer-py/app/domain/indexing/pipeline.py`（907 行），而 route / service / schema 目前偏薄。
- `knowledge` 当前已存在 3 个明确的结构性问题：
  - 状态迁移缺少 compare-and-set 语义。
  - `syncKnowledgeSummaryFromDocuments()` 走全量回算热路径。
  - `recoverInterruptedKnowledgeTasks()` 启动时仍偏向全表扫描而非按状态恢复。
- Node 与 Python 都在用“列出所有 Chroma collections 再按 name 查找”的模式，versioned collection 增长后会线性放大成本。
- `projects` 模块当前同时承担项目聚合根和会话 runtime；这是合理的过渡实现，但不适合长期继续膨胀。
- `scripts/knowject.sh` 已经承担 env 同步、secret 引导、compose wrapper、端口探测和本地推荐开发流编排，多项职责叠在一起。
- Python 线当前唯一已执行的运行验证是：
  - `cd apps/indexer-py && uv run pytest tests`
  - 结果：27 个测试通过

### 2.3 当前明确缺口

- Node 缺少足够的 repository / router / `create-app` / `packages/request` 自动化护栏。
- Docker 层没有 compose smoke test，也没有对 `start-api.sh`、`knowject.sh` 的脚本级回归保护。
- Python 当前没有 Node -> Python request override 的跨边界集成验证。
- 当前还没有一套“重构前必须通过的最小命令矩阵”。

## 三、核心问题拆解

### 3.1 `knowledge` 是当前技术债中心

最深的结构债不在 `auth`、`members`、`skills`、`agents`，而在知识索引主链路：

- Node 侧同时负责可见性、namespace 状态、存储路径、Node -> Python 调用、diagnostics、search orchestration。
- Python 侧同时负责请求解析、文本处理、embedding、Chroma 访问、HTTP 重试和 diagnostics。
- Mongo 汇总与状态迁移还没有从 service 层真正下沉成受控 API。

### 3.2 边界没有错，但内部组织已经开始失真

- Node 继续写 Mongo 业务状态是对的。
- Python 继续负责解析、分块、embedding、Chroma 写删也是对的。
- 真正的问题是“职责在正确的一层，但该层内部缺少进一步分层”。

### 3.3 数据库问题是生命周期问题，不是命名问题

- Mongo collection 命名整体比较稳定。
- 现在更该优先处理的是状态条件更新、summary 增量维护、恢复链路查询、索引与查询匹配。
- 直接做“统一命名规范重写”收益很低。

### 3.4 项目对话是第二热点，但不应抢在知识链路前面

- `projects.service.ts` 里混合了项目 CRUD、资源绑定校验、会话标题策略、retrieval 编排和 LLM 调用。
- 这个问题真实存在，但其依赖的知识检索和 runtime contract 仍建立在 `knowledge` 链路上。
- 因此顺序必须是：先稳住知识链路，再拆项目对话 runtime。

### 3.5 Docker 当前更像“契约治理问题”

- Compose 分层总体是对的。
- 现在更大的问题是模板、脚本、`.env*` 和运行入口之间已经开始出现历史键漂移。
- 所以 Docker 应该放在最后一阶段，按契约收口而不是按镜像技巧优先。

## 四、影响文档

### 4.1 本次立刻需要同步的文档

- `docs/plans/tasks-service-indexing-refactor.md`
- `docs/README.md`
- `docs/current/architecture.md`
- `apps/indexer-py/README.md`

### 4.2 本次不需要同步的文档

- `docs/roadmap/*`
- `AGENTS.md`
- `.codex/README.md`
- `.codex/MIGRATION.md`
- `.codex/packs/chatgpt-projects/*`
- 根 `README.md`

### 4.3 判断依据

- 本轮计划最初只是新增执行计划，但 Milestone 3 的 Python indexer 拆分已经改变当前实现事实：`pipeline.py` 不再直接承载 parser / chunker / embedding / Chroma / diagnostics 细节，因此需要同步当前事实文档与 indexer README。
- `docs/README.md` 需要同步，是因为它本身维护 `plans/` 的阅读入口和索引。
- 上传包目录当前没有镜像这份计划，不需要派生同步。

## 五、范围

本计划要覆盖：

- Node 共享 util / contract 收口
- `knowledge` Node 应用层拆分
- Python indexer 内部分层
- Mongo 状态迁移 / 汇总 / 索引与查询优化
- 项目对话 runtime / service 拆分
- Docker / env / secrets / compose / script 契约治理

本计划暂不覆盖：

- 新的产品需求或 UI 功能
- 对外 API 路由族大改名
- `global_code` 真实导入链路
- `SSE`、Skill runtime、Agent 编排
- 第一步就把 conversation / message 迁成独立 collection
- 全仓库统一抽象框架、统一基类或大规模命名重写

## 六、前置假设与阶段冻结决策

### C1. 执行顺序冻结

- 固定按“护栏 -> 共享 util -> Node knowledge -> Python pipeline -> DB 状态优化 -> 项目对话 -> Docker 契约”推进。
- 不允许跳过护栏直接做大文件拆分。

### C2. 对外 contract 冻结

- `apps/api` 现有公开路由和响应形状在 Milestone 0-4 期间默认保持稳定。
- 若某一步必须改 contract，必须先补契约文档和调用方迁移计划，不能顺手改。

### C3. Node / Python 业务边界冻结

- Mongo 业务状态仍只允许 Node 回写。
- Python 不接管知识库 / 文档主状态表，不绕过 Node 写 Mongo。
- Node 可暂时保留 Chroma 读侧 query 例外，但要减少重复算法和重复 collection 解析逻辑。

### C4. 数据库策略冻结

- Mongo collection 命名本轮不做 sweeping rename。
- 第一优先级是条件更新、summary 策略和索引/查询匹配。
- conversation 拆 collection 只作为决策门，不作为默认首批实施项。

### C5. Docker 优先级冻结

- Docker 不抢占 `knowledge` 和 `pipeline` 主线。
- 只在前面阶段稳定后，再统一做 env / secrets / compose / script 收口。

## 七、执行总策略

本轮重构采用 strangler pattern，而不是大搬家：

- 先补护栏，再拆 seam。
- 先抽纯 helper 和 adapter，再抽 orchestration。
- 先保持 façade 不变，再逐步下沉内部职责。
- 每个 milestone 只解决一类问题，不把 Node、Python、DB、Docker 全混在一批。
- 每一批都要求：可单独提交、可单独回滚、可单独验证。

取舍依据：

- `Correctness` 和 `Maintainability` 优先于 `Minimal Diff`。
- 但在每个 milestone 内仍坚持最小可审阅改动，不做无关重构。

## 八、里程碑

### 里程碑 0：建立护栏与回归矩阵

- 目标：
  - 把当前关键链路固定成可验证清单，避免拆分时“以为没回归，实际上没人测”。
- 预期结果：
  - 形成 Node / Python / Docker 的最小命令矩阵和关键路径测试清单。
- 验证方式：
  - `apps/api` 最小测试入口
  - `cd apps/indexer-py && uv run pytest tests`
  - `docker compose ... config` dry-run

### 里程碑 1：收口共享 util 与 contract

- 目标：
  - 把低风险、高重复的 shared helper 先抽出来。
- 预期结果：
  - Node 不再重复写 `ObjectId` 解析、mutation guard、URL helper、OpenAI-compatible error normalize、API envelope shape。
- 验证方式：
  - Node 测试
  - TypeScript 编译

### 里程碑 2：拆 Node `knowledge` 应用层

- 目标：
  - 降低 `knowledge.service.ts` 和 `knowledge.search.ts` 的单体复杂度。
- 预期结果：
  - 形成 visibility、namespace-state、storage、index-orchestrator、diagnostics、search-client 的内部边界。
- 验证方式：
  - knowledge 相关测试
  - 关键上传 / retry / rebuild / diagnostics / search 回归

### 里程碑 3：拆 Python indexer 内部分层

- 目标：
  - 把 `pipeline.py` 从单体 orchestrator 拆成可维护模块。
- 预期结果：
  - schema/domain 不再双轨校验，Chroma / Embedding / Parser / Diagnostics 各自归位。
- 验证方式：
  - Python 全量测试
  - Node -> Python request override 关键路径验证

### 里程碑 4：优化数据库状态机与查询

- 目标：
  - 收口 `knowledge` 状态迁移和汇总策略。
- 预期结果：
  - 使用条件更新 API、增量 summary / reconcile、按状态恢复、修正索引与查询错位。
- 验证方式：
  - repository / service 测试
  - 并发与恢复场景回归

### 里程碑 5：拆项目对话 runtime

- 目标：
  - 把项目会话运行时从 `projects.service.ts` 主体中剥离。
- 预期结果：
  - 项目 CRUD 和会话 runtime 不再共处一个大 service。
- 验证方式：
  - conversation create / send / rename / delete 回归
  - retrieval / sources 回归

### 里程碑 6：收口 Docker 与运行契约

- 目标：
  - 统一 env / secrets / compose flow / script 约束。
- 预期结果：
  - 本地推荐流、完整容器流、生产流的入口和环境契约更加稳定，减少漂移。
- 验证方式：
  - compose config dry-run
  - 脚本 smoke
  - 文档一致性检查

## 九、详细任务拆解

### `SR-00` 冻结关键链路与命令矩阵

目标：先定义哪些行为绝不能在重构中回归。
主要文件：`docs/plans/tasks-service-indexing-refactor.md`、`apps/api/src/modules/knowledge/*.test.ts`、`apps/indexer-py/tests/*`、`scripts/verify-*`。
任务：整理 `knowledge upload / retry / rebuild / diagnostics / search`、`project conversation create / send`、`compose local config` 三组关键路径，并明确每条链路最小验证入口。
DoD：计划文档中固化“每个 milestone 开始前和结束后必须跑哪些验证”。
验证：形成命令矩阵并在后续任务中引用。
依赖：无。
风险 / 回滚：仅文档整理与测试补充，风险低。

### `SR-01` 补齐 Node `knowledge` 关键状态测试

目标：给 `knowledge` 重构最容易回归的状态流补护栏。
主要文件：`apps/api/src/modules/knowledge/knowledge.service.test.ts`、`apps/api/src/modules/knowledge/knowledge.search.test.ts`、必要时新增 repository 级测试文件。
任务：覆盖并发 retry / rebuild 冲突、summary 回滚洞、recovery 启动恢复、legacy delete fallback、namespace rebuild required 等高风险场景。
DoD：高风险状态流至少有可失败可通过的自动化验证，不再完全依赖 stub happy-path。
验证：`pnpm --filter api test -- knowledge` 或等价最小入口。
依赖：`SR-00`。
风险 / 回滚：测试会先暴露现存问题，允许先红后绿。

### `SR-02` 补齐 Node 轻量外围护栏

目标：为后续共享 util 和组装调整补最小测试基线。
主要文件：`apps/api/src/app/create-app.ts`、`packages/request/*`、`docker/api/start-api.sh`、`scripts/knowject.sh`。
任务：补 `create-app` 装配冒烟、`packages/request` envelope/unwrap 关键行为测试、脚本 dry-run 或静态 smoke。
DoD：后续抽 helper 和整理装配时，不会因为“外围没人测”放大回归风险。
验证：`pnpm --filter api test`、`pnpm --filter @knowject/request test` 或新增等价入口。
依赖：`SR-00`。
风险 / 回滚：可能需要先建立测试入口，再补断言。

### `SR-10` 抽出 Node 基础共享 util

目标：先消除低风险重复代码。
主要文件：`apps/api/src/lib/*`、`apps/api/src/modules/*/*.repository.ts`、`apps/api/src/modules/*/*.service.ts`。
任务：抽 `mongo-id`、mutation input guard、string array parser、route param helper 等小能力，替代多处重复实现。
DoD：`auth / projects / knowledge / skills / agents` 等模块不再各写一份同类 helper。
验证：Node 测试与 TypeScript 编译通过。
依赖：`SR-01`、`SR-02`。
风险 / 回滚：禁止顺手抽成通用业务框架。

### `SR-11` 收口 OpenAI-compatible / URL / error helper

目标：减少 Node 内部重复的远端调用样板。
主要文件：`apps/api/src/modules/projects/projects.service.ts`、`apps/api/src/modules/settings/settings.service.ts`、`apps/api/src/modules/knowledge/knowledge.search.ts`、`apps/api/src/lib/*`。
任务：抽统一 URL 组装、response body 解析、OpenAI-compatible 错误消息归一化 helper。
DoD：相同的 HTTP / error normalize 逻辑只保留一处来源。
验证：相关 service 测试通过。
依赖：`SR-10`。
风险 / 回滚：只抽纯 helper，不合并业务语义。

### `SR-12` 收口 API envelope contract

目标：让 `apps/api` 与 `packages/request` 对响应 envelope 的认知更一致。
主要文件：`apps/api/src/lib/api-response.ts`、`packages/request/src/types.ts`、`packages/request/src/client.ts`。
任务：对齐 `ApiEnvelope` 结构、unwrap 行为与错误提取策略，减少双份定义继续漂移。
DoD：响应 envelope 有单一 contract 来源，调用侧与服务端不再各自演化。
验证：request 包测试、api-response 测试通过。
依赖：`SR-11`。
风险 / 回滚：不得破坏现有前端调用模式。

### `SR-20` 拆 `knowledge` 可见性与 namespace 上下文

目标：先把 Node `knowledge` 中最纯、最稳定的业务判断切出来。
主要文件：`apps/api/src/modules/knowledge/knowledge.service.ts`、必要时新增 `knowledge.visibility.ts`、`knowledge.namespace.ts`。
任务：抽离 `requireVisibleKnowledge`、`requireKnowledgeInProject`、namespace descriptor / context resolve 等逻辑。
DoD：`knowledge.service.ts` 不再同时承载所有可见性与 namespace 解析细节。
验证：现有 knowledge 测试通过，新抽模块有最小单测。
依赖：`SR-10`。
风险 / 回滚：必须保持错误码和错误文案稳定。

### `SR-21` 拆 `knowledge` 存储与索引编排

目标：把文件落盘与 Node -> Python 编排从主 service 里切开。
主要文件：`apps/api/src/modules/knowledge/knowledge.service.ts`、必要时新增 `knowledge.storage.ts`、`knowledge.index-orchestrator.ts`。
任务：抽离 storage path 生成、文件写入/删除、indexer URL 组装、queue processing、queue rebuild。
DoD：上传文档和异步索引的流程由独立 orchestrator 负责，主 service 保留 façade。
验证：upload / retry / rebuild / delete 相关测试通过。
依赖：`SR-20`。
风险 / 回滚：`setImmediate` 异步编排最容易回归，需要重点回测。

### `SR-22` 拆 `knowledge` diagnostics / search client / recovery

目标：进一步降低 Node `knowledge` 大文件复杂度。
主要文件：`apps/api/src/modules/knowledge/knowledge.service.ts`、`apps/api/src/modules/knowledge/knowledge.search.ts`。
任务：把 diagnostics 读取、Chroma / indexer 查询 client、startup recovery 从主 service 中拆出。
DoD：`knowledge.service.ts` 不再同时承担 diagnostics 和恢复 worker 实现细节。
验证：diagnostics、search、recovery 场景测试通过。
依赖：`SR-21`。
风险 / 回滚：恢复逻辑必须保留当前 best-effort 语义。

### `SR-30` 消除 Python schema / parse 双轨

目标：避免一份请求被 Pydantic 校验后又手写重验一次。
主要文件：`apps/indexer-py/app/schemas/indexing.py`、`apps/indexer-py/app/services/indexing_service.py`、`apps/indexer-py/app/domain/indexing/pipeline.py`。
任务：让 schema 直接转 domain contract，或让 service 直接接 domain request，停止 `model_dump -> parse_request` 双重流程。
DoD：schema 与 domain 输入只有一条正式转换路径。
验证：Python 全量测试通过。
依赖：`SR-00`。
风险 / 回滚：必须保持现有错误响应 shape 和字段别名。

### `SR-31` 抽出 Python `ChromaClient`

目标：把 collection cache、URL 组装、delete/upsert、find/ensure 统一进 adapter。
主要文件：`apps/indexer-py/app/domain/indexing/pipeline.py`、必要时新增 `app/domain/indexing/chroma_client.py`。
任务：抽 `_COLLECTION_CACHE`、`find_collection()`、`ensure_collection()`、`delete_chunks_by_where()`、`upsert_chunk_records()` 等。
DoD：Chroma 访问逻辑有单一 adapter，主 orchestrator 不再直接处理所有 HTTP 细节。
验证：Python 测试通过，并新增 cache refresh / stale 行为测试。
依赖：`SR-30`。
风险 / 回滚：必须保留“collection 不存在时 delete noop”的既有语义。

### `SR-32` 抽出 Python `EmbeddingClient`

目标：把 embedding 逻辑从 pipeline 主体中独立出来。
主要文件：`apps/indexer-py/app/domain/indexing/pipeline.py`、必要时新增 `embedding_client.py`。
任务：拆出 runtime config 解析、OpenAI-compatible 请求、本地 deterministic embedding fallback、batching 与 response 解析。
DoD：后续扩 provider 或调整 dev fallback 时，不需要再碰 Chroma / parser 代码。
验证：Python 测试通过，保留 local-dev 行为一致性测试。
依赖：`SR-31`。
风险 / 回滚：注意 Node / Python local-dev embedding 语义不一致的历史问题，重构时不要继续扩大。

### `SR-33` 拆 Python parser / chunker / diagnostics / runtime config

目标：完成 `pipeline.py` 的主体瘦身。
主要文件：`apps/indexer-py/app/domain/indexing/pipeline.py`、`app/core/config.py`、`app/core/runtime_env.py`。
任务：抽出 document loader/parser、chunker、diagnostics、runtime settings；移除 config 对 pipeline 常量的反向依赖。
DoD：`pipeline.py` 回落为 orchestration 层，而不是一切逻辑的容器。
验证：Python 全量测试通过，新增 request override / `indexerTimeoutMs` 行为检查。
依赖：`SR-32`。
风险 / 回滚：配置读取 side effect 变化要谨慎，避免破坏启动流程。

### `SR-40` 引入 `knowledge` 条件更新 API

目标：把状态迁移从“先读后写”改成更可控的 repository 语义。
主要文件：`apps/api/src/modules/knowledge/knowledge.repository.ts`、`apps/api/src/modules/knowledge/knowledge.service.ts`。
任务：新增 `markPendingIfRetryable`、`markRebuildingIfIdle`、`markProcessingIfQueued` 等 compare-and-set 风格 API。
DoD：高风险状态迁移不再由 service 拼 patch 和时序判断。
验证：并发 retry / rebuild 场景测试通过。
依赖：`SR-22`。
风险 / 回滚：repository contract 变化会影响大量调用点，必须分批替换。

### `SR-41` 改造 `knowledge` summary 策略

目标：替换全量回算热路径。
主要文件：`apps/api/src/modules/knowledge/knowledge.repository.ts`、`apps/api/src/modules/knowledge/knowledge.service.ts`。
任务：将 `documentCount / chunkCount / indexStatus` 改为增量更新 + reconcile 兜底，修复上传后回滚洞。
DoD：常见上传 / 删除 / 完成 / 失败路径不再每次扫描整库文档。
验证：summary 相关测试通过，并覆盖失败回滚。
依赖：`SR-40`。
风险 / 回滚：增量策略必须考虑幂等和异步补偿。

### `SR-42` 修正恢复链路、索引与 namespace 清理

目标：把查询/索引和生命周期管理再收紧一层。
主要文件：`apps/api/src/modules/knowledge/knowledge.repository.ts`、`apps/api/src/modules/projects/projects.repository.ts`、`apps/api/src/modules/auth/auth.repository.ts`、`apps/api/src/modules/knowledge/knowledge.service.ts`。
任务：为恢复链路新增按状态查询；补 `projects.members.userId + updatedAt` 复合索引；评估 `auth.searchProfiles()` 搜索策略；补 namespace/空 collection 清理策略。
DoD：索引与查询方向更匹配，空壳 namespace 不再长期残留。
验证：repository 测试和关键性能路径 smoke。
依赖：`SR-41`。
风险 / 回滚：索引变更需注意已有数据和启动耗时。

### `SR-50` 拆项目对话 runtime

目标：先把 LLM / retrieval / title / sources 运行时从项目主 service 中切出来。
主要文件：`apps/api/src/modules/projects/projects.service.ts`、`apps/api/src/modules/projects/projects.shared.ts`、必要时新增 `project-conversation-runtime.ts`。
任务：抽离 assistant reply generation、prompt build、sources normalize、retrieval 拼装。
DoD：项目 CRUD 与对话 runtime 不再长期共栖于同一大文件。
验证：conversation create / send / sources / rename 回归。
依赖：`SR-22`、`SR-42`。
风险 / 回滚：必须保持现有对话接口 contract 不变。

### `SR-51` 拆项目对话 application service，并设置集合迁移门

目标：进一步明确 conversation 业务边界，但把 collection 迁移作为显式决策门。
主要文件：`apps/api/src/modules/projects/projects.service.ts`、`apps/api/src/modules/projects/projects.repository.ts`、`docs/plans/tasks-chat-core-week7-8.md`。
任务：拆出 `project-conversation-service`；同时评估消息量、文档膨胀、查询模型后，再决定是否启动 conversation 独立 collection 计划。
DoD：有单独的 conversation service 边界，并形成“是否迁 collection”的明确决策记录。
验证：项目对话主链路回归，若不开启迁移则保持最小改动。
依赖：`SR-50`。
风险 / 回滚：禁止把“评估 collection 迁移”误做成“本轮必须迁移”。

### `SR-60` 统一 env / secrets canonical 契约

目标：先收口环境键和 `_FILE` 规则。
主要文件：`.env.example`、`.env.docker.local.example`、`.env.docker.production.example`、`docker/api/start-api.sh`、`scripts/knowject.sh`。
任务：定义一套 canonical 环境键，清理历史漂移键，明确哪些变量允许 `_FILE`，哪些只允许明文或只允许文件注入。
DoD：模板、脚本和实际运行约束一致，不再出现模板外遗留键。
验证：env drift 检查、compose config dry-run。
依赖：`SR-02`。
风险 / 回滚：环境键调整前必须保留迁移兼容窗口。

### `SR-61` 模块化 compose wrapper 与本地开发脚本

目标：减轻 `knowject.sh` 的多职责膨胀。
主要文件：`scripts/knowject.sh`、必要时新增 `scripts/lib/*.sh`、`docker/scripts/*`。
任务：将 env sync、secret bootstrap、compose wrapper、端口探测拆成独立 shell 模块；明确 `deps-only`、`full-local`、`production` 三类运行入口。
DoD：脚本职责更单一，推荐开发流与完整容器流的语义更清晰。
验证：shell smoke + compose config dry-run。
依赖：`SR-60`。
风险 / 回滚：脚本拆分后要保持入口命令兼容或提供迁移提示。

### `SR-62` 收紧 `.dockerignore` 与文档真相源

目标：收口构建上下文和 Docker 文档入口。
主要文件：`.dockerignore`、`docker/README.md`、`docs/README.md`、必要时 `docs/current/docker-usage.md`。
任务：排除 `.codex/`、`.agent/`、`files/`、`resume/` 等非构建输入；把 Docker 说明收口到单一主入口，其余文档改链接引用。
DoD：构建上下文更干净，Docker 文档不再多处重复描述同一事实。
验证：compose config、文档一致性检查。
依赖：`SR-61`。
风险 / 回滚：文档收口时不能丢失当前可执行命令。

## 十、验证基线与命令建议

每个 milestone 完成后，至少执行与改动直接相关的最小验证。

推荐基线：

- Node：
  - `pnpm --filter api test`
  - 若范围可缩小，至少执行 `create-app`、`knowledge`、`projects`、`settings`、`api-response`、shared lib 相关测试
- Request：
  - `pnpm --filter @knowject/request test`
  - `pnpm --filter @knowject/request check-types`
- Python：
  - `cd apps/indexer-py && uv run pytest tests`
- TypeScript：
  - `pnpm --filter api build`
  - 或至少执行 `pnpm --filter api check-types`
- Docker / Script：
  - `docker compose --env-file .env.docker.local -f compose.yml -f compose.local.yml config >/dev/null`
  - `docker compose --env-file .env.docker.production -f compose.yml -f compose.production.yml config >/dev/null`

若后续新增更细的 smoke 脚本，应把它们补回本节，而不是散落在 handoff 或聊天记录中。

## 十一、风险与回滚

主要风险：

- `knowledge` 状态机拆分时引入时序回归。
- Python `pipeline` 拆分时误伤错误响应 shape 或 request override 行为。
- summary 从全量回算改成增量维护后出现计数漂移。
- 项目对话拆 runtime 时误伤 sources 或对话标题策略。
- env / secrets 契约收口时影响既有本地开发流。

回滚原则：

- 每个 milestone 独立提交、独立验证、独立回滚。
- 只在当前 milestone 验证通过后，才进入下一批。
- 若某个 deeper refactor 在两次迭代内验证成本高于收益，回退到上一稳定批次，并把它降级为后续候选，不强行推进。

## 十二、进度

- 2026-03-18：Milestone 0 完成
  - 已冻结最小验证矩阵：`apps/api`（`create-app`/shared lib/`knowledge`/`projects`/`settings`）、`@knowject/request`、`apps/indexer-py`、Docker compose config dry-run。
  - 现有 `knowledge` 高风险状态流测试继续保留为护栏主干；本轮补齐的是外围 `create-app` 装配 smoke 与 request envelope / unauthorized error 行为测试。
- 2026-03-18：Milestone 1 完成（第一批 shared helper 收口）
  - 已收口 `mongo-id`、mutation input guard、URL 组装、response body 解析、OpenAI-compatible / indexer error normalize，以及 `ApiEnvelope` 类型源。
  - 当前未进入 `knowledge.service.ts` / `pipeline.py` 的主体拆分；下一步应按计划进入 Milestone 2。
- 2026-03-18：Milestone 2 进行中（`SR-20` 第一批完成）
  - 已新增 `knowledge.visibility.ts` 与 `knowledge.namespace.ts`，将 `requireVisibleKnowledge`、`requireKnowledgeInProject`、namespace descriptor / context resolve、namespace state helper 从 `knowledge.service.ts` 中拆出。
  - 已补 `knowledge.visibility.test.ts`、`knowledge.namespace.test.ts`，并保持现有错误码 / 错误文案、legacy namespace fallback、startup recovery 与 rebuild 路径语义不变。
  - 已执行验证：`pnpm --filter api check-types`、`pnpm --filter api exec node --test --import tsx src/modules/knowledge/knowledge.namespace.test.ts src/modules/knowledge/knowledge.visibility.test.ts src/modules/knowledge/knowledge.service.test.ts`、`pnpm --filter api test`。
- 2026-03-18：Milestone 2 继续推进（`SR-21` 第一批完成）
  - 已新增 `knowledge.storage.ts` 与 `knowledge.index-orchestrator.ts`，将 storage path / 文件写删、Node -> Python indexer 请求、detached queue、失败状态回写与 namespace rebuild worker 从 `knowledge.service.ts` 中拆出。
  - `knowledge.service.ts` 目前保留 façade、权限/namespace 判定、diagnostics 聚合与 startup recovery 判定；recovery 已改为调用新的 orchestrator queue helper，未改变 Node / Python / Mongo / Chroma 边界。
  - 已执行验证：`pnpm --filter api check-types`、`pnpm --filter api exec node --test --import tsx src/modules/knowledge/knowledge.service.test.ts`、`pnpm --filter api test`。
- 2026-03-18：Milestone 2 继续推进（`SR-22` 第一批完成）
  - 已新增 `knowledge.diagnostics.ts` 与 `knowledge.recovery.ts`，将 stale-processing 判定、indexer diagnostics 请求/解析、diagnostics 错误归一化、startup recovery 编排从 `knowledge.service.ts` 中拆出。
  - `knowledge.service.ts` 当前主要保留 façade、权限/namespace 判定、上传/删除/重建入口与 diagnostics 结果组装；startup recovery 已改为复用 `knowledge.recovery.ts`，保持 best-effort 恢复与 legacy rebuild required 语义不变。
  - 已执行验证：`pnpm --filter api check-types`、`pnpm --filter api exec node --test --import tsx src/modules/knowledge/knowledge.service.test.ts`、`pnpm --filter api test`。
- 2026-03-18：Milestone 2 继续推进（`SR-22` 第二批完成）
  - 已新增 `knowledge.project-search.ts`，将 project/global namespace 混合检索所需的 hit 去重、embedding-space merge、namespace search 编排从 `knowledge.service.ts` 中拆出。
  - 已补 `knowledge.project-search.test.ts` 并纳入 `apps/api` 测试入口；当前 `knowledge.service.ts` 的检索侧主要保留可见性判定、项目资源选择与最终 response 组装。
  - 已执行验证：`pnpm --filter api check-types`、`pnpm --filter api exec node --test --import tsx src/modules/knowledge/knowledge.project-search.test.ts src/modules/knowledge/knowledge.service.test.ts`、`pnpm --filter api test`。
- 2026-03-18：Milestone 2 收尾评估完成
  - 结论：Milestone 2 可正式收尾。`knowledge.service.ts` 已从事实基线中的 3249 行下降到 1724 行，Milestone 2 目标中的 visibility、namespace-state、storage、index-orchestrator、diagnostics、project-search / search orchestration seam 均已拆出，Node / Python / Mongo / Chroma 边界未被扩大。
  - 证据：已存在并通过 `knowledge.visibility.test.ts`、`knowledge.namespace.test.ts`、`knowledge.project-search.test.ts`、`knowledge.search.test.ts`、`knowledge.service.test.ts`；本次收尾再次执行 `pnpm --filter api check-types` 与 `pnpm --filter api exec node --test --import tsx src/modules/knowledge/knowledge.namespace.test.ts src/modules/knowledge/knowledge.visibility.test.ts src/modules/knowledge/knowledge.project-search.test.ts src/modules/knowledge/knowledge.search.test.ts src/modules/knowledge/knowledge.service.test.ts`，结果为 46 个测试全部通过。
  - 残余风险：`knowledge.service.ts` 仍保留 façade、上传 / 删除 / 重建入口与 diagnostics response 组装，后续数据库状态机改造仍会触碰这里；`knowledge.search.ts` 仍承载 Node 读侧直连 Chroma 的架构例外；Node -> Python request override 目前虽有 Node 单测与 Python API / pipeline 测试，但仍缺少真正跨进程的最小集成验证。
  - 下一步：进入 Milestone 3，但先按“`SR-30` 去掉 schema/domain 双轨转换 -> `SR-31` 抽 `ChromaClient` -> `SR-32` 抽 `EmbeddingClient` -> `SR-33` 拆 parser / chunker / diagnostics / runtime config”的顺序推进。每一批完成后至少执行 `cd apps/indexer-py && uv run pytest tests`；在 `SR-30` 或 `SR-31` 期间补一条 Node -> Python request override 最小验证，避免后续拆分时误伤 request-level config、错误 shape 与 legacy route 兼容。
- 2026-03-18：Milestone 3 启动（`SR-30` 第一批完成）
  - 已在 Python indexer 中建立单一正式输入转换路径：`IndexDocumentRequestPayload` / `DeleteChunksRequestPayload` 现在通过 `to_domain_request()` 直接生成 domain request，`indexing_service.py` 不再使用 `model_dump(by_alias=True)` 把 API payload 回退成原始 dict 再交给 `pipeline.py` 二次解析。
  - `pipeline.py` 当前改为接收 `IndexDocumentRequest` / `DeleteChunksRequest`，并新增 `build_index_document_request()`、`build_delete_chunks_request()`、`build_embedding_runtime_config()`、`build_indexing_runtime_config()` 作为正式 domain contract builder；request override、默认值回填、空字符串/非法值校验与既有 `IndexerError` 文案保持稳定。
  - 已同步更新 `tests/test_pipeline.py`，把 request-level override、document delete / knowledge delete、process_document 入口校验切到新的 domain request 路径；`tests/test_api.py` 无需改动即可保持全绿，说明 public API shape 与 route contract 未变化。
  - 已执行验证：`python -m py_compile apps/indexer-py/app/domain/indexing/pipeline.py apps/indexer-py/app/services/indexing_service.py apps/indexer-py/app/schemas/indexing.py`、`cd apps/indexer-py && uv run pytest tests/test_pipeline.py tests/test_api.py`、`cd apps/indexer-py && uv run pytest tests`。
  - 下一步：继续进入 `SR-31`，优先抽 `_COLLECTION_CACHE`、`find_collection()`、`ensure_collection()`、`delete_chunks_by_where()`、`upsert_chunk_records()` 到独立 `ChromaClient`；同时补一条 Node -> Python request override 的最小跨边界验证，避免后续 client 拆分时把 request-level config 或 legacy internal route 兼容误伤。
- 2026-03-18：Milestone 3 继续推进（`SR-31` 第二批完成）
  - 已新增 `apps/indexer-py/app/domain/indexing/chroma_client.py`，把 `_COLLECTION_CACHE`、`find_collection()`、`ensure_collection()`、`delete_chunks_by_where()`、`delete_document_chunks()`、`upsert_chunk_records()` 的真正实现下沉到独立 `ChromaClient`；`pipeline.py` 当前仅保留轻量 wrapper 与 `get_chroma_client()` lazy getter，不再直接承载 Chroma collection cache 和写删 HTTP 细节。
  - Chroma adapter 语义保持稳定：`ensure_collection()` 在 create 冲突后仍会 refresh list 并复用已存在 collection；`delete_chunks_by_where()` 继续保留“collection 不存在时 delete noop”；`pipeline.py` 现有 orchestrator 与 API route contract 未变化，`SR-30` 建立的 schema -> domain request 单一路径也未被回退。
  - 已新增 `tests/test_chroma_client.py`，补齐 collection cache 命中 / bypass refresh、create 冲突后的 refresh fallback、delete noop 与 delete endpoint payload 形状验证；`tests/test_pipeline.py` 改为验证 pipeline 对 `ChromaClient` 的 delegation，而不是继续绑定旧的内部 HTTP 细节。
  - 已执行验证：`python -m py_compile apps/indexer-py/app/domain/indexing/chroma_client.py apps/indexer-py/app/domain/indexing/pipeline.py apps/indexer-py/app/services/indexing_service.py apps/indexer-py/app/schemas/indexing.py`、`cd apps/indexer-py && uv run pytest tests/test_chroma_client.py tests/test_pipeline.py tests/test_api.py`、`cd apps/indexer-py && uv run pytest tests`（31 个测试全部通过）。
  - 下一步：进入 `SR-32`，把 embedding provider 解析、local-dev fallback、batching、response parse 和 OpenAI-compatible HTTP 交互从 `pipeline.py` 中抽成独立 `EmbeddingClient`；同时补那条尚未完成的 Node -> Python request override 最小跨边界验证，避免 `SR-32` / `SR-33` 继续推进时把 request-level config、错误 shape 或 legacy internal route 兼容带坏。
- 2026-03-18：Milestone 3 继续推进（`SR-32` 第三批完成）
  - 已新增 `apps/indexer-py/app/domain/indexing/embedding_client.py`，把 `EmbeddingRuntimeConfig`、embedding provider 判定、runtime config 构建、local-dev deterministic fallback、batching、OpenAI-compatible request orchestration、response parse 从 `pipeline.py` 中抽成独立 `EmbeddingClient`。
  - `pipeline.py` 当前保留 embedding 侧兼容 wrapper：`build_embedding_runtime_config()`、`resolve_embedding_provider()`、`create_embeddings()`、`create_local_development_embedding()`、`iter_embedding_batches()`、`parse_embeddings_response()` 都已改为委托给新的 `EmbeddingClient`；这使 `process_document()` 继续保持调用面稳定，同时不把 embedding 细节留在主 orchestrator 内部。
  - 已新增 `tests/test_embedding_client.py`，覆盖 request-level runtime config、OpenAI batching、development 无 key 时的本地 fallback，以及 embedding response 数量不匹配错误；现有 `tests/test_pipeline.py`、`tests/test_api.py`、`tests/test_chroma_client.py` 也继续保持全绿，说明 API shape、route contract 与 `SR-31` 的 Chroma adapter 边界都未回退。
  - 已执行验证：`python -m py_compile apps/indexer-py/app/domain/indexing/embedding_client.py apps/indexer-py/app/domain/indexing/chroma_client.py apps/indexer-py/app/domain/indexing/pipeline.py apps/indexer-py/app/services/indexing_service.py apps/indexer-py/app/schemas/indexing.py`、`cd apps/indexer-py && uv run pytest tests/test_embedding_client.py tests/test_pipeline.py tests/test_api.py tests/test_chroma_client.py`、`cd apps/indexer-py && uv run pytest tests`（35 个测试全部通过）。
  - 下一步：进入 `SR-33`，继续把 parser / chunker / diagnostics / runtime config 从 `pipeline.py` 中抽成更薄的 orchestration 层；在推进 `SR-33` 前仍建议补一条 Node -> Python request override 的最小跨边界验证，避免后续重构只靠单侧单测兜底。
- 2026-03-18：Milestone 3 继续推进（`SR-33` 第四批完成）
  - 已新增 `apps/indexer-py/app/domain/indexing/runtime_config.py`、`parser.py`、`chunking.py`、`diagnostics.py`，分别承接 chunk / supported-type / timeout runtime config、文档解析与清洗、chunk 构建与 `ChunkRecord` 组装，以及 diagnostics 聚合；`app/core/config.py` 也已改为依赖 `runtime_config.py` 的默认 chunk 常量，不再反向依赖 `pipeline.py`。
  - `pipeline.py` 当前已回落为 orchestration façade：`parse_document_text()`、`clean_text()`、`build_chunks()`、`build_chunk_records()`、`build_indexing_runtime_config()`、`collect_diagnostics()` 等入口都已改为委托给对应专用模块；parser / chunker / diagnostics / runtime settings 的具体实现不再堆在主 pipeline 文件中。
  - 已新增 `tests/test_runtime_config.py`、`tests/test_parser.py`、`tests/test_chunking.py`、`tests/test_diagnostics.py`，覆盖 request-level chunk override、`indexerTimeoutMs` 校验、文本清洗 / parser 选择、chunk overlap 语义与 diagnostics 聚合；原有 `tests/test_pipeline.py`、`tests/test_api.py`、`tests/test_embedding_client.py`、`tests/test_chroma_client.py` 继续保持全绿。
  - 已执行验证：`python -m py_compile apps/indexer-py/app/domain/indexing/runtime_config.py apps/indexer-py/app/domain/indexing/parser.py apps/indexer-py/app/domain/indexing/chunking.py apps/indexer-py/app/domain/indexing/diagnostics.py apps/indexer-py/app/domain/indexing/embedding_client.py apps/indexer-py/app/domain/indexing/chroma_client.py apps/indexer-py/app/domain/indexing/pipeline.py apps/indexer-py/app/core/config.py apps/indexer-py/app/services/indexing_service.py apps/indexer-py/app/schemas/indexing.py`、`cd apps/indexer-py && uv run pytest tests`（42 个测试全部通过）。
  - 残余风险：`SR-33` 本身的代码拆分已经完成，但 Milestone 3 总体验证仍缺少真正的 Node -> Python request override 最小跨边界验证；当前只有 Node 侧 payload 测试与 Python route / schema / pipeline 测试，尚未形成一条贯穿两侧的最小闭环护栏。
  - 下一步：先补这条 Node -> Python request override 最小跨边界验证，再做 Milestone 3 收尾评估；若验证通过，可把 Milestone 3 正式勾为完成。
- 2026-03-18：Milestone 3 收尾评估完成
  - 结论：Milestone 3 可正式收尾。`pipeline.py` 的 parser / chunker / embedding / Chroma / diagnostics / runtime config 相关实现均已拆出，跨边界上也已补齐一条最小的 Node -> Python request override 自动化验证。
  - 证据：已新增 `apps/indexer-py/tests/indexer_capture_server.py` 作为轻量 capture server，并在 `apps/api/src/modules/knowledge/knowledge.service.test.ts` 中增加真实 `Node -> Python HTTP` 跨边界测试，验证 Node 上传链路构造的 `embeddingConfig` / `indexingConfig` JSON 能被 Python 正式 `/internal/v1/index/documents` 路由、schema 与 domain 转换正确接住。收尾再次执行 `pnpm --filter api check-types`、`pnpm --filter api exec node --test --import tsx src/modules/knowledge/knowledge.service.test.ts` 与 `cd apps/indexer-py && uv run pytest tests`，结果全部通过，其中 Python 测试为 42 个全绿。
  - 收益：Milestone 3 原先缺失的“真正跨进程 request override 护栏”已补齐，后续若 Node payload 字段、Python alias/schema、runtime config builder 或 route contract 再发生漂移，至少会有一条自动化验证同时在两侧报错，而不再只靠单边单测兜底。
  - 残余风险：这条验证当前覆盖的是 versioned 文档索引入口，不是知识库级 delete / rebuild 全量路径；legacy `/internal/index-documents` 兼容仍主要由现有 Node fallback 测试和 Python route 测试共同覆盖。
  - 下一步：进入 Milestone 4，先做 `SR-40` 的 compare-and-set 风格状态迁移 API，再做 `SR-41` 的 summary 增量维护与 reconcile 兜底。
- 2026-03-18：Milestone 4 启动（`SR-40` 第一批完成）
  - 已在 `apps/api/src/modules/knowledge/knowledge.repository.ts` 新增 compare-and-set 风格状态迁移 API：`markKnowledgeDocumentPendingIfRetryable()`、`markKnowledgeDocumentProcessingIfPending()`、`markKnowledgeDocumentCompletedIfProcessing()`、`markKnowledgeDocumentFailedIfProcessing()`、`markKnowledgeNamespaceRebuildingIfIdle()`；同时保留了对旧 stub repository 的 fallback wrapper，避免现有单测被实现细节强绑定。
  - `apps/api/src/modules/knowledge/knowledge.index-orchestrator.ts` 已切到这些 CAS helper：`queueExistingKnowledgeDocument()` 不再无条件把文档改回 `pending`，`processUploadedDocument()` 只会把 `pending` 文档推进到 `processing`，且只有仍处于 `processing` 的文档才会被当前 worker 回写为 `completed / failed`。`knowledge.service.ts` 里的 `retryDocument()`、`rebuildDocument()` 与 `rebuildKnowledge()` 也已接入新的冲突语义，尤其是 namespace rebuild 现在通过 `idle -> rebuilding` 的条件更新拿锁。
  - 已新增两条直接护栏：`retryDocument rejects when pending transition loses the compare-and-set race` 与 `rebuildKnowledge rejects when namespace rebuild lock is taken during compare-and-set`，用于覆盖“先读后写”最容易漏掉的竞争窗口。
  - 已执行验证：`pnpm --filter api check-types`、`pnpm --filter api exec node --test --import tsx src/modules/knowledge/knowledge.service.test.ts`（36 个测试全部通过）、`pnpm --filter api test`（119 个测试全部通过）。
  - 残余风险：`syncKnowledgeSummaryFromDocuments()` 仍然是全量回算热路径，`markNamespaceDocumentsPending()` 也还没有收口成批量条件更新；这两块属于 Milestone 4 的下一批 `SR-41` 主要处理面。
  - 下一步：进入 `SR-41`，把 `documentCount / chunkCount / indexStatus` 从全量回算切到增量维护 + reconcile 兜底，并顺手评估 namespace 批量 pending 是否要一起下沉成 repository API。
- 2026-03-18：Milestone 4 继续推进（`SR-41` 完成）
  - `apps/api/src/modules/knowledge/knowledge.repository.ts` 已新增 summary 增量 API：`markKnowledgeSummaryPending()`、`markKnowledgeSummaryProcessing()`、`adjustKnowledgeSummaryAfterDocumentCompletion()`、`adjustKnowledgeSummaryAfterDocumentFailure()`、`adjustKnowledgeSummaryAfterDocumentRemoval()`，并补了 `markKnowledgeDocumentsPendingByKnowledgeIds()` 作为 namespace rebuild 的 batch pending 收口点。`syncKnowledgeSummaryFromDocuments()` 仍保留为老 stub / 手动 reconcile 的全量回算 fallback，但正式主链路不再依赖它做常态更新。
  - `apps/api/src/modules/knowledge/knowledge.index-orchestrator.ts` 与 `knowledge.service.ts` 已切到新 summary helper：上传 / retry / rebuild / processing / completed / failed / delete 常见路径不再每次扫描整库文档；同时修复了上传链路在“summary 已写入、但 actor profile / 返回组装后续抛错”时遗漏 summary 补偿的问题。
  - 新增三条直接护栏：`uploadDocument rolls back knowledge summary when response assembly fails after summary update`、`rebuildDocument uses incremental knowledge summary helpers during detached processing`、`deleteDocument prefers incremental summary adjustment over full reconciliation`，覆盖上传后回滚洞、成功完成路径与单文档删除路径。
  - 已执行验证：`pnpm --filter api check-types`、`pnpm --filter api exec node --test --import tsx src/modules/knowledge/knowledge.service.test.ts`（39 个测试全部通过）、`pnpm --filter api test`（122 个测试全部通过）。
  - 残余风险：当前 `indexStatus` 的 reconcile 已改成按状态存在性查询，不再全量拉文档，但 `syncKnowledgeSummaryFromDocuments()` 作为兼容 fallback 仍然保留；若后续要继续收窄 repository 语义，可在 `SR-42` 一并决定是否把这类 legacy fallback 进一步降级为纯调试入口。
  - 下一步：进入 `SR-42`，补恢复链路按状态查询、索引与 namespace/空 collection 清理策略，把数据库侧查询方向与生命周期管理继续收紧。
- 2026-03-18：Milestone 4 收尾（`SR-42` 完成）
  - `apps/api/src/modules/knowledge/knowledge.repository.ts` 已补恢复链路专用查询与状态入口：`listKnowledgeDocumentsForRecovery()`、`listKnowledgeNamespaceIndexStatesByRebuildStatus()`、`markKnowledgeDocumentPendingForRecovery()`、`deleteKnowledgeNamespaceIndexState()`；同时新增 `knowledge_documents_status_updated_at_asc` 索引，减少启动恢复时对 `knowledgeId` 维度全量拉取的依赖。
  - `apps/api/src/modules/knowledge/knowledge.recovery.ts` 已改成按状态恢复：启动阶段优先读取 `pending / stale processing` 文档与 `rebuilding` namespace 状态，再通过 `queueRecoverableKnowledgeDocument()` 恢复文档级任务；不再把恢复链路误建在面向 `completed / failed` 的 retry helper 上。`apps/api/src/modules/projects/projects.repository.ts` 也已补 `projects_members_user_id_updated_at_desc`，对齐成员列表查询 + `updatedAt` 排序方向。
  - `apps/api/src/modules/knowledge/knowledge.service.ts` 已新增“最后一个知识库删除后”的 empty namespace 清理：当 namespace 下不再存在任何知识库时，会 best-effort 清掉 versioned `active / target` collection 与 MongoDB namespace state，避免空壳 namespace 长期残留。`auth.searchProfiles()` 本轮已评估但暂未改动，原因是当前仓库尚无明确性能或排序回归证据，不值得在缺少验证护栏的前提下引入搜索策略重写。
  - 新增两条直接护栏：`initializeSearchInfrastructure prefers status-scoped recovery queries and recovery transitions`、`deleteKnowledge cleans up empty namespace state and collections after removing the last knowledge base`，分别覆盖恢复链路状态查询和 empty namespace 清理。
  - 已执行验证：`pnpm --filter api check-types`、`pnpm --filter api exec node --test --import tsx src/modules/knowledge/knowledge.service.test.ts`（41 个测试全部通过）、`pnpm --filter api test`（124 个测试全部通过）。
  - 结论：Milestone 4 可正式结束。数据库侧当前剩余风险主要收敛为“兼容 fallback 尚保留”和“`auth.searchProfiles()` 仍是保守实现”，都不再阻塞下一阶段拆项目对话 runtime。
  - 下一步：进入 Milestone 5，先做 `SR-50`，把项目对话的 LLM / retrieval / title / sources runtime 从 `projects.service.ts` 切出来。
- 2026-03-18：Milestone 5 收尾（`SR-50` + `SR-51` 完成）
  - `apps/api/src/modules/projects/project-conversation-runtime.ts` 已承接项目对话 runtime：LLM provider 兼容判断、prompt build、merged retrieval 拼装、sources normalize、auto-title helper 与 `chat/completions` 请求都已从 `projects.service.ts` 抽出；`apps/api/src/app/create-app.ts` 也改成直接注入该 runtime。
  - `apps/api/src/modules/projects/project-conversation-service.ts` 已承接 conversation application service：`list / detail / create / rename / delete / send` 六条对话主链路已从主 `projects.service.ts` 下沉，默认线程 materialize、自动标题 compare-and-set、assistant reply 持久化都收口在独立服务中；`projects.service.ts` 现已回落为“项目 CRUD + conversation service 组装层”。
  - collection 迁移门已明确关闭为“本轮不迁”：当前仓库仍沿用 `projects.conversations[]` 内嵌结构，但 conversation runtime / service / repository 边界已经先拆开；在缺少真实消息量、热写冲突或 per-conversation 分页 / SSE 恢复元数据压力之前，不启动独立 `project_conversations` 集合迁移。
  - 已同步更新 `docs/plans/tasks-chat-core-week7-8.md` 的对话持久化模型策略，以及 `apps/api/README.md`、`docs/current/architecture.md` 中 `modules/projects` 的当前边界描述。
  - 已执行验证：`pnpm --filter api check-types`、`pnpm --filter api exec node --test --import tsx src/modules/projects/projects.service.test.ts`（19 个测试全部通过）、`pnpm --filter api test`（124 个测试全部通过）。
  - 结论：Milestone 5 可正式结束。项目 CRUD、conversation application service 与 conversation runtime 已不再长期共栖于同一大文件，且对外 `/api/projects/:projectId/conversations*` contract 保持不变。
  - 下一步：进入 Milestone 6，先做 `SR-60`，统一 env / secrets canonical 契约与 `_FILE` 规则。
- 2026-03-18：Milestone 6 进展（`SR-60` 完成）
  - `compose.yml`、`docker/api/start-api.sh`、`scripts/knowject.sh` 已把 API runtime 的 Mongo 契约收口为 `MONGODB_URI` / `MONGODB_URI_FILE` canonical：Compose 改为向 API 容器注入 `mongodb_uri` secret；`knowject.sh` 会分别派生宿主机用的 `docker/secrets/mongodb_uri.local.txt` 和容器用的 `docker/secrets/mongodb_uri.txt`；`start-api.sh` 仍保留 `MONGO_APP_* / MONGO_HOST / MONGO_PORT / MONGO_AUTH_SOURCE` 的兼容 fallback，但只作为迁移窗口。
  - `.env.example`、`.env.docker.local.example`、`.env.docker.production.example` 已明确 `_FILE` 规则：当前推荐只把 `MONGODB_URI`、`JWT_SECRET`、`SETTINGS_ENCRYPTION_KEY`，以及可选 `OPENAI_API_KEY` 作为 canonical `*_FILE` 使用面；其余非 secret 配置继续走明文 env。
  - 已同步更新 `README.md`、`docker/README.md`、`apps/api/README.md`、`docs/current/docker-usage.md`、`docs/current/architecture.md`，并顺手修正了 `docker-usage.md` 中关于 Chroma “尚未进入正式知识检索链路”的过时表述。
  - 已执行验证：`bash -n scripts/knowject.sh`、`bash -n docker/api/start-api.sh`、`bash -n docker/scripts/generate-local-secrets.sh`、`bash -n docker/mongo/init/01-create-app-user.sh`、`./scripts/knowject.sh docker:local:config >/dev/null`、`./scripts/knowject.sh docker:prod:config >/dev/null`。
  - 结论：`SR-60` 可结束。当前模板、compose、脚本和文档对 API runtime 的 env / secrets 契约已经一致，剩余工作转入 `SR-61` 的脚本职责拆分与 compose wrapper 模块化。
  - 下一步：进入 `SR-61`，拆 `scripts/knowject.sh` 的 env sync / compose wrapper / 端口探测职责。
- 2026-03-18：Milestone 6 进展（`SR-61` 完成）
  - `scripts/knowject.sh` 已回落为命令分发器，并新增 `scripts/lib/knowject-common.sh`、`scripts/lib/knowject-env.sh`、`scripts/lib/knowject-compose.sh`、`scripts/lib/knowject-ports.sh` 四个 shell helper 模块；当前入口命令和 `pnpm` scripts 保持不变。
  - 本轮拆分把 helper 按职责收口为：common（日志 / fail / require）、env（模板同步、secret 校验、Mongo URI 派生、宿主机 env 回写）、compose（local/prod wrapper 与依赖启动）、ports（端口读取、占用探测、宿主机 / Docker 互斥校验），避免 `knowject.sh` 继续膨胀成单文件多职责脚本。
  - 已同步更新 `AGENTS.md`、`README.md`、`docker/README.md`、`docs/current/architecture.md`、`docs/current/docker-usage.md`，明确 `scripts/lib/` 已成为当前脚本结构的一部分。
  - 已执行验证：`bash -n scripts/knowject.sh`、`bash -n scripts/lib/knowject-common.sh`、`bash -n scripts/lib/knowject-env.sh`、`bash -n scripts/lib/knowject-compose.sh`、`bash -n scripts/lib/knowject-ports.sh`、`./scripts/knowject.sh docker:local:config >/dev/null`、`./scripts/knowject.sh docker:prod:config >/dev/null`。
  - 结论：`SR-61` 可结束。脚本入口兼容性保持不变，但 `env sync / compose wrapper / 端口探测` 已具备独立维护边界。
  - 下一步：进入 `SR-62`，收紧 `.dockerignore` 与 Docker 文档真相源。
- 2026-03-18：Milestone 6 收尾（`SR-62` 完成）
  - `.dockerignore` 已新增 `.codex/`、`.agent/`、`files/`、`resume/` 以及 nested `coverage / dist / build` 等非构建输入排除规则，避免根 compose build context 继续把协作文档、知识模板和历史产物打进镜像上下文。
  - `docker/README.md` 已退回为 Docker 命令入口与操作跳转页；`docs/current/docker-usage.md` 明确为 Docker 当前事实单一主源，不再双写拓扑、端口、secrets 契约与运行边界。
  - `docs/README.md`、`README.md`、`docs/current/architecture.md` 已同步更新入口说明；同时修正了 `docker-usage.md` 内残留的 Chroma 旧表述，避免同一文件前后对“是否进入正式知识检索链路”给出冲突结论。
  - 已执行验证：`./scripts/knowject.sh docker:local:config >/dev/null`、`./scripts/knowject.sh docker:prod:config >/dev/null`。
  - 结论：`SR-62` 可结束，Milestone 6 可正式结束。Docker build context、命令入口和当前事实文档边界都已收口到更清晰的单一来源模型。
  - 下一步：本计划 Milestone 0-6 已全部完成；后续若继续推进运维、部署或服务端演进，应回到相邻专题计划或 handoff 文档承接，而不是继续向本计划追加横向改造事项。

- [x] Milestone 0：护栏与回归矩阵
- [x] Milestone 1：共享 util 与 contract 收口
- [x] Milestone 2：Node `knowledge` 拆分
- [x] Milestone 3：Python `pipeline` 拆分
- [x] Milestone 4：数据库状态与索引优化
- [x] Milestone 5：项目对话 runtime / service 拆分
- [x] Milestone 6：Docker 与运行契约收口

## 十三、决策记录

- 决策：先拆 seam，不先上通用框架。
  原因：当前问题集中在热点模块，不在“抽象能力不足”。
  备选方案：先做 `BaseRepository` / 服务基类；已放弃，因收益低于复杂度。

- 决策：conversation collection 迁移设为决策门，而不是首批硬性任务。
  原因：当前已确认其长期可能需要，但直接迁移风险高于当前收益。
  备选方案：立即迁出 conversation/message；已延后，待 `knowledge` 主链路稳定后再评估。

- 决策：Docker 放在最后一阶段。
  原因：当前最大的真实风险在业务与索引链路，不在镜像构建细节。
  备选方案：先做 Docker 清理；已放弃，避免分散主线资源。
