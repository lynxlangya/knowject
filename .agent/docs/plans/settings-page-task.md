# Knowject 设置页开发任务文档

状态：待开发（已完成可行性梳理，具备开发前置条件）  
优先级：P1  
阶段：Week 7+  
关联模块：`apps/api` / `apps/platform` / `apps/indexer-py` / MongoDB

当前结论：

- 基于当前仓库结构与已确认决策，本任务已具备开发前置条件。
- 本文档已按现有代码事实修订；后续实现以本文为直接契约，不再额外引入未确认的权限模型或运行时假设。

---

## 一、任务目标

在现有占位页 `/settings` 的基础上，开发完整的工作区设置模块。

核心目标：

- 让已登录用户在产品内完成 AI 模型配置（embedding / LLM），无需修改 `.env` 或重启服务
- API Key 加密存储到 MongoDB，不允许明文落库
- 配置运行时热生效，`apps/api` 和 `apps/indexer-py` 优先读取数据库配置，fallback 到环境变量
- 修改 embedding 配置后，联动提示用户重建知识库索引
- 本期 `/settings` 页面与 `/api/settings/*` 先对所有已登录用户开放；后续若引入工作区管理员或全局权限模型，再收紧访问控制

---

## 二、不做的边界（本阶段）

- 不做多工作区 / 多租户
- 不做工作区管理员 / 全局权限模型的后端落地；访问控制本期先按“登录即可访问”处理
- 不做成员权限的后端落地（UI 占位即可）
- 不做 Logo 上传的后端存储（UI 占位）
- 不做 LLM 对话模型的实际调用（UI + 存储落地，运行时调用等对话链路阶段）
- 不改现有 `.env` 加载逻辑的优先级顺序，只在应用层增加"数据库配置覆盖"

---

## 三、数据模型

### 3.1 新增 MongoDB Collection：`workspace_settings`

单文档设计，整个工作区只有一条记录，用 `singleton` 标识。

```typescript
interface WorkspaceSettings {
  _id: ObjectId;
  singleton: 'default'; // 固定值，确保唯一性，建唯一索引

  embedding: {
    provider: 'openai' | 'aliyun' | 'voyage' | 'custom';
    baseUrl: string; // 明文存储，不敏感
    model: string; // 明文存储
    apiKeyEncrypted: string; // 加密后的 API Key
    apiKeyHint: string; // 明文存储后四位，用于 UI 展示，如 "...ab3f"
    testedAt?: Date; // 最近一次连接测试通过时间
    testStatus?: 'ok' | 'failed';
  };

  llm: {
    provider: 'openai' | 'aliyun' | 'anthropic' | 'custom';
    baseUrl: string;
    model: string;
    apiKeyEncrypted: string;
    apiKeyHint: string;
    testedAt?: Date;
    testStatus?: 'ok' | 'failed';
  };

  indexing: {
    chunkSize: number; // 默认 1000，范围 200~2000
    chunkOverlap: number; // 默认 200，范围 0~500
    supportedTypes: string[]; // UI 默认 ['md', 'txt']，'.markdown' 作为解析别名不单独配置
    indexerTimeoutMs: number; // indexer 相关超时参数，默认 30000
  };

  workspace: {
    name: string;
    description?: string;
  };

  updatedAt: Date;
  updatedBy: string; // userId
}
```

唯一索引：

```javascript
db.workspace_settings.createIndex({ singleton: 1 }, { unique: true });
```

---

## 四、API Key 加密方案

### 4.1 加密算法

使用 **AES-256-GCM**：

- 对称加密，性能好
- GCM 模式提供认证标签，防止篡改
- Node.js 原生 `crypto` 模块支持，无需引入新依赖

### 4.2 密钥来源

加密密钥从环境变量读取，**不存数据库**：

```
SETTINGS_ENCRYPTION_KEY=<32字节随机十六进制，用 openssl rand -hex 32 生成>
```

此变量必须加入 `.env.example` 和必需变量清单。

### 4.3 加密工具函数

在 `apps/api` 现有共享层或 `settings` 模块内部新增 API Key 加密工具，路径遵循现有仓库目录风格；不要把实现路径写死为 `src/utils/crypto.ts`。

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env.SETTINGS_ENCRYPTION_KEY;
  if (!key || key.length !== 64) {
    throw new Error(
      'SETTINGS_ENCRYPTION_KEY 未配置或长度不正确，需为 64 位十六进制字符串',
    );
  }
  return Buffer.from(key, 'hex');
}

