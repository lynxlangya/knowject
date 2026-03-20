# 工程治理评审清单

## 使用说明

- 对于不适用项，请标记 `N/A` 并在备注中简要说明缘由。
- 在“例外记录”项中附带异常记录位置（计划/文件/Issue 等），方便后续跟踪。

## 结构治理

- [ ] 是否触发巨石文件评估
- [ ] 是否存在职责失真
- 参考 `[code-structure-governance.md](code-structure-governance.md)` 了解触发矩阵、推荐动作与例外记录要求。

## 注释治理

- [ ] 核心流程是否需要中文意图注释
- 参考 `[core-code-commenting.md](core-code-commenting.md)` 确认哪些业务逻辑需要中文意图说明以及例外处理。

## 配置与安全

- [ ] 是否引入新的 secrets / 暴露面风险
- 参考 `[config-security-governance.md](config-security-governance.md)` 复核暴露面规则和安全验证步骤。

## 前端通用封装

- [ ] 是否出现稳定复用模式
- 参考 `[frontend-shared-abstractions.md](frontend-shared-abstractions.md)` 判断哪些逻辑应抽象为共享组件/Hook。

## 文档同步

- [ ] 是否触发 current / plans / contracts / README / AGENTS 更新
- 参考 `[document-sync-governance.md](document-sync-governance.md)` 里的同步矩阵和例外记录机制。

## 例外记录

- [ ] 若延期处理，是否记录位置 / 原因 / 风险 / 去向
