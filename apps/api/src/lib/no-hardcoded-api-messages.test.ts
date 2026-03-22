import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const API_RUNTIME_MESSAGE_FILES = [
  'apps/api/src/modules/agents/agents.service.ts',
  'apps/api/src/modules/auth/auth.middleware.ts',
  'apps/api/src/modules/auth/auth.service.ts',
  'apps/api/src/modules/knowledge/knowledge.router.shared.ts',
  'apps/api/src/modules/knowledge/knowledge.diagnostics.ts',
  'apps/api/src/modules/knowledge/knowledge.service.catalog.ts',
  'apps/api/src/modules/knowledge/knowledge.service.diagnostics.ts',
  'apps/api/src/modules/knowledge/knowledge.service.documents.ts',
  'apps/api/src/modules/knowledge/knowledge.service.helpers.ts',
  'apps/api/src/modules/knowledge/search/knowledge-chroma-collection.service.ts',
  'apps/api/src/modules/knowledge/search/knowledge-chroma-mutation.service.ts',
  'apps/api/src/modules/knowledge/search/knowledge-embedding.service.ts',
  'apps/api/src/modules/knowledge/utils/knowledge-search.errors.ts',
  'apps/api/src/modules/memberships/memberships.service.ts',
  'apps/api/src/modules/projects/adapters/project-conversation-stream.events.ts',
  'apps/api/src/modules/projects/project-conversation-provider.ts',
  'apps/api/src/modules/projects/project-conversation-service.ts',
  'apps/api/src/modules/projects/projects.service.ts',
  'apps/api/src/modules/projects/projects.shared.ts',
  'apps/api/src/modules/projects/validators/project-conversation-turn.validator.ts',
  'apps/api/src/modules/settings/settings.service.sections.ts',
  'apps/api/src/modules/settings/settings.service.validation.ts',
  'apps/api/src/modules/skills/skills.binding.ts',
  'apps/api/src/modules/skills/skills.import.ts',
  'apps/api/src/modules/skills/skills.markdown.ts',
  'apps/api/src/modules/skills/skills.shared.ts',
  'apps/api/src/modules/skills/validators/skills.validator.ts',
  'apps/api/src/routes/memory.ts',
  'apps/api/src/middleware/secure-transport.ts',
  'apps/api/src/lib/validation.ts',
  'apps/api/src/lib/mutation-input.ts',
] as const;

const MESSAGE_KEY_LITERAL_PATTERN = /^[A-Za-z0-9.-]+$/;

