import { createHash } from 'node:crypto';
import type { WithId } from 'mongodb';
import type { AuthUserProfile } from '@modules/auth/auth.types.js';
import type { EffectiveEmbeddingConfig } from '@modules/settings/settings.types.js';
import type {
  KnowledgeBaseDocument,
  KnowledgeDocumentRecord,
  KnowledgeDocumentResponse,
  KnowledgeEmbeddingModel,
  KnowledgeEmbeddingProvider,
  KnowledgeScope,
  KnowledgeSourceType,
  KnowledgeSummaryResponse,
} from './knowledge.types.js';

export const KNOWLEDGE_COLLECTION_NAME = 'knowledge_bases';
export const KNOWLEDGE_DOCUMENT_COLLECTION_NAME = 'knowledge_documents';
export const KNOWLEDGE_NAMESPACE_INDEX_STATE_COLLECTION_NAME = 'knowledge_index_namespaces';
export const KNOWLEDGE_UPLOAD_FIELD_NAME = 'file';
export const KNOWLEDGE_UPLOAD_MAX_BYTES = 50 * 1024 * 1024;

export const SUPPORTED_KNOWLEDGE_UPLOAD_TYPES = [
  {
    sourceType: 'global_docs' satisfies KnowledgeSourceType,
    extensions: ['.md', '.markdown', '.txt'],
    // PDF 支持待 indexer-py 正式覆盖后再统一加回，见 pipeline.py
    mimeTypes: [
      'text/markdown',
      'text/x-markdown',
      'text/plain',
      'application/octet-stream',
    ],
  },
] as const;

const extractFileName = (fileName: string): string => {
  const trimmed = fileName.trim();
  return trimmed.split(/[\\/]/).pop() ?? '';
};

const WINDOWS_1252_EXTENDED_BYTES = new Map<number, number>([
  [0x20ac, 0x80],
  [0x201a, 0x82],
  [0x0192, 0x83],
  [0x201e, 0x84],
  [0x2026, 0x85],
  [0x2020, 0x86],
  [0x2021, 0x87],
  [0x02c6, 0x88],
  [0x2030, 0x89],
  [0x0160, 0x8a],
  [0x2039, 0x8b],
  [0x0152, 0x8c],
  [0x017d, 0x8e],
  [0x2018, 0x91],
  [0x2019, 0x92],
  [0x201c, 0x93],
  [0x201d, 0x94],
  [0x2022, 0x95],
  [0x2013, 0x96],
  [0x2014, 0x97],
  [0x02dc, 0x98],
  [0x2122, 0x99],
  [0x0161, 0x9a],
  [0x203a, 0x9b],
  [0x0153, 0x9c],
  [0x017e, 0x9e],
  [0x0178, 0x9f],
]);

const hasReplacementCharacter = (value: string): boolean => {
  return value.includes('\uFFFD');
};

const containsCommonMojibake = (value: string): boolean => {
  return /[ÃÂÅÆÇÐÑÕÖØÙÚÝÞßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ]/u.test(value);
};

const containsNonLatinScript = (value: string): boolean => {
  return /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Cyrillic}\p{Script=Arabic}\p{Script=Hebrew}\p{Script=Thai}]/u.test(
    value,
  );
};

const encodeWindows1252Bytes = (value: string): Buffer | null => {
  const bytes: number[] = [];

  for (const char of value) {
    const codePoint = char.codePointAt(0);

    if (codePoint === undefined) {
      return null;
    }

    if (codePoint <= 0x7f || (codePoint >= 0xa0 && codePoint <= 0xff)) {
      bytes.push(codePoint);
      continue;
    }

    const mappedByte = WINDOWS_1252_EXTENDED_BYTES.get(codePoint);

    if (mappedByte === undefined) {
      return null;
    }

    bytes.push(mappedByte);
  }

  return Buffer.from(bytes);
};

const decodeAsLatin1Utf8 = (value: string): string => {
  return Buffer.from(value, 'latin1').toString('utf8').normalize('NFC');
};

const decodeAsWindows1252Utf8 = (value: string): string | null => {
  const encodedBytes = encodeWindows1252Bytes(value);

  if (!encodedBytes) {
    return null;
  }

  return encodedBytes.toString('utf8').normalize('NFC');
};

const shouldUseDecodedFileName = (
  original: string,
  decoded: string | null,
): decoded is string => {
  if (!decoded || decoded === original || hasReplacementCharacter(decoded)) {
    return false;
  }

  return (
    containsNonLatinScript(decoded) ||
    (containsCommonMojibake(original) && !containsCommonMojibake(decoded))
  );
};

export const normalizeUploadedFileName = (fileName: string): string => {
  const extracted = extractFileName(fileName);

  if (!extracted) {
    return 'document';
  }

  const normalized = extracted.normalize('NFC');
  const latin1Decoded = decodeAsLatin1Utf8(normalized);

  if (shouldUseDecodedFileName(normalized, latin1Decoded)) {
    return latin1Decoded;
  }

  const windows1252Decoded = decodeAsWindows1252Utf8(normalized);

  if (shouldUseDecodedFileName(normalized, windows1252Decoded)) {
    return windows1252Decoded;
  }

  return normalized;
};

