import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('Skill catalog actions include a dedicated view action', () => {
  const paneSource = readFileSync(
    new URL('../src/pages/skills/components/SkillDetailPane.tsx', import.meta.url),
    'utf8',
  );
  const actionSource = readFileSync(
    new URL('../src/pages/skills/hooks/useSkillCatalogActions.ts', import.meta.url),
    'utf8',
  );

  assert.match(paneSource, /key:\s*'view'/);
  assert.match(actionSource, /if \(actionKey === 'view'\)/);
});

test('SkillsManagementPage wires a read-only SkillViewerDrawer', () => {
  const source = readFileSync(
    new URL('../src/pages/skills/SkillsManagementPage.tsx', import.meta.url),
    'utf8',
  );

  assert.match(source, /import \{ SkillViewerDrawer \} from '\.\/components\/SkillViewerDrawer';/);
  assert.match(source, /const skillViewer = useSkillViewer\(/);
  assert.match(source, /<SkillViewerDrawer[\s\S]*viewerOpen=\{skillViewer.viewerOpen\}/);
});

test('SkillViewerDrawer uses a Drawer with markdown preview content', () => {
  const source = readFileSync(
    new URL('../src/pages/skills/components/SkillViewerDrawer.tsx', import.meta.url),
    'utf8',
  );

  assert.match(source, /import \{ Drawer, Spin, Typography \} from 'antd';/);
  assert.match(source, /<Drawer[\s\S]*open=\{viewerOpen\}/);
  assert.match(source, /<SkillMarkdownPreview/);
  assert.doesNotMatch(source, /<Input/);
  assert.doesNotMatch(source, /<Select/);
});

test('SkillMarkdownPreview keeps only the markdown card without summary panels', () => {
  const source = readFileSync(
    new URL('../src/pages/skills/components/SkillMarkdownPreview.tsx', import.meta.url),
    'utf8',
  );

  assert.match(source, /import \{ Card \} from 'antd';/);
  assert.match(source, /<Card[\s\S]*<pre/);
  assert.doesNotMatch(source, /skills\.preview\.title/);
  assert.doesNotMatch(source, /getSkillDefinitionListSections/);
  assert.doesNotMatch(source, /getSkillFollowupStrategyOptions/);
  assert.doesNotMatch(source, /rounded-card-lg border border-slate-200 bg-slate-50\/80 p-5/);
});
