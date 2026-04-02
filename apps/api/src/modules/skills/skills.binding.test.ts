import assert from 'node:assert/strict';
import test from 'node:test';
import { createSkillBindingValidator } from './skills.binding.js';

test('binding validator accepts legacy builtin skill ids for compatibility', async () => {
  const validator = createSkillBindingValidator({
    repository: {
      findSkillsByIds: async () => [],
    },
  });

  await assert.doesNotReject(() =>
    validator.assertBindableSkillIds(
      ['search_codebase', 'check_git_log', 'search_documents'],
      {
        fieldName: 'boundSkillIds',
      },
    ),
  );
});
