import assert from 'node:assert/strict';
import test from 'node:test';
import { resources } from '../src/i18n/resources';

test('locale resources keep matching namespace keys across locales', () => {
  assert.deepEqual(Object.keys(resources.en), Object.keys(resources['zh-CN']));
});
