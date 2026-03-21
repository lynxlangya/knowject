import assert from 'node:assert/strict';
import test from 'node:test';
import { messages } from './locale.messages.js';

test('locale message dictionaries keep matching keys across locales', () => {
  const locales = Object.keys(messages);
  const referenceLocale = locales[0];

  assert.ok(referenceLocale);

  const referenceKeys = Object.keys(
    messages[referenceLocale as keyof typeof messages] ?? {},
  ).sort();

  for (const locale of locales.slice(1)) {
    assert.deepEqual(
      Object.keys(messages[locale as keyof typeof messages] ?? {}).sort(),
      referenceKeys,
      `Locale ${locale} is missing or has extra message keys`,
    );
  }
});