export function encryptApiKey(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // 格式：iv:authTag:encrypted（均为 hex）
  return [
    iv.toString('hex'),
    authTag.toString('hex'),
    encrypted.toString('hex'),
  ].join(':');
}

export function decryptApiKey(ciphertext: string): string {
  const key = getEncryptionKey();
  const [ivHex, authTagHex, encryptedHex] = ciphertext.split(':');

  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error('加密数据格式不正确');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    'utf8',
  );
}

export function maskApiKey(plaintext: string): string {
  if (plaintext.length <= 4) return '****';
  return '...' + plaintext.slice(-4);
}
```

### 4.4 安全边界约定

- `apiKeyEncrypted` 字段**只允许在服务端内部解密**，用于实际调用 AI API
- 所有返回给前端的 Settings 响应，必须将 `apiKeyEncrypted` 字段移除，只返回 `apiKeyHint` 与 `hasKey`
- 服务端响应、日志、数据库、错误对象中都不得回显或落库明文 API Key
- 已保存的 API Key 不回填到前端输入框
- 用户主动在前端输入并提交的新 API Key 会出现在浏览器本机请求体中；这属于正常本地调试边界，不作为服务端安全违规
- 前端更新 Key 时，传入新的明文 Key，服务端加密后覆盖存储

---

## 五、后端实现

### 5.1 新增模块：`apps/api/src/modules/settings/`

目录结构：

```
settings/
  settings.router.ts
  settings.repository.ts
  settings.service.ts
  settings.types.ts
