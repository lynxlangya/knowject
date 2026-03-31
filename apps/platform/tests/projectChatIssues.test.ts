import assert from 'node:assert/strict';
import test from 'node:test';
import i18n from '../src/i18n';
import {
  buildProjectChatIssueFromError,
  isInlineProjectChatIssue,
} from '../src/pages/project/projectChatIssues';

const createApiError = (
  message: string,
  code: string,
): Error & { code: string } => {
  const error = new Error(message) as Error & { code: string };
  error.name = 'ApiError';
  error.code = code;
  return error;
};

test('buildProjectChatIssueFromError maps retrieval and stream failures to inline issues', async () => {
  await i18n.changeLanguage('en');

  const retrievalIssue = buildProjectChatIssueFromError(
    createApiError(
      'Python indexer request failed',
      'KNOWLEDGE_SEARCH_UPSTREAM_ERROR',
    ),
    'fallback',
  );
  const streamIssue = buildProjectChatIssueFromError(
    createApiError(
      'Stream ended before done event',
      'PROJECT_CONVERSATION_STREAM_UNEXPECTED_EOF',
    ),
    'fallback',
  );

  assert.deepEqual(retrievalIssue, {
    code: 'KNOWLEDGE_SEARCH_UPSTREAM_ERROR',
    title: 'Project retrieval is currently unavailable',
    description: 'Python indexer request failed',
  });
  assert.deepEqual(streamIssue, {
    code: 'PROJECT_CONVERSATION_STREAM_UNEXPECTED_EOF',
    title: 'Project chat stream ended unexpectedly',
    description: 'Stream ended before done event',
  });
  assert.equal(isInlineProjectChatIssue(retrievalIssue), true);
  assert.equal(isInlineProjectChatIssue(streamIssue), true);
});
