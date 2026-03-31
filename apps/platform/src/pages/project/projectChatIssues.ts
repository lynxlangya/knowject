import { extractApiErrorCode, extractApiErrorMessage } from '../../api/error';
import { tp } from './project.i18n';

export type ProjectChatIssueCode =
  | 'PROJECT_CONVERSATION_LLM_UNAVAILABLE'
  | 'PROJECT_CONVERSATION_LLM_PROVIDER_UNSUPPORTED'
  | 'PROJECT_CONVERSATION_LLM_STREAM_UNSUPPORTED'
  | 'PROJECT_CONVERSATION_LLM_UPSTREAM_ERROR'
  | 'KNOWLEDGE_SEARCH_UPSTREAM_ERROR'
  | 'KNOWLEDGE_SEARCH_CHROMA_UNAVAILABLE'
  | 'KNOWLEDGE_SEARCH_EMBEDDING_UNAVAILABLE'
  | 'PROJECT_CONVERSATION_STREAM_UNEXPECTED_EOF'
  | 'PROJECT_CONVERSATION_STREAM_MISSING_DONE_PAYLOAD';

export interface ProjectChatIssue {
  code: ProjectChatIssueCode;
  title: string;
  description: string;
}

const INLINE_CHAT_ISSUE_CODES = new Set<ProjectChatIssueCode>([
  'PROJECT_CONVERSATION_LLM_UPSTREAM_ERROR',
  'KNOWLEDGE_SEARCH_UPSTREAM_ERROR',
  'KNOWLEDGE_SEARCH_CHROMA_UNAVAILABLE',
  'KNOWLEDGE_SEARCH_EMBEDDING_UNAVAILABLE',
  'PROJECT_CONVERSATION_STREAM_UNEXPECTED_EOF',
  'PROJECT_CONVERSATION_STREAM_MISSING_DONE_PAYLOAD',
]);

export const buildProjectChatIssueFromError = (
  error: unknown,
  fallback: string,
): ProjectChatIssue | null => {
  const code = extractApiErrorCode(error) as ProjectChatIssueCode | null;
  const description = extractApiErrorMessage(error, fallback);

  switch (code) {
    case 'PROJECT_CONVERSATION_LLM_UNAVAILABLE':
      return { code, title: tp('chatSettings.unavailableTitle'), description };
    case 'PROJECT_CONVERSATION_LLM_PROVIDER_UNSUPPORTED':
      return { code, title: tp('chatSettings.providerUnsupportedTitle'), description };
    case 'PROJECT_CONVERSATION_LLM_STREAM_UNSUPPORTED':
      return { code, title: tp('chatSettings.streamUnsupportedTitle'), description };
    case 'PROJECT_CONVERSATION_LLM_UPSTREAM_ERROR':
      return { code, title: tp('chatSettings.upstreamErrorTitle'), description };
    case 'KNOWLEDGE_SEARCH_UPSTREAM_ERROR':
    case 'KNOWLEDGE_SEARCH_CHROMA_UNAVAILABLE':
    case 'KNOWLEDGE_SEARCH_EMBEDDING_UNAVAILABLE':
      return { code, title: tp('chatSettings.retrievalUnavailableTitle'), description };
    case 'PROJECT_CONVERSATION_STREAM_UNEXPECTED_EOF':
    case 'PROJECT_CONVERSATION_STREAM_MISSING_DONE_PAYLOAD':
      return { code, title: tp('chatSettings.streamInterruptedTitle'), description };
    default:
      return null;
  }
};

export const isInlineProjectChatIssue = (
  issue: ProjectChatIssue | null,
): boolean => issue !== null && INLINE_CHAT_ISSUE_CODES.has(issue.code);