```

说明：

- 目录与命名风格遵循现有 `*.router.ts / *.service.ts / *.repository.ts / *.types.ts` 约定
- 请求体校验沿用仓库现有后端校验模式，可复用 `validation` helper；实现不强制依赖 Zod

### 5.2 API 路由设计

挂载路径：`/api/settings`。

安全与访问约定：

- 全部需要 JWT 鉴权中间件
- 由于会处理明文 API Key，请同时纳入敏感路由保护，沿用现有 `no-store` 与生产环境 HTTPS 约束
- 本期先对所有已登录用户开放，不在此阶段补工作区管理员后端鉴权

```
GET    /api/settings              获取当前工作区设置（脱敏，不含 apiKeyEncrypted）
PATCH  /api/settings/workspace    更新工作区基本信息
PATCH  /api/settings/embedding    更新 embedding 配置（含 Key 加密入库）
PATCH  /api/settings/llm          更新 LLM 配置（含 Key 加密入库）
PATCH  /api/settings/indexing     更新索引参数
POST   /api/settings/embedding/test   测试 embedding 连接
POST   /api/settings/llm/test         测试 LLM 连接
```

### 5.3 GET /api/settings 响应结构

```typescript
// 注意：绝对不能返回 apiKeyEncrypted
{
  code: 'SUCCESS',
  data: {
    embedding: {
      provider: 'aliyun',
      baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      model: 'text-embedding-v3',
      apiKeyHint: '...ab3f',        // 只返回后四位提示
      hasKey: true,                  // 是否已配置 Key
      source: 'database',            // 当前生效值来源：database | environment
      testedAt: '2026-03-16T...',
      testStatus: 'ok',
    },
    llm: {
      provider: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o',
      apiKeyHint: '',
      hasKey: false,
      source: 'environment',
      testedAt: null,
      testStatus: null,
    },
    indexing: {
      chunkSize: 1000,
      chunkOverlap: 200,
      supportedTypes: ['md', 'txt'],
      indexerTimeoutMs: 30000,
      source: 'environment',
    },
    workspace: {
      name: '知项团队',
      description: '...',
    }
  }
}
```

补充约定：

- `embedding`、`llm`、`indexing` 返回的是**当前生效值**，不是单纯数据库原始值
- `source` 用于告诉前端当前生效值来自数据库还是环境变量 fallback
- `workspace` 继续只返回持久化后的业务字段，不增加环境变量来源标记
- 设置页前端显示“当前使用环境变量配置”时，必须以前端拿到的 `source` 标记为准，不靠本地猜测
- 本期设置真相源以 `GET /api/settings` 的 effective config 为准，不以 Python diagnostics 或默认 env 推断代替

### 5.4 PATCH /api/settings/embedding 请求结构

```typescript
// 前端传入明文 apiKey（如果要更新的话），服务端负责加密
{
  provider?: string;
  baseUrl?: string;
  model?: string;
  apiKey?: string;       // 明文，服务端加密存储；不传则保持现有 Key 不变
}
```

### 5.5 POST /api/settings/embedding/test 逻辑

用当前已保存的加密 Key（解密后）或请求中传入的临时 Key，向配置的 baseUrl 发一条最小 embedding 请求（输入固定字符串 "test"），验证连通性。

返回：

```typescript
{ success: true, latencyMs: 230 }
// 或
{ success: false, error: 'Invalid API key' }
```

测试通过后，更新 `testedAt` 和 `testStatus` 字段。

### 5.6 POST /api/settings/llm/test 逻辑

- 保留 `POST /api/settings/llm/test`
- 本期仅对 OpenAI-compatible provider 提供在线测试能力（如 `openai`、`aliyun`、指向兼容端点的 `custom`）
- `anthropic` 允许保存配置，但测试接口返回明确错误：`当前 provider 暂不支持在线测试`
- 文档、错误提示与验收项都要按这一限制编写，不把 Anthropic 的在线测试承诺到本期

### 5.7 运行时配置读取（关键逻辑）

在 `apps/api/src/config/ai-config.ts` 新增统一的配置读取函数：

```typescript
// 优先级：数据库配置 > 环境变量
export async function getEffectiveEmbeddingConfig(): Promise<EmbeddingConfig> {
  try {
    const settings = await settingsService.getSettings();
    if (settings?.embedding?.apiKeyEncrypted) {
      return {
        source: 'database',
        apiKey: decryptApiKey(settings.embedding.apiKeyEncrypted),
        baseUrl: settings.embedding.baseUrl,
        model: settings.embedding.model,
      };
    }
  } catch (e) {
    // 数据库读取失败时，fallback 到环境变量，记录 warning 日志
    console.warn('读取数据库 embedding 配置失败，fallback 到环境变量');
  }

  // Fallback 到环境变量
  return {
    source: 'environment',
    apiKey: process.env.OPENAI_API_KEY ?? '',
    baseUrl: process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
    model: process.env.OPENAI_EMBEDDING_MODEL ?? 'text-embedding-3-small',
  };
}
```

同理实现：

- `getEffectiveLlmConfig()`
- `getEffectiveIndexingConfig()`

统一约定：

- 三类函数都返回当前生效配置，规则为“数据库优先，缺失时 fallback 到环境变量”
- 现有知识检索 service 和触发 indexer 的地方，改为调用 effective config，而不是直接读 `process.env`
- 当前仓库在 `development` 环境下保留 `local_dev` deterministic embedding 退化能力；设置页接入后不能破坏这一现有行为
- `source` 只表示配置来源；`local_dev` 属于知识链路内部运行时降级，不等价于一条新的设置持久化来源

### 5.8 Python indexer 配置同步

当前 Node -> Python 的内部索引契约是**单文档请求**，不是批量 `documents` 协议。

当 Node 触发 `POST /internal/v1/index/documents` 时，在现有单文档 payload 上补充当前生效的配置，Python 侧按“请求级 override 优先，env 为兜底”读取：

```json
{
  "knowledgeId": "knowledge_123",
  "documentId": "document_123",
  "sourceType": "global_docs",
  "collectionName": "global_docs",
  "fileName": "README.md",
  "mimeType": "text/markdown",
  "storagePath": "/abs/path/to/file.md",
  "documentVersionHash": "sha256:...",
  "embeddingConfig": {
    "provider": "aliyun",
    "apiKey": "<解密后的明文，只在服务间内部传输>",
    "baseUrl": "https://dashscope.aliyuncs.com/compatible-mode/v1",
    "model": "text-embedding-v3"
  },
  "indexingConfig": {
    "chunkSize": 1000,
    "chunkOverlap": 200,
    "supportedTypes": ["md", "txt"],
    "indexerTimeoutMs": 30000
  }
}
```

Python indexer 侧约定：

- 请求级 `embeddingConfig` 优先于本地 env
- 请求级 `indexingConfig` 优先于本地 env
- 本期热生效通过 Node 每次请求透传 effective config 实现，不要求 Python 直连 MongoDB
- `.markdown` 继续作为 `.md` 的解析别名，不单独出现在设置项里
- `indexerTimeoutMs` 表示 indexer 相关超时配置，不表述为 Chroma / embedding / LLM 全链路统一全局超时开关

### 5.9 Python diagnostics 与设置来源口径

- 本期“设置真相源”是 `GET /api/settings` 返回的 effective config
- Python 自身 `/health` 与 `/internal/v1/index/diagnostics` 继续偏运行态诊断，不作为设置页展示真相源
- 若知识库诊断页需要展示当前 chunk 或 embedding 配置，应由 Node 聚合 effective config，不直接依赖 Python 默认值或环境变量推断

---

## 六、前端实现

### 6.1 页面结构

路由：`/settings`（现有占位页，直接替换内容）

整体布局：左侧竖向 Tab 导航 + 右侧内容区（和全局 `/knowledge` 的左右分栏风格保持一致）。

左侧 Tab 列表：

- AI 模型
- 索引配置
- 工作区
- 成员与权限（disabled，标注"即将开放"）

### 6.2 AI 模型 Tab

**Embedding 模型区块**

```
标题：向量模型（Embedding）
副标题：用于知识库索引与检索，修改后需重建所有知识库索引

