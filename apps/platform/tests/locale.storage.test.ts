import assert from 'node:assert/strict';
import test from 'node:test';
import { readGuestLocale } from '../src/app/providers/locale.storage';

test('readGuestLocale normalizes stored guest locale and falls back to english', () => {
  assert.equal(readGuestLocale('zh'), 'zh-CN');
  assert.equal(readGuestLocale(null), 'en');
});