const RUNTIME_MESSAGE_PATTERNS = [
  {
    label: 'message literal',
    regex: /(?:^|[,{]\s*)message\s*:\s*(['"`])/gm,
  },
  {
    label: 'createValidationAppError literal',
    regex: /\bcreateValidationAppError\(\s*(['"`])/g,
  },
  {
    label: 'createGatewayError literal',
    regex:
      /\bcreateGatewayError\(\s*(['"`])((?:(?!\1)[\s\S])*?)\1/g,
    allowMessageKeyLiteral: true,
  },
  {
    label: 'createProjectConversationLlmUpstreamError literal',
    regex:
      /\bcreateProjectConversationLlmUpstreamError\(\s*(['"`])((?:(?!\1)[\s\S])*?)\1/g,
    allowMessageKeyLiteral: true,
  },
  {
    label: 'createServiceUnavailableError literal message',
    regex:
      /\bcreateServiceUnavailableError\(\s*[^,]+,\s*(['"`])((?:(?!\1)[\s\S])*?)\1/g,
    allowMessageKeyLiteral: true,
  },
];

const stripComments = (source: string): string => {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
};

const REMAINING_SWEEP_CHECKLIST: Record<string, string[]> = {
  'apps/api/src/modules/skills/skills.import.ts': [
    'GitHub 元数据',
    '无法识别 raw.githubusercontent.com URL',
    '仅支持 github.com 或 raw.githubusercontent.com URL',
    '无法识别 owner/repo',
    '仅支持 GitHub tree/blob URL',
    'GitHub URL 必须包含 ref',
    'Skill bundle 文件',
    'Skill Markdown',
  ],
  'apps/api/src/modules/skills/skills.markdown.ts': [
    '无法解析 frontmatter 行',
    'frontmatter 多行字段',
    'frontmatter 字段',
    'SKILL.md 顶部必须以 --- frontmatter 开头',
    '请补齐 frontmatter 结束分隔线 ---',
    'frontmatter 必须包含非空 name',
    'frontmatter 必须包含非空 description',
  ],
  'apps/api/src/modules/projects/projects.shared.ts': [
    '未知成员',
    '项目对话入口',
    '项目上下文',
    '当前对话暂无消息。',
  ],
  'apps/api/src/modules/projects/adapters/project-conversation-stream.events.ts': [
    '服务暂时不可用',
  ],
  'apps/api/src/modules/agents/agents.service.ts': [
    '以下知识库不存在：',
  ],
  'apps/api/src/modules/skills/skills.binding.ts': [
    '以下 Skill 不存在：',
    '以下 Skill 尚未发布，暂不可绑定：',
    'Skill 绑定校验失败',
  ],
  'apps/api/src/modules/skills/skills.shared.ts': [
    '个项目',
    '个智能体',
    '删除',
    '回退为草稿',
    'Skill 已被',
    '非法文件路径：',
  ],
  'apps/api/src/modules/knowledge/knowledge.service.catalog.ts': [
    'Chroma 知识库向量清理失败',
  ],
  'apps/api/src/modules/knowledge/knowledge.diagnostics.ts': [
    '诊断请求失败',
    'Python indexer 诊断不可达',
    'Python indexer 请求失败',
    'Python indexer 诊断请求失败',
    'Python indexer 诊断响应格式不合法',
  ],
  'apps/api/src/modules/knowledge/knowledge.service.diagnostics.ts': [
    'Python indexer 诊断不可达',
  ],
  'apps/api/src/modules/knowledge/knowledge.service.documents.ts': [
    'Chroma 文档向量清理失败',
  ],
  'apps/api/src/modules/knowledge/search/knowledge-chroma-mutation.service.ts': [
    'Python indexer 删除知识库向量失败',
    'Python indexer 删除文档向量失败',
  ],
  'apps/api/src/modules/settings/settings.service.sections.ts': [
    'chunkOverlap 必须小于 chunkSize',
  ],
  'apps/api/src/lib/validation.ts': [
    '${field} 为必填项',
    '${field} 必须为字符串',
  ],
};

test('api runtime modules do not hardcode user-facing messages', () => {
  const workspaceRoot = join(process.cwd(), '..', '..');
  const violations: string[] = [];

  for (const relativePath of API_RUNTIME_MESSAGE_FILES) {
    const source = stripComments(
      readFileSync(join(workspaceRoot, relativePath), 'utf8'),
    );

    for (const pattern of RUNTIME_MESSAGE_PATTERNS) {
      for (const match of source.matchAll(pattern.regex)) {
        if (
          pattern.allowMessageKeyLiteral &&
          MESSAGE_KEY_LITERAL_PATTERN.test(match[2] ?? '')
        ) {
          continue;
        }

        violations.push(`${relativePath}: ${pattern.label}`);
      }
    }
  }

  assert.deepEqual(violations, []);
});

test('knowledge search error helpers do not return hardcoded literal messages', () => {
  const workspaceRoot = join(process.cwd(), '..', '..');
  const source = stripComments(
    readFileSync(
      join(
        workspaceRoot,
        'apps/api/src/modules/knowledge/utils/knowledge-search.errors.ts',
      ),
      'utf8',
    ),
  );

  const literalReturns = Array.from(
    source.matchAll(/\breturn\s*(['"`])((?:(?!\1)[\s\S])*?)\1/g),
  )
    .filter((match) => !MESSAGE_KEY_LITERAL_PATTERN.test(match[2] ?? ''))
    .map(
      () =>
        'apps/api/src/modules/knowledge/utils/knowledge-search.errors.ts: return literal',
    );

  assert.deepEqual(literalReturns, []);
});

test('remaining task-4 sweep checklist has no known hardcoded runtime/detail literals', () => {
  const workspaceRoot = join(process.cwd(), '..', '..');
  const violations: string[] = [];

  for (const [relativePath, snippets] of Object.entries(REMAINING_SWEEP_CHECKLIST)) {
    const source = stripComments(
      readFileSync(join(workspaceRoot, relativePath), 'utf8'),
    );

    for (const snippet of snippets) {
      if (source.includes(snippet)) {
        violations.push(`${relativePath}: ${snippet}`);
      }
    }
  }

  assert.deepEqual(violations, []);
});
