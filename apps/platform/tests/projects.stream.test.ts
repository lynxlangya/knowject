import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('projects.stream parser keeps citation_patch in the supported SSE event set', () => {
  const source = readFileSync(
    new URL('../src/api/projects.stream.ts', import.meta.url),
    'utf8',
  );

  assert.match(
    source,
    /const supportedEventTypes = new Set<ProjectConversationStreamEventType>\(\[[\s\S]*?'citation_patch'/,
  );
});
