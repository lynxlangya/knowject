import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
require.extensions['.css'] = () => undefined;

test('ProjectChatMarkdown sanitizes legacy class props before spreading DOM props', () => {
  const markdownSource = readFileSync(
    new URL('../src/pages/project/projectChat.markdown.tsx', import.meta.url),
    'utf8',
  );

  assert.match(markdownSource, /class:\s*legacyClassName/);
});

test('project chat drawers use Drawer size instead of deprecated width', () => {
  const projectChatPageSource = readFileSync(
    new URL('../src/pages/project/ProjectChatPage.tsx', import.meta.url),
    'utf8',
  );
  const projectKnowledgeDraftDrawerSource = readFileSync(
    new URL(
      '../src/pages/project/components/ProjectKnowledgeDraftDrawer.tsx',
      import.meta.url,
    ),
    'utf8',
  );

  assert.doesNotMatch(projectChatPageSource, /<Drawer[\s\S]*?width=\{/);
  assert.match(projectChatPageSource, /<Drawer[\s\S]*?size=\{360\}/);

  assert.doesNotMatch(
    projectKnowledgeDraftDrawerSource,
    /<Drawer[\s\S]*?width=\{/,
  );
  assert.match(
    projectKnowledgeDraftDrawerSource,
    /<Drawer[\s\S]*?size=\{520\}/,
  );
});
