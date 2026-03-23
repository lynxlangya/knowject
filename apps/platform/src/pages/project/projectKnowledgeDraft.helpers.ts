import { createMarkdownSourceFile } from '../knowledge/knowledgeUpload.shared';
import { tp } from './project.i18n';

export interface BuildKnowledgeDraftDefaultsOptions {
  conversationTitle: string;
  markdownContent: string;
}

export interface KnowledgeDraftDocumentDefaults {
  documentTitle: string;
  markdownContent: string;
}

export interface KnowledgeDraftDefaults extends KnowledgeDraftDocumentDefaults {
  knowledgeName: string;
  knowledgeDescription: string;
}

export interface ResolveProjectKnowledgeDraftSelectionOptions {
  projectId: string;
  chatId: string;
  projectKnowledgeIds: string[];
  lastUsedKnowledgeIdBySession: Record<string, string | undefined>;
}

export interface SaveProjectKnowledgeDraftResult {
  status: 'success' | 'error';
  knowledgeId?: string;
  message?: string;
}

export interface SaveProjectKnowledgeDraftDocumentOptions {
  activeProjectId: string;
  knowledgeId: string | null;
  draft: KnowledgeDraftDocumentDefaults;
  uploadProjectKnowledgeDocument: (
    projectId: string,
    knowledgeId: string,
    file: File,
  ) => Promise<unknown>;
  refreshProjectKnowledge?: () => void | Promise<void>;
}

export const normalizeWhitespace = (value: string): string => {
  return value.replace(/\s+/g, ' ').trim();
};

export const buildKnowledgeDraftDefaults = ({
  conversationTitle,
  markdownContent,
}: BuildKnowledgeDraftDefaultsOptions): KnowledgeDraftDefaults => {
  const documentTitle =
    normalizeWhitespace(conversationTitle) || tp('resources.draft.defaultDocumentTitle');

  // 保留知识字段仅用于兼容当前草稿表单消费者；文档级字段仍是默认值主契约。
  return {
    knowledgeName: documentTitle,
    knowledgeDescription: tp('resources.draft.defaultKnowledgeDescription', {
      title: documentTitle,
    }),
    documentTitle,
    markdownContent,
  };
};

export const buildProjectKnowledgeDraftSessionKey = (
  projectId: string,
  chatId: string,
) => `${projectId}:${chatId}`;

export const resolveProjectKnowledgeDraftSelection = ({
  projectId,
  chatId,
  projectKnowledgeIds,
  lastUsedKnowledgeIdBySession,
}: ResolveProjectKnowledgeDraftSelectionOptions): string | null => {
  const sessionKey = buildProjectKnowledgeDraftSessionKey(projectId, chatId);
  const lastUsed = lastUsedKnowledgeIdBySession[sessionKey];

  if (lastUsed && projectKnowledgeIds.includes(lastUsed)) {
    return lastUsed;
  }

  return null;
};

const getProjectKnowledgeDraftErrorMessage = (
  error: unknown,
  fallback: string,
): string => {
  return error instanceof Error && error.message ? error.message : fallback;
};

export const saveProjectKnowledgeDraftDocument = async ({
  activeProjectId,
  knowledgeId,
  draft,
  uploadProjectKnowledgeDocument,
  refreshProjectKnowledge,
}: SaveProjectKnowledgeDraftDocumentOptions): Promise<SaveProjectKnowledgeDraftResult> => {
  const documentTitle = draft.documentTitle.trim();
  const markdownContent = draft.markdownContent.trim();

  if (!knowledgeId) {
    return {
      status: 'error',
      message: tp('resources.draft.missingKnowledge'),
    };
  }

  if (!documentTitle || !markdownContent) {
    return {
      status: 'error',
      message: tp('resources.draft.invalidDocument'),
    };
  }

  try {
    const markdownFile = createMarkdownSourceFile({
      title: documentTitle,
      content: markdownContent,
    });

    await uploadProjectKnowledgeDocument(
      activeProjectId,
      knowledgeId,
      markdownFile,
    );
    await Promise.resolve(refreshProjectKnowledge?.());

    return {
      status: 'success',
      knowledgeId,
    };
  } catch (error) {
    return {
      status: 'error',
      message: getProjectKnowledgeDraftErrorMessage(
        error,
        tp('resources.draft.saveFailed'),
      ),
    };
  }
};
