# Changelog Guidelines

此目录用于记录项目的每一次关键变更（新增功能、重构、配置调整）。

## 编号规则

- **NNN**: 全局递增的三位数字（001, 002, ...）。
- **Slug**: 简短的英文标识，描述变更主题（如 `request-init`, `eslint-base`）。
- **Path**: `log/YYYY-MM-DD/NNN-<slug>.md`

## 记录模板 (NNN-<slug>.md)

```markdown
# [NNN] <Title>

## Goal

一句话说明变更目的。

## Scope

涉及的模块或目录。

## Changes

1.  **Action**: Detail... (Why)
2.  ...

## Risk & Rollback

- **Risk**: Potential issues.
- **Rollback**: `git revert <hash>` 或恢复文件的操作。

## Verify

- `command`: Result summary.

## Follow-ups

- [ ] Task 1
```

## 辅助文件

- **NNN-files.txt**: 变更文件列表 (Added/Modified/Deleted)。
- **NNN-commands.txt**: 执行过的验证命令及输出摘要。

## 什么算一次记录？

- 任何非单纯格式化的代码修改。
- 依赖变更。
- 配置变更。
- 功能发布。
