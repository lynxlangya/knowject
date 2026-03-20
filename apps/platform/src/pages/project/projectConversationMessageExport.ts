import type { ProjectConversationMessageRole } from '@api/projects';

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

export interface BuildKnowledgeDraftDefaultsOptions {
  conversationTitle: string;
  markdownContent: string;
}

export interface KnowledgeDraftDefaults {
  knowledgeName: string;
  knowledgeDescription: string;
  documentTitle: string;
  markdownContent: string;
}

const DEFAULT_MARKDOWN_FILE_NAME = '项目对话.md';

const normalizeWhitespace = (value: string): string => {
  return value.replace(/\s+/g, ' ').trim();
};

const formatMessageTimestamp = (value: string): string => {
  return new Intl.DateTimeFormat('zh-CN', {
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
  return role === 'assistant' ? '助手' : '用户';
};

export const normalizeMarkdownFileName = (value: string): string => {
  const normalizedBaseName = normalizeWhitespace(value)
    .replace(/\.md$/i, '')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .trim();

  return normalizedBaseName ? `${normalizedBaseName}.md` : DEFAULT_MARKDOWN_FILE_NAME;
};

export const buildConversationMessageMarkdown = ({
  conversationTitle,
  messages,
}: BuildConversationMessageMarkdownOptions): string => {
  const sortedMessages = [...messages].sort((left, right) => {
    return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
  });
  const normalizedTitle = normalizeWhitespace(conversationTitle) || '项目对话';
  const sections = sortedMessages.map((message) => {
    return [
      `### ${formatConversationMessageRole(message.role)} · ${formatMessageTimestamp(message.createdAt)}`,
      message.content.trim(),
    ].join('\n');
  });

  return [`# ${normalizedTitle}`, ...sections].join('\n\n');
};

export const buildKnowledgeDraftDefaults = ({
  conversationTitle,
  markdownContent,
}: BuildKnowledgeDraftDefaultsOptions): KnowledgeDraftDefaults => {
  const documentTitle = normalizeWhitespace(conversationTitle) || '项目对话知识草稿';

  return {
    knowledgeName: documentTitle,
    knowledgeDescription: `基于「${documentTitle}」整理的项目对话知识草稿`,
    documentTitle,
    markdownContent,
  };
};