export const sanitizeFileName = (fileName: string): string => {
  const normalized = normalizeUploadedFileName(fileName);
  const sanitized = Array.from(normalized, (char) => {
    const codePoint = char.codePointAt(0) ?? 0;

    if (codePoint <= 0x1f || codePoint === 0x7f) {
      return '_';
    }

    return /[<>:"/\\|?*]/u.test(char) ? '_' : char;
  })
    .join('')
    .replace(/\s+/g, '_')
    .replace(/^\.+/g, '')
    .replace(/[. ]+$/g, '');

  return sanitized || 'document';
};

type KnowledgeActorProfileMap = Map<string, AuthUserProfile>;

export const resolveKnowledgeScope = (
  knowledge: Pick<KnowledgeBaseDocument, 'scope' | 'projectId'>,
): {
  scope: KnowledgeScope;
  projectId: string | null;
} => {
  if (knowledge.scope === 'project') {
    return {
      scope: 'project',
      projectId: knowledge.projectId ?? null,
    };
  }

  return {
    scope: 'global',
    projectId: null,
  };
};

export const buildKnowledgeNamespaceKey = (
  knowledge: Pick<KnowledgeBaseDocument, 'scope' | 'projectId' | 'sourceType'>,
): string => {
  const scope = resolveKnowledgeScope(knowledge);

  if (scope.scope === 'project' && scope.projectId) {
    return knowledge.sourceType === 'global_code'
      ? `proj_${scope.projectId}_code`
      : `proj_${scope.projectId}_docs`;
  }

  return knowledge.sourceType === 'global_code' ? 'global_code' : 'global_docs';
};

export const buildKnowledgeEmbeddingFingerprint = (
  config: Pick<EffectiveEmbeddingConfig, 'provider' | 'baseUrl' | 'model'>,
): string => {
  return createHash('sha256')
    .update(
      JSON.stringify({
        provider: config.provider.trim().toLowerCase(),
        baseUrl: config.baseUrl.trim().replace(/\/+$/u, '').toLowerCase(),
        model: config.model.trim(),
      }),
      'utf8',
    )
    .digest('hex');
};

export const buildVersionedKnowledgeCollectionName = (
  namespaceKey: string,
  fingerprint: string,
  options?: {
    suffix?: string;
  },
): string => {
  const baseName = `${namespaceKey}__emb_${fingerprint.slice(0, 12)}`;
  const normalizedSuffix = options?.suffix?.trim();

  return normalizedSuffix ? `${baseName}__${normalizedSuffix}` : baseName;
};

export const toKnowledgeEmbeddingMetadata = (
  config: Pick<EffectiveEmbeddingConfig, 'provider' | 'model'>,
): {
  embeddingProvider: KnowledgeEmbeddingProvider;
  embeddingModel: KnowledgeEmbeddingModel;
} => {
  return {
    embeddingProvider: config.provider,
    embeddingModel: config.model,
  };
};

export const toKnowledgeSummaryResponse = (
  knowledge: WithId<KnowledgeBaseDocument>,
  actorProfileMap: KnowledgeActorProfileMap = new Map(),
): KnowledgeSummaryResponse => {
  const scope = resolveKnowledgeScope(knowledge);

  return {
    id: knowledge._id.toHexString(),
    name: knowledge.name,
    description: knowledge.description,
    scope: scope.scope,
    projectId: scope.projectId,
    sourceType: knowledge.sourceType,
    indexStatus: knowledge.indexStatus,
    documentCount: knowledge.documentCount,
    chunkCount: knowledge.chunkCount,
    maintainerId: knowledge.maintainerId,
    maintainerName: actorProfileMap.get(knowledge.maintainerId)?.name ?? null,
    createdBy: knowledge.createdBy,
    createdByName: actorProfileMap.get(knowledge.createdBy)?.name ?? null,
    createdAt: knowledge.createdAt.toISOString(),
    updatedAt: knowledge.updatedAt.toISOString(),
  };
};

export const toKnowledgeDocumentResponse = (
  document: WithId<KnowledgeDocumentRecord>,
): KnowledgeDocumentResponse => {
  return {
    id: document._id.toHexString(),
    knowledgeId: document.knowledgeId,
    fileName: normalizeUploadedFileName(document.fileName),
    mimeType: document.mimeType,
    status: document.status,
    chunkCount: document.chunkCount,
    embeddingProvider: document.embeddingProvider,
    embeddingModel: document.embeddingModel,
    lastIndexedAt: document.lastIndexedAt?.toISOString() ?? null,
    retryCount: document.retryCount,
    errorMessage: document.errorMessage,
    uploadedBy: document.uploadedBy,
    uploadedAt: document.uploadedAt.toISOString(),
    processedAt: document.processedAt?.toISOString() ?? null,
    updatedAt: document.updatedAt.toISOString(),
  };
};
