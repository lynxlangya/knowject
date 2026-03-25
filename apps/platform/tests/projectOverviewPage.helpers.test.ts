import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveProjectOverviewSummaryItems } from '../src/pages/project/projectOverviewPage.helpers';

test('overview summary items fail-close to unavailable during initial loading with empty items', () => {
  assert.equal(
    resolveProjectOverviewSummaryItems({
      loading: true,
      error: null,
      items: [],
    }),
    undefined,
  );
});

test('overview summary items keep existing items during loading', () => {
  const items = [{ id: 'c-1' }];
  assert.equal(
    resolveProjectOverviewSummaryItems({
      loading: true,
      error: null,
      items,
    }),
    items,
  );
});

test('overview summary items fail-close to unavailable on error', () => {
  assert.equal(
    resolveProjectOverviewSummaryItems({
      loading: false,
      error: 'network failed',
      items: [{ id: 'c-1' }],
    }),
    undefined,
  );
});

