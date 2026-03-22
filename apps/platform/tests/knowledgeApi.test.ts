import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('getKnowledgeDiagnostics 为诊断请求配置更长 timeout', () => {
  const apiSource = readFileSync(
    new URL('../src/api/knowledge.ts', import.meta.url),
    'utf8',
  );

  assert.match(
    apiSource,
    /client\.get<ApiEnvelope<KnowledgeDiagnosticsResponse>>\([\s\S]*\/diagnostics[\s\S]*timeout:\s*20000/,
  );
});

test('platform api client 注入 getLocale 参与请求协商', () => {
  const apiSource = readFileSync(
    new URL('../src/api/client.ts', import.meta.url),
    'utf8',
  );

  assert.match(apiSource, /getLocale:/);
});
