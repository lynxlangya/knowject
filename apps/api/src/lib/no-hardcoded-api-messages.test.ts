import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const API_RUNTIME_MESSAGE_FILES = [
  'apps/api/src/modules/agents/agents.service.ts',
  'apps/api/src/modules/knowledge/knowledge.router.shared.ts',
  'apps/api/src/modules/knowledge/knowledge.service.catalog.ts',
  'apps/api/src/modules/knowledge/knowledge.service.documents.ts',
  'apps/api/src/modules/knowledge/knowledge.service.helpers.ts',
  'apps/api/src/modules/knowledge/search/knowledge-chroma-collection.service.ts',
  'apps/api/src/modules/knowledge/search/knowledge-chroma-mutation.service.ts',
  'apps/api/src/modules/knowledge/search/knowledge-embedding.service.ts',
  'apps/api/src/modules/knowledge/utils/knowledge-search.errors.ts',
  'apps/api/src/modules/memberships/memberships.service.ts',
  'apps/api/src/modules/projects/project-conversation-provider.ts',
  'apps/api/src/modules/projects/project-conversation-service.ts',
  'apps/api/src/modules/projects/projects.service.ts',
  'apps/api/src/modules/projects/projects.shared.ts',
  'apps/api/src/modules/projects/validators/project-conversation-turn.validator.ts',
  'apps/api/src/modules/settings/settings.service.validation.ts',
  'apps/api/src/modules/skills/skills.import.ts',
  'apps/api/src/modules/skills/skills.markdown.ts',
  'apps/api/src/modules/skills/skills.shared.ts',
  'apps/api/src/modules/skills/validators/skills.validator.ts',
  'apps/api/src/middleware/secure-transport.ts',
  'apps/api/src/lib/mutation-input.ts',
] as const;

const MESSAGE_KEY_LITERAL_PATTERN = /^[A-Za-z0-9.-]+$/;

const RUNTIME_MESSAGE_PATTERNS = [
  {
    label: 'message literal',
    regex: /\bmessage\s*:\s*(['"`])/g,
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
