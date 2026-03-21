import { createValidationAppError } from '@lib/validation.js';
import { getFallbackMessage } from '@lib/locale.messages.js';

type SkillFrontmatterValue = string | number | boolean | string[];

export interface ParsedSkillMarkdown {
  skillMarkdown: string;
  frontmatter: Record<string, SkillFrontmatterValue>;
  body: string;
  name: string;
  description: string;
}

const FRONTMATTER_BOUNDARY = '---';

const normalizeMarkdown = (value: string): string => {
  return value.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').trim();
};

const stripWrappingQuotes = (value: string): string => {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
};

const parseScalarValue = (value: string): SkillFrontmatterValue => {
  const normalized = stripWrappingQuotes(value.trim());

  if (normalized === 'true') {
    return true;
  }

  if (normalized === 'false') {
    return false;
  }

  if (/^-?\d+(\.\d+)?$/.test(normalized)) {
    return Number(normalized);
  }

  if (normalized.startsWith('[') && normalized.endsWith(']')) {
    return normalized
      .slice(1, -1)
      .split(',')
      .map((item) => stripWrappingQuotes(item.trim()))
      .filter(Boolean);
  }

  return normalized;
};

const parseFrontmatterBlock = (
  source: string,
): Record<string, SkillFrontmatterValue> => {
  const lines = source.split('\n');
  const result: Record<string, SkillFrontmatterValue> = {};

  for (let index = 0; index < lines.length; ) {
    const line = lines[index] ?? '';
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    const keyMatch = /^([A-Za-z0-9_-]+):(?:\s*(.*))?$/.exec(line);
    if (!keyMatch) {
      throw createValidationAppError(
        getFallbackMessage('validation.skillMarkdown.frontmatter.parse'),
        {
          skillMarkdown: `无法解析 frontmatter 行：${trimmed}`,
        },
        'validation.skillMarkdown.frontmatter.parse',
      );
    }

    const key = keyMatch[1];
    const rawValue = keyMatch[2]?.trim() ?? '';

    if (rawValue === '|' || rawValue === '>') {
      const blockLines: string[] = [];
      let cursor = index + 1;

      while (cursor < lines.length) {
        const nextLine = lines[cursor] ?? '';

        if (!nextLine.trim()) {
          blockLines.push('');
          cursor += 1;
          continue;
        }

        if (/^[A-Za-z0-9_-]+:/.test(nextLine)) {
          break;
        }

        if (!/^\s+/.test(nextLine)) {
          throw createValidationAppError(
            getFallbackMessage('validation.skillMarkdown.frontmatter.parse'),
            {
              skillMarkdown: `frontmatter 多行字段 ${key} 缩进不合法`,
            },
            'validation.skillMarkdown.frontmatter.parse',
          );
        }

        blockLines.push(nextLine.replace(/^\s{2}/, '').trimEnd());
        cursor += 1;
      }

      result[key] =
        rawValue === '>'
          ? blockLines.join(' ').replace(/\s+/g, ' ').trim()
          : blockLines.join('\n').trim();
      index = cursor;
      continue;
    }

    if (!rawValue) {
      const arrayValues: string[] = [];
      const blockLines: string[] = [];
      let mode: 'array' | 'block' | null = null;
      let cursor = index + 1;

      while (cursor < lines.length) {
        const nextLine = lines[cursor] ?? '';

        if (!nextLine.trim()) {
          if (mode === 'block') {
            blockLines.push('');
          }

          cursor += 1;
          continue;
        }

        if (/^[A-Za-z0-9_-]+:/.test(nextLine)) {
          break;
        }

        if (/^\s*-\s+/.test(nextLine)) {
          mode = 'array';
          arrayValues.push(nextLine.replace(/^\s*-\s+/, '').trim());
          cursor += 1;
          continue;
        }

        if (/^\s+/.test(nextLine)) {
          mode = 'block';
          blockLines.push(nextLine.replace(/^\s{2}/, '').trimEnd());
          cursor += 1;
          continue;
        }

        throw createValidationAppError(
          getFallbackMessage('validation.skillMarkdown.frontmatter.parse'),
          {
            skillMarkdown: `frontmatter 字段 ${key} 格式不合法`,
          },
          'validation.skillMarkdown.frontmatter.parse',
        );
      }

      result[key] =
        mode === 'array'
          ? arrayValues
          : mode === 'block'
            ? blockLines.join('\n').trim()
            : '';
      index = cursor;
      continue;
    }

    result[key] = parseScalarValue(rawValue);
    index += 1;
  }

  return result;
};

