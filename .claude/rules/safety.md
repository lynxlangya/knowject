# Safety Rules

## 不可逾越的红线

### Secrets 绝对禁止
- 明文 secrets 不进入代码或 git
- 仓库只提交 `.env.example`；本地真实值放 `.env.local`，不进 git

### 端口暴露
- Docker/数据库不对外暴露（除显式 dev 端口）
- 生产环境端口配置见 `.env.docker.production`

### 环境隔离
- internal 路由在非 development 环境须 fail-close
- 运行时按 `.env → .env.local` 顺序加载

### 文档同步
- 新增/变更接口须同步对应契约文档

## 环境变量约定

- Secret 键支持 `<NAME>_FILE` 形式：`MONGODB_URI_FILE`、`JWT_SECRET_FILE`、`SETTINGS_ENCRYPTION_KEY_FILE`、`KNOWLEDGE_INDEXER_INTERNAL_TOKEN_FILE`
- 同一 env 文件中禁止同时定义 `NAME` 和 `NAME_FILE`

## 品牌文本

涉及品牌文本必须使用：
- `知项 · Knowject`
- `让项目知识，真正为团队所用。`
