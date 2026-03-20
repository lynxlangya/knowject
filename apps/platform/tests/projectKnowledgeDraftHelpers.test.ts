import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildProjectKnowledgeDraftSessionKey,
  resolveProjectKnowledgeDraftSelection,
  saveProjectKnowledgeDraftDocument,
} from '../src/pages/project/projectKnowledgeDraft.helpers';

test('buildProjectKnowledgeDraftSessionKey 使用 projectId:chatId 格式', () => {
  assert.equal(
    buildProjectKnowledgeDraftSessionKey('project-1', 'chat-1'),
    'project-1:chat-1',
  );
});

test('resolveProjectKnowledgeDraftSelection 优先回填当前会话上次使用的 knowledgeId', () => {
  const selected = resolveProjectKnowledgeDraftSelection({
    projectId: 'project-1',
    chatId: 'chat-1',
    projectKnowledgeIds: ['knowledge-1', 'knowledge-2'],
    lastUsedKnowledgeIdBySession: {
      'project-1:chat-1': 'knowledge-2',
    },
  });

  assert.equal(selected, 'knowledge-2');
});

test('resolveProjectKnowledgeDraftSelection 返回 null 当无历史记录', () => {
  const selected = resolveProjectKnowledgeDraftSelection({
    projectId: 'project-2',
    chatId: 'chat-2',
    projectKnowledgeIds: ['knowledge-1'],
    lastUsedKnowledgeIdBySession: {},
  });

  assert.equal(selected, null);
});

test('resolveProjectKnowledgeDraftSelection 返回 null 当历史 knowledgeId 已失效', () => {
  const selected = resolveProjectKnowledgeDraftSelection({
    projectId: 'project-1',
    chatId: 'chat-1',
    projectKnowledgeIds: ['knowledge-1'],
    lastUsedKnowledgeIdBySession: {
      'project-1:chat-1': 'knowledge-2',
    },
  });

  assert.equal(selected, null);
});

test('saveProjectKnowledgeDraftDocument 在缺少 knowledgeId 时直接返回错误', async () => {
  const result = await saveProjectKnowledgeDraftDocument({
    activeProjectId: 'project-1',
    knowledgeId: null,
    draft: {
      documentTitle: '周会复盘',
      markdownContent: '# 周会',
    },
    uploadProjectKnowledgeDocument: async () => {
      throw new Error('should not run');
    },
  });

  assert.equal(result.status, 'error');
  assert.match(result.message ?? '', /请先选择项目私有知识库/);
});

test('saveProjectKnowledgeDraftDocument 只调用上传函数，不再创建知识库', async () => {
  let uploadCalled = 0;

  const result = await saveProjectKnowledgeDraftDocument({
    activeProjectId: 'project-1',
    knowledgeId: 'knowledge-1',
    draft: {
      documentTitle: '周会复盘',
      markdownContent: '# 周会',
    },
    uploadProjectKnowledgeDocument: async () => {
      uploadCalled += 1;
    },
  });

  assert.equal(uploadCalled, 1);
  assert.equal(result.status, 'success');
});
