import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('ProjectSkillAccessModal 只允许引入可绑定的 team Skill，并保持多选 Select', () => {
  const modalSource = readFileSync(
    new URL(
      '../src/pages/project/components/ProjectSkillAccessModal.tsx',
      import.meta.url,
    ),
    'utf8',
  );

  assert.match(
    modalSource,
    /const availableSkills = skillsCatalog\.filter\(\s*\(skill\) =>\s*skill\.source === "team" &&\s*skill\.bindable &&\s*!boundSkillIds\.includes\(skill\.id\),\s*\)/,
  );
  assert.match(modalSource, /<Select[\s\S]*mode="multiple"/);
  assert.match(modalSource, /okButtonProps=\{\s*\{\s*disabled: selectedSkillIds\.length === 0,/);
});

test('ProjectResourcesPage 为技能分组接入 Skill access modal，而不是继续展示占位提示', () => {
  const pageSource = readFileSync(
    new URL('../src/pages/project/ProjectResourcesPage.tsx', import.meta.url),
    'utf8',
  );

  assert.match(pageSource, /if \(groupKey === "skills"\) \{/);
  assert.match(pageSource, /setSkillAccessModalOpen\(true\);/);
  assert.match(pageSource, /<ProjectSkillAccessModal/);
  assert.match(pageSource, /updateProjectResourceBindings\(\{\s*projectId: activeProject\.id,[\s\S]*skillIds:/);
});
