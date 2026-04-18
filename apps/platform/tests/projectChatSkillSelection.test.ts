import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('ProjectChatPage scopes selected skill state by conversation and keeps it on composer submissions', () => {
  const pageSource = readFileSync(
    new URL('../src/pages/project/ProjectChatPage.tsx', import.meta.url),
    'utf8',
  );

  assert.match(pageSource, /const \[selectedSkillState, setSelectedSkillState\] = useState/);
  assert.match(pageSource, /scopeKey: conversationScopeKey,/);
  assert.match(pageSource, /const selectedSkillId =[\s\S]*selectedSkillState\.scopeKey === conversationScopeKey/);
  assert.match(pageSource, /availableConversationSkills = useMemo/);
  assert.match(pageSource, /\.filter\(\(skill\) => skill\.source === 'team' && skill\.bindable\)/);
  assert.match(pageSource, /selectedSkillId=\{selectedConversationSkill\?\.id \?\? null\}/);
  assert.match(pageSource, /onSelectedSkillIdChange=\{setSelectedSkillId\}/);
  assert.match(pageSource, /void handleSendMessage\(composerValue, \{\s*skillId: selectedConversationSkill\?\.id \?\? undefined,/);
});

test('project chat user and assistant retry flows preserve the selected conversation skill', () => {
  const userActionsSource = readFileSync(
    new URL('../src/pages/project/useProjectChatUserMessageActions.ts', import.meta.url),
    'utf8',
  );
  const assistantActionsSource = readFileSync(
    new URL('../src/pages/project/useProjectConversationMessageActions.ts', import.meta.url),
    'utf8',
  );

  assert.match(userActionsSource, /selectedSkillId\?: string \| null;/);
  assert.match(userActionsSource, /selectedSkillId = null,/);
  assert.match(userActionsSource, /targetUserMessageId: targetUserMessage\.id,[\s\S]*skillId: selectedSkillId/);
  assert.match(userActionsSource, /targetUserMessageId: messageId,[\s\S]*skillId: selectedSkillId/);
  assert.match(assistantActionsSource, /selectedSkillId\?: string \| null;/);
  assert.match(assistantActionsSource, /selectedSkillId = null,/);
  assert.match(assistantActionsSource, /targetUserMessageId: retryTarget\.id,[\s\S]*skillId: selectedSkillId/);
});