Provider 下拉选择：
  - OpenAI
  - 阿里云百炼
  - Voyage AI
  - 自定义

选择后自动填入对应的默认 Base URL 和模型名称（可覆盖编辑）：
  - OpenAI       → https://api.openai.com/v1          / text-embedding-3-small
  - 阿里云百炼   → https://dashscope.aliyuncs.com/compatible-mode/v1 / text-embedding-v3
  - Voyage AI    → https://api.voyageai.com/v1         / voyage-3-large
  - 自定义       → 空，用户自行填写

API Key 输入框：
  - 已有 Key 时：显示 placeholder "已配置（...ab3f）"，输入框为空
  - 用户在输入框中输入新值时，视为更新 Key
  - 不输入则保持原有 Key 不变
  - 旁边有"测试连接"按钮

测试连接结果展示：
  - 成功：绿色 ✓ 连接正常，延迟 230ms
  - 失败：红色 ✗ + 错误原因

保存按钮：点击后调用 PATCH /api/settings/embedding

⚠️ 变更提示（仅当 provider 或 model 发生变化时出现）：
  "向量模型已变更，已有知识库需重建索引才能正常检索。
   前往知识库管理 →"
```

**LLM 对话模型区块**

结构与 Embedding 相同，但当前标注"对话链路开发中，配置将在后续版本生效"，输入框可用但保存后暂时不影响运行时。

Provider 预设：

- OpenAI → https://api.openai.com/v1 / gpt-4o
- 阿里云百炼 → https://dashscope.aliyuncs.com/compatible-mode/v1 / qwen-max
- Anthropic → https://api.anthropic.com / claude-sonnet-4-6（注：Anthropic 不是 OpenAI 兼容接口，此处保存配置，调用时需单独适配）
- 自定义 → 空

测试按钮说明：

- OpenAI-compatible provider 可直接在线测试
- `anthropic` 可保存，但测试接口返回"当前 provider 暂不支持在线测试"

### 6.3 索引配置 Tab

```
Chunk 大小
  滑块 + 数字输入，范围 200~2000，步长 100，默认 1000

Chunk 重叠
  滑块 + 数字输入，范围 0~500，步长 50，默认 200
  辅助说明：重叠越大，跨 chunk 语义连续性越好，但索引体积增加

Indexer 超时（毫秒）
  数字输入，默认 30000
  说明：用于 indexer 相关超时控制，不表示整个 Chroma / embedding 调用链的统一全局超时

支持的文件类型
  Checkbox 列表：
  ✅ Markdown (.md)
  ✅ 纯文本 (.txt)
  ⬜ PDF (.pdf)       — disabled，标注"即将支持"
  ⬜ Word (.docx)     — disabled，标注"即将支持"
  说明：`.markdown` 继续作为 Markdown 解析别名，不单独暴露为设置项

保存按钮

⚠️ 变更提示：
  "Chunk 参数已变更，已有知识库需重建索引才能使用新的分块策略。
   前往知识库管理 →"
```

### 6.4 工作区 Tab

```
工作区名称    Input，必填
工作区描述    TextArea，选填，最多 200 字
Logo         Upload 占位，disabled，标注"即将支持"

