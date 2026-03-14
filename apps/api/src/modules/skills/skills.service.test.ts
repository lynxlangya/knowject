import assert from 'node:assert/strict';
import test from 'node:test';
import type { SkillsRepository } from './skills.repository.js';
import { createSkillsService } from './skills.service.js';

const createService = () => {
  return createSkillsService({
    repository: {} as SkillsRepository,
  });
};

test('listSkills returns the three builtin skill definitions with stable ids', async () => {
  const service = createService();
  const result = await service.listSkills({
    actor: {
      id: 'user-1',
      username: 'langya',
    },
  });

  assert.equal(result.total, 3);
  assert.deepEqual(
    result.items.map((item) => item.id),
    ['search_codebase', 'check_git_log', 'search_documents'],
  );
  assert.deepEqual(
    result.items.map((item) => item.source),
    ['system', 'system', 'system'],
  );
  assert.equal(result.meta.stage, 'GA-08');
  assert.equal(result.meta.boundaries.registryStore, 'code-registry');
});

test('listSkills exposes service-layer knowledge search and contract-only repository skills', async () => {
  const service = createService();
  const result = await service.listSkills({
    actor: {
      id: 'user-1',
      username: 'langya',
    },
  });

  const searchDocuments = result.items.find((item) => item.id === 'search_documents');
  const searchCodebase = result.items.find((item) => item.id === 'search_codebase');
  const checkGitLog = result.items.find((item) => item.id === 'check_git_log');

  assert.ok(searchDocuments);
  assert.ok(searchCodebase);
  assert.ok(checkGitLog);

  if (!searchDocuments || !searchCodebase || !checkGitLog) {
    throw new Error('expected builtin skill definitions to exist');
  }

  assert.equal(searchDocuments.handler, 'knowledge.search_documents');
  assert.equal(searchDocuments.status, 'available');
  assert.deepEqual(searchDocuments.parametersSchema.required, ['query']);
  assert.deepEqual(searchDocuments.parametersSchema.properties.sourceType?.enum, [
    'global_docs',
    'global_code',
  ]);
  assert.equal(searchDocuments.parametersSchema.properties.topK?.default, 5);

  assert.equal(searchCodebase.status, 'contract_only');
  assert.equal(checkGitLog.status, 'contract_only');
});
