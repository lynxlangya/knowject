import { tp } from './skills.i18n';

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
    errors.push(tp('markdown.missingOpening'));

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
    errors.push(tp('markdown.missingClosing'));

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
    errors.push(tp('markdown.missingName'));
  }

  if (!description) {
    errors.push(tp('markdown.missingDescription'));
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
name: ${tp('markdown.templateName')}
description: ${tp('markdown.templateDescription')}
---

# ${tp('markdown.templateBackground')}

- ${tp('markdown.templateBackgroundGoal')}
- ${tp('markdown.templateBackgroundScene')}

## ${tp('markdown.templateFlow')}

- ${tp('markdown.templateStepOne')}
- ${tp('markdown.templateStepTwo')}

## ${tp('markdown.templateBoundary')}

- ${tp('markdown.templateBoundaryItem')}
`;
};