保存按钮
```

### 6.5 成员与权限 Tab（占位）

```
整体 disabled overlay，文案："成员权限配置即将开放，当前成员管理请前往成员页"
带跳转到 /members 的链接
```

### 6.6 状态处理

- 页面初始加载：调用 GET /api/settings，loading 态用 Skeleton
- 首次未配置时：各字段显示当前生效默认值；`embedding / llm / indexing` 是否显示"当前使用环境变量配置"，以接口返回的 `source` 标记为准
- 保存成功：Toast 提示"配置已保存"
- 保存失败：Toast 提示错误原因
- 测试连接中：按钮 loading，禁止重复点击

---

## 七、环境变量补充

在 `.env.example` 新增：

```bash
# 设置页 API Key 加密密钥（必须为 64 位十六进制字符串）
# 生成方式：openssl rand -hex 32
SETTINGS_ENCRYPTION_KEY=
```

实现落地后，需要同步：

- `.agent/docs/contracts/auth-contract.md` 中的环境变量契约
- 必要时再由事实源同步到 `.agent/gpt/AUTH_ENV_CONTRACT.md`

---

## 八、安全审查清单

在提交前，确认以下各项：

- [ ] `GET /api/settings` 的响应中，不包含任何 `apiKeyEncrypted` 字段
- [ ] `GET /api/settings` 的响应、错误对象与日志中，不包含任何明文 API Key
- [ ] `PATCH` 接口收到 `apiKey` 后，只允许服务端加密，不允许明文落库
- [ ] Python indexer 收到的 embedding config 中包含解密后的明文 Key，确认此通信在内网（localhost），不走公网
- [ ] `/api/settings/*` 同时受 JWT 鉴权与敏感路由保护约束
- [ ] `SETTINGS_ENCRYPTION_KEY` 未写入代码，只从环境变量读取
- [ ] 加密 Key 丢失时（环境变量未配置），系统抛出明确错误而非静默失败
- [ ] 浏览器本机 DevTools 中可看到用户主动提交的请求体，视为正常边界；判定安全性时只检查服务端回显、日志与持久化

---

## 九、验收检查项

- [ ] GET /api/settings 返回正确的脱敏结构，并为 `embedding / llm / indexing` 正确标记 `source`
- [ ] 保存 embedding 配置后，无需重启 API 服务，`getEffectiveEmbeddingConfig()` 返回数据库中的值
- [ ] 删除 .env.local 中的 OPENAI_API_KEY，系统仍可通过数据库配置正常执行 embedding
- [ ] 将 .env.local 中的 OPENAI_API_KEY 留空且数据库无配置，系统报错明确
- [ ] 更换 Provider 后，前端展示 ⚠️ 重建提示
- [ ] 测试连接：正确 Key 返回成功，错误 Key 返回失败并有错误原因
- [ ] `POST /api/settings/llm/test` 对 OpenAI-compatible provider 可用；对 `anthropic` 返回"当前 provider 暂不支持在线测试"
- [ ] 触发 Python indexer 时，请求体包含 `embeddingConfig` 与 `indexingConfig`
- [ ] 索引参数修改后，新触发的索引任务使用新的 chunkSize
- [ ] 所有 `/api/settings/*` 路由均需 JWT 鉴权，未登录访问返回 401
- [ ] 生产环境下，对 `/api/settings/*` 的非 HTTPS 请求会被敏感路由保护拒绝

---

## 十、实现顺序建议

1. `SETTINGS_ENCRYPTION_KEY` 加入 `.env.example` 和必需变量校验
2. 在 `lib` 或 `settings` 模块共享层新增 API Key 加密工具
3. 新增 `workspace_settings` repository 与唯一索引
4. `settings.service.ts`：getSettings / upsertEmbedding / upsertLLM / upsertIndexing / upsertWorkspace / testEmbedding / testLLM
5. `settings.router.ts` 挂载路由，并接入敏感路由保护
6. `apps/api/src/config/ai-config.ts` 运行时配置读取（`getEffectiveEmbeddingConfig` / `getEffectiveLlmConfig` / `getEffectiveIndexingConfig`）
7. 现有知识检索 service 与 indexer 触发链路改为读取 effective config
8. Python indexer 请求 schema / pipeline 补充 `embeddingConfig` 与 `indexingConfig` 请求级 override
9. 前端 `/settings` 页面（按 Section 顺序实现）
10. 回归验证：全量 rebuild 一个知识库，确认端到端链路正常，并同步更新 `.env.example`、`.agent/docs/contracts/auth-contract.md`、`apps/api/README.md`
