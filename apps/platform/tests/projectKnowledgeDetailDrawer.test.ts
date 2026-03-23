import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const escapeRegExp = (value: string): string => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

test('ProjectKnowledgeDetailDrawer uses Alert title instead of deprecated message prop', () => {
  const drawerSource = readFileSync(
    new URL(
      '../src/pages/project/components/ProjectKnowledgeDetailDrawer.tsx',
      import.meta.url,
    ),
    'utf8',
  );
  const alertTitleKeys = [
    'resources.alertProjectKnowledge',
    'resources.access.globalTitle',
    'resources.detail.diagnosticsTitle',
    'resources.detail.collectionAbnormal',
    'resources.detail.indexerDegraded',
  ];

  alertTitleKeys.forEach((key) => {
    assert.doesNotMatch(
      drawerSource,
      new RegExp(`message=\\{tp\\('${escapeRegExp(key)}'\\)\\}`),
    );
    assert.match(
      drawerSource,
      new RegExp(`title=\\{tp\\('${escapeRegExp(key)}'\\)\\}`),
    );
  });
});
