export interface ParsedSkillMarkdownPreview {
  valid: boolean;
  errors: string[];
  name: string;
  description: string;
  body: string;
}

const FRONTMATTER_BOUNDARY = '---';

const parseFrontmatterEntries = (source: string): Record<string, string> => {
  return source.split('\n').reduce<Record<string, string>>((result, line) => {
    const match = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line.trim());

    if (!match) {
      return result;
    }

    const [, key, rawValue] = match;
    result[key] = rawValue.replace(/^['"]|['"]$/g, '').trim();
    return result;
  }, {});
};

export const parseSkillMarkdownPreview = (
  source: string,
): ParsedSkillMarkdownPreview => {
  const normalized = source.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  const errors: string[] = [];

  if (lines[0]?.trim() !== FRONTMATTER_BOUNDARY) {
    errors.push('SKILL.md 顶部必须以 --- frontmatter 开头。');

    return {
      valid: false,
      errors,
      name: '',
      description: '',
      body: normalized.trim(),
    };
  }

  const closingIndex = lines.findIndex(
    (line, index) => index > 0 && line.trim() === FRONTMATTER_BOUNDARY,
  );

  if (closingIndex <= 0) {
    errors.push('请补齐 frontmatter 结束分隔线 ---。');

    return {
      valid: false,
      errors,
      name: '',
      description: '',
      body: normalized.trim(),
    };
  }

  const frontmatter = parseFrontmatterEntries(lines.slice(1, closingIndex).join('\n'));
  const name = frontmatter.name?.trim() ?? '';
  const description = frontmatter.description?.trim() ?? '';
  const body = lines.slice(closingIndex + 1).join('\n').trim();

  if (!name) {
    errors.push('frontmatter 必须包含非空 name。');
  }

  if (!description) {
    errors.push('frontmatter 必须包含非空 description。');
  }

  return {
    valid: errors.length === 0,
    errors,
    name,
    description,
    body,
  };
};

export const buildSkillMarkdownTemplate = (): string => {
  return `---
name: 新 Skill
description: 用一句话说明这个 Skill 解决什么问题。
---

# 背景

- 这个 Skill 的目标是什么
- 适合在什么场景下使用

## 工作方式

- 第一步做什么
- 第二步做什么

## 边界

- 明确不处理什么
`;
};
