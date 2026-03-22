import { normalizeMarkdownFileName } from '../project/projectConversationMessageExport';
import { tp } from './knowledge.i18n';

const DOCUMENT_UPLOAD_MAX_BYTES = 50 * 1024 * 1024;
const DOCUMENT_UPLOAD_SOFT_WARNING_BYTES = 20 * 1024 * 1024;
const SUPPORTED_DOCUMENT_EXTENSIONS = [
  '.md',
  '.markdown',
  '.txt',
  '.pdf',
  '.docx',
  '.xlsx',
] as const;
const FILE_ISSUE_PREVIEW_LIMIT = 2;

export const DOCUMENT_UPLOAD_ACCEPT =
  '.md,.markdown,.txt,.pdf,.docx,.xlsx,text/markdown,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
export const KNOWLEDGE_UPLOAD_MAX_FILES = 10;
export const KNOWLEDGE_UPLOAD_TOOLTIP =
  tp('upload.tooltip');

export interface KnowledgeSourceFileIssue {
  fileName: string;
  reason: string;
}

export interface PreparedKnowledgeSourceFiles {
  acceptedFiles: File[];
  fileIssues: KnowledgeSourceFileIssue[];
  overflowCount: number;
  largeFileCount: number;
}

const getFileExtension = (fileName: string): string => {
  const extensionIndex = fileName.lastIndexOf('.');

  if (extensionIndex < 0) {
    return '';
  }

  return fileName.slice(extensionIndex).toLowerCase();
};

export const validateKnowledgeSourceFile = (file: File): string | null => {
  const extension = getFileExtension(file.name);

  if (
    !SUPPORTED_DOCUMENT_EXTENSIONS.includes(
      extension as (typeof SUPPORTED_DOCUMENT_EXTENSIONS)[number],
    )
  ) {
    return tp('upload.invalidType');
  }

  if (file.size > DOCUMENT_UPLOAD_MAX_BYTES) {
    return tp('upload.maxSize');
  }

  return null;
};

export const shouldWarnLargeKnowledgeSourceFile = (file: File): boolean => {
  return file.size > DOCUMENT_UPLOAD_SOFT_WARNING_BYTES;
};

export const prepareKnowledgeSourceFiles = (
  files: File[],
): PreparedKnowledgeSourceFiles => {
  const limitedFiles = files.slice(0, KNOWLEDGE_UPLOAD_MAX_FILES);
  const acceptedFiles: File[] = [];
  const fileIssues: KnowledgeSourceFileIssue[] = [];
  let largeFileCount = 0;

  limitedFiles.forEach((file) => {
    const validationError = validateKnowledgeSourceFile(file);

    if (validationError) {
      fileIssues.push({
        fileName: file.name,
        reason: validationError,
      });
      return;
    }

    if (shouldWarnLargeKnowledgeSourceFile(file)) {
      largeFileCount += 1;
    }

    acceptedFiles.push(file);
  });

  return {
    acceptedFiles,
    fileIssues,
    overflowCount: Math.max(0, files.length - limitedFiles.length),
    largeFileCount,
  };
};

export const formatKnowledgeSourceOverflowMessage = (
  overflowCount: number,
): string => {
  if (overflowCount <= 0) {
    return '';
  }

  return tp('upload.overflow', {
    max: KNOWLEDGE_UPLOAD_MAX_FILES,
    overflowCount,
  });
};

export const formatKnowledgeSourceLargeFileWarning = (
  largeFileCount: number,
): string => {
  if (largeFileCount <= 0) {
    return '';
  }

  return largeFileCount === 1
    ? tp('upload.largeFileOne')
    : tp('upload.largeFileMany', { largeFileCount });
};

export const formatKnowledgeSourceFileIssues = (
  fileIssues: KnowledgeSourceFileIssue[],
): string => {
  if (fileIssues.length === 0) {
    return '';
  }

  const preview = fileIssues
    .slice(0, FILE_ISSUE_PREVIEW_LIMIT)
    .map(({ fileName, reason }) => `「${fileName}」${reason}`)
    .join('；');

  if (fileIssues.length <= FILE_ISSUE_PREVIEW_LIMIT) {
    return preview;
  }

  return tp('upload.issueOverflow', {
    preview,
    count: fileIssues.length - FILE_ISSUE_PREVIEW_LIMIT,
  });
};

const sanitizeTextSourceTitle = (value: string): string => {
  return value.replace(/[\\/:*?"<>|]+/g, '-').trim();
};

const buildFallbackTextSourceFileName = (): string => {
  const now = new Date();
  const parts = [
    now.getFullYear(),
    `${now.getMonth() + 1}`.padStart(2, '0'),
    `${now.getDate()}`.padStart(2, '0'),
    '-',
    `${now.getHours()}`.padStart(2, '0'),
    `${now.getMinutes()}`.padStart(2, '0'),
    `${now.getSeconds()}`.padStart(2, '0'),
  ];

  return `${tp('upload.textFileNamePrefix')}-${parts.join('')}.txt`;
};

export const createTextSourceFile = ({
  title,
  content,
}: {
  title?: string;
  content: string;
}): File => {
  const normalizedTitle = sanitizeTextSourceTitle(title?.trim() ?? '').replace(
    /\.txt$/i,
    '',
  );
  const trimmedContent = content.trim();
  const fileName = normalizedTitle
    ? `${normalizedTitle}.txt`
    : buildFallbackTextSourceFileName();
  const fileContent = normalizedTitle
    ? `${normalizedTitle}\n\n${trimmedContent}`
    : trimmedContent;

  return new File([fileContent], fileName, {
    type: 'text/plain;charset=utf-8',
  });
};

export const createMarkdownSourceFile = ({
  title,
  content,
}: {
  title?: string;
  content: string;
}): File => {
  const fileName = normalizeMarkdownFileName(title?.trim() ?? '');

  return new File([content.trim()], fileName, {
    type: 'text/markdown;charset=utf-8',
  });
};
