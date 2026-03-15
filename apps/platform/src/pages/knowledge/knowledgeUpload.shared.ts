const DOCUMENT_UPLOAD_MAX_BYTES = 50 * 1024 * 1024;
const DOCUMENT_UPLOAD_SOFT_WARNING_BYTES = 20 * 1024 * 1024;
const SUPPORTED_DOCUMENT_EXTENSIONS = ['.md', '.markdown', '.txt'] as const;

export const DOCUMENT_UPLOAD_ACCEPT =
  '.md,.markdown,.txt,text/markdown,text/plain';
export const KNOWLEDGE_UPLOAD_TOOLTIP =
  '支持 .md /.txt 上传，单文件上限 50 MB，20 MB 以上建议拆分上传。';

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
    return '仅支持 md、markdown、txt 文件';
  }

  if (file.size > DOCUMENT_UPLOAD_MAX_BYTES) {
    return '文件大小不能超过 50 MB';
  }

  return null;
};

export const shouldWarnLargeKnowledgeSourceFile = (file: File): boolean => {
  return file.size > DOCUMENT_UPLOAD_SOFT_WARNING_BYTES;
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

  return `文本来源-${parts.join('')}.txt`;
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