const stringifyFrontmatterValue = (value: SkillFrontmatterValue): string[] => {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return ['[]'];
    }

    return ['', ...value.map((item) => `  - ${item}`)];
  }

  if (typeof value === 'boolean' || typeof value === 'number') {
    return [String(value)];
  }

  if (value.includes('\n')) {
    return ['|', ...value.split('\n').map((line) => `  ${line}`)];
  }

  return [/[:#]/.test(value) || value.trim() !== value ? JSON.stringify(value) : value];
};

export const parseSkillMarkdown = (value: string): ParsedSkillMarkdown => {
  const normalized = normalizeMarkdown(value);

  if (!normalized) {
    throw createValidationAppError(
      getFallbackMessage('validation.skillMarkdown.empty'),
      {
        skillMarkdown: getFallbackMessage('validation.required.skillMarkdown'),
      },
      'validation.skillMarkdown.empty',
    );
  }

  const lines = normalized.split('\n');

  if (lines[0]?.trim() !== FRONTMATTER_BOUNDARY) {
    throw createValidationAppError(
      getFallbackMessage('validation.skillMarkdown.frontmatter.required'),
      {
        skillMarkdown: 'SKILL.md 顶部必须以 --- frontmatter 开头',
      },
      'validation.skillMarkdown.frontmatter.required',
    );
  }

  const closingIndex = lines.findIndex(
    (line, index) => index > 0 && line.trim() === FRONTMATTER_BOUNDARY,
  );

  if (closingIndex <= 0) {
    throw createValidationAppError(
      getFallbackMessage('validation.skillMarkdown.frontmatter.unclosed'),
      {
        skillMarkdown: '请补齐 frontmatter 结束分隔线 ---',
      },
      'validation.skillMarkdown.frontmatter.unclosed',
    );
  }

  const frontmatter = parseFrontmatterBlock(lines.slice(1, closingIndex).join('\n'));
  const body = lines.slice(closingIndex + 1).join('\n').trim();
  const rawName = frontmatter.name;
  const rawDescription = frontmatter.description;
  const name = typeof rawName === 'string' ? rawName.trim() : '';
  const description = typeof rawDescription === 'string' ? rawDescription.trim() : '';

  if (!name) {
    throw createValidationAppError(
      getFallbackMessage('validation.skillMarkdown.frontmatter.nameRequired'),
      {
        skillMarkdown: 'frontmatter 必须包含非空 name',
      },
      'validation.skillMarkdown.frontmatter.nameRequired',
    );
  }

  if (!description) {
    throw createValidationAppError(
      getFallbackMessage(
        'validation.skillMarkdown.frontmatter.descriptionRequired',
      ),
      {
        skillMarkdown: 'frontmatter 必须包含非空 description',
      },
      'validation.skillMarkdown.frontmatter.descriptionRequired',
    );
  }

  const skillMarkdown = `${[
    FRONTMATTER_BOUNDARY,
    ...serializeFrontmatter(frontmatter),
    FRONTMATTER_BOUNDARY,
    body,
  ]
    .join('\n')
    .trim()}\n`;

  return {
    skillMarkdown,
    frontmatter,
    body,
    name,
    description,
  };
};

export const serializeFrontmatter = (
  frontmatter: Record<string, SkillFrontmatterValue>,
): string[] => {
  return Object.entries(frontmatter).flatMap(([key, value]) => {
    const renderedValue = stringifyFrontmatterValue(value);

    if (renderedValue.length === 1) {
      return `${key}: ${renderedValue[0]}`;
    }

    return [`${key}: ${renderedValue[0]}`, ...renderedValue.slice(1)];
  });
};

export const mergeSkillMarkdownMetadata = (
  sourceMarkdown: string,
  patch: {
    name?: string;
    description?: string;
  },
): ParsedSkillMarkdown => {
  const parsed = parseSkillMarkdown(sourceMarkdown);
  const nextFrontmatter: Record<string, SkillFrontmatterValue> = {
    ...parsed.frontmatter,
  };

  if (patch.name !== undefined) {
    nextFrontmatter.name = patch.name.trim();
  }

  if (patch.description !== undefined) {
    nextFrontmatter.description = patch.description.trim();
  }

  return parseSkillMarkdown(
    [
      FRONTMATTER_BOUNDARY,
      ...serializeFrontmatter(nextFrontmatter),
      FRONTMATTER_BOUNDARY,
      parsed.body,
    ]
      .join('\n')
      .trim(),
  );
};
