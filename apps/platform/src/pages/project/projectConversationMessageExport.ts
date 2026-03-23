import type { ProjectConversationMessageRole } from '@api/projects';
import i18n from '../../i18n';
import { tp } from './project.i18n';

export interface ConversationMessageExportItem {
  id: string;
  role: ProjectConversationMessageRole;
  content: string;
  createdAt: string;
}

export interface BuildConversationMessageMarkdownOptions {
  conversationTitle: string;
  messages: ConversationMessageExportItem[];
}

const normalizeWhitespace = (value: string): string => {
  return value.replace(/\s+/g, ' ').trim();
};

const formatMessageTimestamp = (value: string): string => {
  return new Intl.DateTimeFormat(i18n.resolvedLanguage || 'en', {
    localeMatcher: 'best fit',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

const formatConversationMessageRole = (
  role: ProjectConversationMessageRole,
): string => {
  return role === 'assistant'
    ? tp('conversation.roleAssistant')
    : tp('conversation.roleUser');
};

export const normalizeMarkdownFileName = (value: string): string => {
  const normalizedBaseName = normalizeWhitespace(value)
    .replace(/\.md$/i, '')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .trim();

  return normalizedBaseName ? `${normalizedBaseName}.md` : tp('conversation.exportFile');
};

export const buildConversationMessageMarkdown = ({
  conversationTitle,
  messages,
}: BuildConversationMessageMarkdownOptions): string => {
  const sortedMessages = [...messages].sort((left, right) => {
    return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
  });
  const normalizedTitle =
    normalizeWhitespace(conversationTitle) || tp('conversation.exportFallbackTitle');
  const sections = sortedMessages.map((message) => {
    return [
      `### ${formatConversationMessageRole(message.role)} · ${formatMessageTimestamp(message.createdAt)}`,
      message.content.trim(),
    ].join('\n');
  });

  return [`# ${normalizedTitle}`, ...sections].join('\n\n');
};

export {
  buildKnowledgeDraftDefaults,
  type BuildKnowledgeDraftDefaultsOptions,
  type KnowledgeDraftDefaults,
} from './projectKnowledgeDraft.helpers';
