# Knowject Frontend (apps/platform)

前端采用 React + Vite + Ant Design，保留最小可扩展骨架：

- 登录页：`/login`
- 工作台：`/workspace`
- 404 页面：`*`

## 核心目录

- `src/app/auth`：鉴权 token 管理
- `src/app/guards`：受保护路由守卫
- `src/app/layouts`：后台布局（Header + Sider + Content）
- `src/app/navigation`：路由与菜单配置
- `src/api`：前端 API 封装（auth / memory）
- `src/pages`：页面实现

## 开发

```bash
pnpm --filter platform dev
```
