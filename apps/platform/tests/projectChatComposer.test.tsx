import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import type { ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { tp as projectTp } from '../src/pages/project/project.i18n';

const require = createRequire(import.meta.url);
require.extensions['.css'] = () => undefined;

const escapeRegExp = (value: string): string => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

test('project chat composer renders a split editor shell with only plus and send controls by default', async () => {
  const React = await import('react');
  globalThis.React = React;
  const { ProjectChatComposer } = await import(
    '../src/pages/project/components/ProjectChatComposer'
  );
  type ComposerProps = ComponentProps<typeof ProjectChatComposer>;

  const props: ComposerProps = {
    availableSkills: [],
    value: '',
    canSubmit: false,
    sendActionLocked: false,
    isStreaming: false,
    submitLoading: false,
    selectedSkillId: null,
    onValueChange: () => undefined,
    onSelectedSkillIdChange: () => undefined,
    onSubmit: () => undefined,
    onStop: () => undefined,
  };
  const html = renderToStaticMarkup(
    React.createElement(ProjectChatComposer, props),
  );

  assert.match(html, /data-project-chat-composer="true"/);
  assert.match(html, /data-project-chat-composer-editor="true"/);
  assert.match(html, /data-project-chat-composer-toolbar="true"/);
  assert.match(
    html,
    new RegExp(
      `aria-label="${escapeRegExp(projectTp('conversation.composerPlusAria'))}"[^>]*data-project-chat-composer-plus="true"`,
    ),
  );
  assert.match(
    html,
    new RegExp(
      `aria-label="${escapeRegExp(projectTp('conversation.skillPicker.triggerAria'))}"[^>]*data-project-chat-composer-skill-trigger="true"`,
    ),
  );
  assert.match(
    html,
    new RegExp(
      `aria-label="${escapeRegExp(projectTp('conversation.sendAria'))}"[^>]*data-project-chat-composer-submit="true"`,
    ),
  );
  assert.doesNotMatch(html, /data-project-chat-composer-stop="true"/);
  assert.equal(html.match(/<button\b/g)?.length, 3);
});

test('project chat composer swaps the send slot to stop while streaming', async () => {
  const React = await import('react');
  globalThis.React = React;
  const { ProjectChatComposer } = await import(
    '../src/pages/project/components/ProjectChatComposer'
  );
  type ComposerProps = ComponentProps<typeof ProjectChatComposer>;

  const props: ComposerProps = {
    availableSkills: [],
    value: '请继续整理当前项目计划',
    canSubmit: false,
    sendActionLocked: true,
    isStreaming: true,
    submitLoading: false,
    selectedSkillId: null,
    onValueChange: () => undefined,
    onSelectedSkillIdChange: () => undefined,
    onSubmit: () => undefined,
    onStop: () => undefined,
  };
  const html = renderToStaticMarkup(
    React.createElement(ProjectChatComposer, props),
  );

  assert.match(
    html,
    new RegExp(
      `aria-label="${escapeRegExp(projectTp('conversation.stop'))}"[^>]*data-project-chat-composer-stop="true"`,
    ),
  );
  assert.doesNotMatch(html, /data-project-chat-composer-submit="true"/);
  assert.equal(html.match(/<button\b/g)?.length, 3);
});

test('project chat composer shows the active skill pill when a skill is selected', async () => {
  const React = await import('react');
  globalThis.React = React;
  const { ProjectChatComposer } = await import(
    '../src/pages/project/components/ProjectChatComposer'
  );
  type ComposerProps = ComponentProps<typeof ProjectChatComposer>;

  const props: ComposerProps = {
    availableSkills: [
      {
        id: 'skill-1',
        name: '需求去歧义',
        description: '帮助当前轮次把问题澄清为可执行描述',
      },
    ],
    value: '',
    canSubmit: false,
    sendActionLocked: false,
    isStreaming: false,
    submitLoading: false,
    selectedSkillId: 'skill-1',
    onValueChange: () => undefined,
    onSelectedSkillIdChange: () => undefined,
    onSubmit: () => undefined,
    onStop: () => undefined,
  };
  const html = renderToStaticMarkup(
    React.createElement(ProjectChatComposer, props),
  );

  assert.match(html, /data-project-chat-composer-skill-pill="true"/);
  assert.match(
    html,
    new RegExp(
      escapeRegExp(projectTp('conversation.skillPicker.activeLabel', { name: '需求去歧义' })),
    ),
  );
});
