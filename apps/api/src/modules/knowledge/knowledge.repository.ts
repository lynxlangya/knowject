import { type Collection, type WithId } from "mongodb";
import type { MongoDatabaseManager } from "@db/mongo.js";
import {
  createKnowledgeBase,
  deleteKnowledgeBase,
  findKnowledgeById,
  listKnowledgeBases,
  listKnowledgeBasesByNamespace,
  updateKnowledgeBase,
} from "./knowledge.repository.base.js";
import {
  adjustKnowledgeSummaryAfterDocumentCompletion as adjustKnowledgeSummaryAfterDocumentCompletionImpl,
  adjustKnowledgeSummaryAfterDocumentFailure as adjustKnowledgeSummaryAfterDocumentFailureImpl,
  adjustKnowledgeSummaryAfterDocumentRemoval as adjustKnowledgeSummaryAfterDocumentRemovalImpl,
  createKnowledgeDocument,
  deleteKnowledgeDocumentById,
  deleteKnowledgeDocumentsByKnowledgeId,
  findKnowledgeDocumentById,
  findKnowledgeDocumentByVersionHash,
  listDocumentsByKnowledgeId,
  listDocumentsByKnowledgeIds,
  listKnowledgeDocumentsForRecovery,
  markKnowledgeDocumentCompletedIfProcessing as markKnowledgeDocumentCompletedIfProcessingImpl,
  markKnowledgeDocumentFailedIfProcessing as markKnowledgeDocumentFailedIfProcessingImpl,
  markKnowledgeDocumentFailedIfRecoverable as markKnowledgeDocumentFailedIfRecoverableImpl,
  markKnowledgeDocumentPendingForRecovery as markKnowledgeDocumentPendingForRecoveryImpl,
  markKnowledgeDocumentPendingIfRetryable as markKnowledgeDocumentPendingIfRetryableImpl,
  markKnowledgeDocumentProcessingIfPending as markKnowledgeDocumentProcessingIfPendingImpl,
  markKnowledgeDocumentsPendingByKnowledgeIds as markKnowledgeDocumentsPendingByKnowledgeIdsImpl,
  markKnowledgeSummaryPending as markKnowledgeSummaryPendingImpl,
  markKnowledgeSummaryProcessing as markKnowledgeSummaryProcessingImpl,
  syncKnowledgeSummaryFromDocuments,
  updateKnowledgeDocument,
  updateKnowledgeSummaryAfterDocumentUpload,
} from "./knowledge.repository.documents.js";
import {
  createKnowledgeNamespaceIndexState,
  deleteKnowledgeNamespaceIndexState,
  findKnowledgeNamespaceIndexState,
  listKnowledgeNamespaceIndexStatesByRebuildStatus,
  markKnowledgeNamespaceRebuildingIfIdle as markKnowledgeNamespaceRebuildingIfIdleImpl,
  updateKnowledgeNamespaceIndexState,
} from "./knowledge.repository.namespace.js";
import {
  KNOWLEDGE_COLLECTION_NAME,
  KNOWLEDGE_DOCUMENT_COLLECTION_NAME,
  KNOWLEDGE_NAMESPACE_INDEX_STATE_COLLECTION_NAME,
} from "./knowledge.shared.js";
import type {
  KnowledgeBaseDocument,
  KnowledgeDocumentRecord,
  KnowledgeNamespaceRebuildStatus,
  KnowledgeNamespaceIndexStateDocument,
  KnowledgeScope,
  KnowledgeSourceType,
} from "./knowledge.types.js";

export class KnowledgeRepository {
  private knowledgeIndexesEnsured = false;
  private ensureKnowledgeIndexesPromise: Promise<void> | null = null;
  private documentIndexesEnsured = false;
  private ensureDocumentIndexesPromise: Promise<void> | null = null;
  private namespaceIndexesEnsured = false;
  private ensureNamespaceIndexesPromise: Promise<void> | null = null;

  constructor(private readonly mongo: MongoDatabaseManager) {}

  getPrimaryDataStore(): "mongodb" {
    return "mongodb";
  }

  async ensureMetadataModel(): Promise<void> {
    await Promise.all([
      this.getKnowledgeCollection(),
      this.getKnowledgeDocumentsCollection(),
      this.getKnowledgeNamespaceStateCollection(),
    ]);
  }

  async listKnowledgeBases(options?: {
    scope?: KnowledgeScope;
    projectId?: string;
    sourceType?: KnowledgeSourceType;
  }): Promise<WithId<KnowledgeBaseDocument>[]> {
    return listKnowledgeBases(this.baseAccess(), options);
  }

  async listKnowledgeBasesByNamespace(options: {
    scope: KnowledgeScope;
    projectId?: string | null;
    sourceType: KnowledgeSourceType;
  }): Promise<WithId<KnowledgeBaseDocument>[]> {
    return listKnowledgeBasesByNamespace(this.baseAccess(), options);
  }

  async findKnowledgeById(
    knowledgeId: string,
  ): Promise<WithId<KnowledgeBaseDocument> | null> {
    return findKnowledgeById(this.baseAccess(), knowledgeId);
  }

  async listDocumentsByKnowledgeId(
    knowledgeId: string,
  ): Promise<WithId<KnowledgeDocumentRecord>[]> {
    return listDocumentsByKnowledgeId(this.documentAccess(), knowledgeId);
  }

  async listDocumentsByKnowledgeIds(
    knowledgeIds: string[],
  ): Promise<WithId<KnowledgeDocumentRecord>[]> {
    return listDocumentsByKnowledgeIds(this.documentAccess(), knowledgeIds);
  }

  async findKnowledgeDocumentById(
    documentId: string,
  ): Promise<WithId<KnowledgeDocumentRecord> | null> {
    return findKnowledgeDocumentById(this.documentAccess(), documentId);
  }

  async findKnowledgeDocumentByVersionHash(
    knowledgeId: string,
    documentVersionHash: string,
  ): Promise<WithId<KnowledgeDocumentRecord> | null> {
    return findKnowledgeDocumentByVersionHash(
      this.documentAccess(),
      knowledgeId,
      documentVersionHash,
    );
  }

  async listKnowledgeDocumentsForRecovery(
    staleProcessingBefore: Date,
  ): Promise<WithId<KnowledgeDocumentRecord>[]> {
    return listKnowledgeDocumentsForRecovery(
      this.documentAccess(),
      staleProcessingBefore,
    );
  }

  async createKnowledgeBase(
    document: Omit<KnowledgeBaseDocument, "_id">,
  ): Promise<WithId<KnowledgeBaseDocument>> {
    return createKnowledgeBase(this.baseAccess(), document);
  }

  async findKnowledgeNamespaceIndexState(
    namespaceKey: string,
  ): Promise<WithId<KnowledgeNamespaceIndexStateDocument> | null> {
    return findKnowledgeNamespaceIndexState(this.namespaceAccess(), namespaceKey);
  }

  async listKnowledgeNamespaceIndexStatesByRebuildStatus(
    rebuildStatus: KnowledgeNamespaceRebuildStatus,
  ): Promise<WithId<KnowledgeNamespaceIndexStateDocument>[]> {
    return listKnowledgeNamespaceIndexStatesByRebuildStatus(
      this.namespaceAccess(),
      rebuildStatus,
    );
  }

  async createKnowledgeNamespaceIndexState(
    document: Omit<KnowledgeNamespaceIndexStateDocument, "_id">,
  ): Promise<WithId<KnowledgeNamespaceIndexStateDocument>> {
    return createKnowledgeNamespaceIndexState(this.namespaceAccess(), document);
  }

  async updateKnowledgeNamespaceIndexState(
    namespaceKey: string,
    patch: Partial<
      Omit<
        KnowledgeNamespaceIndexStateDocument,
        "_id" | "namespaceKey" | "scope" | "projectId" | "sourceType"
      >
    >,
  ): Promise<WithId<KnowledgeNamespaceIndexStateDocument> | null> {
    return updateKnowledgeNamespaceIndexState(
      this.namespaceAccess(),
      namespaceKey,
      patch,
    );
  }

  async deleteKnowledgeNamespaceIndexState(
    namespaceKey: string,
  ): Promise<boolean> {
    return deleteKnowledgeNamespaceIndexState(this.namespaceAccess(), namespaceKey);
  }

  async markKnowledgeNamespaceRebuildingIfIdle(
    namespaceKey: string,
    patch: Partial<
      Omit<
        KnowledgeNamespaceIndexStateDocument,
        "_id" | "namespaceKey" | "scope" | "projectId" | "sourceType"
      >
    >,
  ): Promise<WithId<KnowledgeNamespaceIndexStateDocument> | null> {
    return markKnowledgeNamespaceRebuildingIfIdleImpl(
      this.namespaceAccess(),
      namespaceKey,
      patch,
    );
  }

  async updateKnowledgeBase(
    knowledgeId: string,
    patch: Partial<
      Pick<
        KnowledgeBaseDocument,
        | "name"
        | "description"
        | "indexStatus"
        | "documentCount"
        | "chunkCount"
        | "updatedAt"
      >
    >,
  ): Promise<WithId<KnowledgeBaseDocument> | null> {
    return updateKnowledgeBase(this.baseAccess(), knowledgeId, patch);
  }

  async createKnowledgeDocument(
    document: KnowledgeDocumentRecord & {
      _id: NonNullable<KnowledgeDocumentRecord["_id"]>;
    },
  ): Promise<WithId<KnowledgeDocumentRecord>> {
    return createKnowledgeDocument(this.documentAccess(), document);
  }

  async updateKnowledgeSummaryAfterDocumentUpload(
    knowledgeId: string,
    updatedAt: Date,
  ): Promise<WithId<KnowledgeBaseDocument> | null> {
    return updateKnowledgeSummaryAfterDocumentUpload(
      this.documentAccess(),
      knowledgeId,
      updatedAt,
    );
  }

  async markKnowledgeSummaryPending(
    knowledgeId: string,
    updatedAt: Date,
  ): Promise<WithId<KnowledgeBaseDocument> | null> {
    return markKnowledgeSummaryPendingImpl(
      this.documentAccess(),
      knowledgeId,
      updatedAt,
    );
  }

  async markKnowledgeSummaryProcessing(
    knowledgeId: string,
    updatedAt: Date,
  ): Promise<WithId<KnowledgeBaseDocument> | null> {
    return markKnowledgeSummaryProcessingImpl(
      this.documentAccess(),
      knowledgeId,
      updatedAt,
    );
  }

  async adjustKnowledgeSummaryAfterDocumentCompletion(
    knowledgeId: string,
    patch: {
      previousChunkCount: number;
      nextChunkCount: number;
      updatedAt: Date;
    },
  ): Promise<WithId<KnowledgeBaseDocument> | null> {
    return adjustKnowledgeSummaryAfterDocumentCompletionImpl(
      this.documentAccess(),
      knowledgeId,
      patch,
    );
  }

  async adjustKnowledgeSummaryAfterDocumentFailure(
    knowledgeId: string,
    patch: {
      previousChunkCount: number;
      updatedAt: Date;
    },
  ): Promise<WithId<KnowledgeBaseDocument> | null> {
    return adjustKnowledgeSummaryAfterDocumentFailureImpl(
      this.documentAccess(),
      knowledgeId,
      patch,
    );
  }

  async adjustKnowledgeSummaryAfterDocumentRemoval(
    knowledgeId: string,
    patch: {
      removedChunkCount: number;
      updatedAt: Date;
    },
  ): Promise<WithId<KnowledgeBaseDocument> | null> {
    return adjustKnowledgeSummaryAfterDocumentRemovalImpl(
      this.documentAccess(),
      knowledgeId,
      patch,
    );
  }

  async markKnowledgeDocumentsPendingByKnowledgeIds(
    knowledgeIds: string[],
    updatedAt: Date,
  ): Promise<void> {
    await markKnowledgeDocumentsPendingByKnowledgeIdsImpl(
      this.documentAccess(),
      knowledgeIds,
      updatedAt,
    );
  }

  async updateKnowledgeDocument(
    documentId: string,
    patch: Partial<
      Pick<
        KnowledgeDocumentRecord,
        | "status"
        | "chunkCount"
        | "embeddingProvider"
        | "embeddingModel"
        | "lastIndexedAt"
        | "errorMessage"
        | "processedAt"
        | "updatedAt"
      >
    >,
    options?: {
      incrementRetryCount?: boolean;
    },
  ): Promise<WithId<KnowledgeDocumentRecord> | null> {
    return updateKnowledgeDocument(this.documentAccess(), documentId, patch, options);
  }

  async markKnowledgeDocumentPendingIfRetryable(
    documentId: string,
    updatedAt: Date,
  ): Promise<WithId<KnowledgeDocumentRecord> | null> {
    return markKnowledgeDocumentPendingIfRetryableImpl(
      this.documentAccess(),
      documentId,
      updatedAt,
    );
  }

  async markKnowledgeDocumentPendingForRecovery(
    documentId: string,
    updatedAt: Date,
  ): Promise<WithId<KnowledgeDocumentRecord> | null> {
    return markKnowledgeDocumentPendingForRecoveryImpl(
      this.documentAccess(),
      documentId,
      updatedAt,
    );
  }

  async markKnowledgeDocumentProcessingIfPending(
    documentId: string,
    updatedAt: Date,
  ): Promise<WithId<KnowledgeDocumentRecord> | null> {
    return markKnowledgeDocumentProcessingIfPendingImpl(
      this.documentAccess(),
      documentId,
      updatedAt,
    );
  }

  async markKnowledgeDocumentCompletedIfProcessing(
    documentId: string,
    patch: Pick<
      KnowledgeDocumentRecord,
      | "chunkCount"
      | "embeddingProvider"
      | "embeddingModel"
      | "lastIndexedAt"
      | "processedAt"
      | "updatedAt"
    >,
  ): Promise<WithId<KnowledgeDocumentRecord> | null> {
    return markKnowledgeDocumentCompletedIfProcessingImpl(
      this.documentAccess(),
      documentId,
      patch,
    );
  }

  async markKnowledgeDocumentFailedIfProcessing(
    documentId: string,
    patch: Pick<
      KnowledgeDocumentRecord,
      "errorMessage" | "processedAt" | "updatedAt"
    >,
  ): Promise<WithId<KnowledgeDocumentRecord> | null> {
    return markKnowledgeDocumentFailedIfProcessingImpl(
      this.documentAccess(),
      documentId,
      patch,
    );
  }

  async markKnowledgeDocumentFailedIfRecoverable(
    documentId: string,
    patch: Pick<
      KnowledgeDocumentRecord,
      "errorMessage" | "processedAt" | "updatedAt"
    >,
  ): Promise<WithId<KnowledgeDocumentRecord> | null> {
    return markKnowledgeDocumentFailedIfRecoverableImpl(
      this.documentAccess(),
      documentId,
      patch,
    );
  }

  async syncKnowledgeSummaryFromDocuments(
    knowledgeId: string,
    updatedAt: Date,
  ): Promise<WithId<KnowledgeBaseDocument> | null> {
    return syncKnowledgeSummaryFromDocuments(
      this.documentAccess(),
      knowledgeId,
      updatedAt,
    );
  }

  async deleteKnowledgeDocumentsByKnowledgeId(
    knowledgeId: string,
  ): Promise<number> {
    return deleteKnowledgeDocumentsByKnowledgeId(
      this.documentAccess(),
      knowledgeId,
    );
  }

  async deleteKnowledgeDocumentById(documentId: string): Promise<boolean> {
    return deleteKnowledgeDocumentById(this.documentAccess(), documentId);
  }

  async deleteKnowledgeBase(knowledgeId: string): Promise<boolean> {
    return deleteKnowledgeBase(this.baseAccess(), knowledgeId);
  }

  private baseAccess() {
    return {
      getKnowledgeCollection: this.getKnowledgeCollection.bind(this),
    };
  }

  private documentAccess() {
    return {
      getKnowledgeCollection: this.getKnowledgeCollection.bind(this),
      getKnowledgeDocumentsCollection:
        this.getKnowledgeDocumentsCollection.bind(this),
    };
  }

  private namespaceAccess() {
    return {
      getKnowledgeNamespaceStateCollection:
        this.getKnowledgeNamespaceStateCollection.bind(this),
    };
  }

  private async getKnowledgeCollection(): Promise<
    Collection<KnowledgeBaseDocument>
  > {
    await this.mongo.connect();
    const collection = this.mongo
      .getDb()
      .collection<KnowledgeBaseDocument>(KNOWLEDGE_COLLECTION_NAME);
    await this.ensureKnowledgeIndexes(collection);
    return collection;
  }

  private async getKnowledgeDocumentsCollection(): Promise<
    Collection<KnowledgeDocumentRecord>
  > {
    await this.mongo.connect();
    const collection = this.mongo
      .getDb()
      .collection<KnowledgeDocumentRecord>(KNOWLEDGE_DOCUMENT_COLLECTION_NAME);
    await this.ensureDocumentIndexes(collection);
    return collection;
  }

  private async getKnowledgeNamespaceStateCollection(): Promise<
    Collection<KnowledgeNamespaceIndexStateDocument>
  > {
    await this.mongo.connect();
    const collection = this.mongo
      .getDb()
      .collection<KnowledgeNamespaceIndexStateDocument>(
        KNOWLEDGE_NAMESPACE_INDEX_STATE_COLLECTION_NAME,
      );
    await this.ensureNamespaceIndexes(collection);
    return collection;
  }

  private async ensureKnowledgeIndexes(
    collection: Collection<KnowledgeBaseDocument>,
  ): Promise<void> {
    if (this.knowledgeIndexesEnsured) {
      return;
    }

    if (!this.ensureKnowledgeIndexesPromise) {
      this.ensureKnowledgeIndexesPromise = Promise.all([
        collection.createIndex({ name: 1 }, { name: "knowledge_bases_name" }),
        collection.createIndex(
          { createdBy: 1 },
          { name: "knowledge_bases_created_by" },
        ),
        collection.createIndex(
          { updatedAt: -1 },
          { name: "knowledge_bases_updated_at_desc" },
        ),
        collection.createIndex(
          { scope: 1, updatedAt: -1 },
          { name: "knowledge_bases_scope_updated_at_desc" },
        ),
        collection.createIndex(
          { scope: 1, projectId: 1, updatedAt: -1 },
          { name: "knowledge_bases_scope_project_id_updated_at_desc" },
        ),
        collection.createIndex(
          { sourceType: 1, updatedAt: -1 },
          { name: "knowledge_bases_source_type_updated_at_desc" },
        ),
      ])
        .then(() => {
          this.knowledgeIndexesEnsured = true;
        })
        .finally(() => {
          this.ensureKnowledgeIndexesPromise = null;
        });
    }

    await this.ensureKnowledgeIndexesPromise;
  }

  private async ensureDocumentIndexes(
    collection: Collection<KnowledgeDocumentRecord>,
  ): Promise<void> {
    if (this.documentIndexesEnsured) {
      return;
    }

    if (!this.ensureDocumentIndexesPromise) {
      this.ensureDocumentIndexesPromise = Promise.all([
        collection.createIndex(
          { knowledgeId: 1, updatedAt: -1 },
          { name: "knowledge_documents_knowledge_id_updated_at_desc" },
        ),
        collection.createIndex(
          { knowledgeId: 1, status: 1, updatedAt: -1 },
          { name: "knowledge_documents_knowledge_id_status_updated_at_desc" },
        ),
        collection.createIndex(
          { status: 1, updatedAt: 1 },
          { name: "knowledge_documents_status_updated_at_asc" },
        ),
        this.ensureKnowledgeDocumentVersionHashUniqueIndex(collection),
        collection.createIndex(
          { uploadedBy: 1, uploadedAt: -1 },
          { name: "knowledge_documents_uploaded_by_uploaded_at_desc" },
        ),
      ])
        .then(() => {
          this.documentIndexesEnsured = true;
        })
        .finally(() => {
          this.ensureDocumentIndexesPromise = null;
        });
    }

    await this.ensureDocumentIndexesPromise;
  }

  private async ensureKnowledgeDocumentVersionHashUniqueIndex(
    collection: Collection<KnowledgeDocumentRecord>,
  ): Promise<void> {
    const indexName = "knowledge_documents_knowledge_id_version_hash";
    const existingIndex = (await collection.indexes()).find(
      (index) => index.name === indexName,
    );

    if (existingIndex && existingIndex.unique !== true) {
      await collection.dropIndex(indexName);
    }

    await collection.createIndex(
      { knowledgeId: 1, documentVersionHash: 1 },
      { name: indexName, unique: true },
    );
  }

  private async ensureNamespaceIndexes(
    collection: Collection<KnowledgeNamespaceIndexStateDocument>,
  ): Promise<void> {
    if (this.namespaceIndexesEnsured) {
      return;
    }

    if (!this.ensureNamespaceIndexesPromise) {
      this.ensureNamespaceIndexesPromise = Promise.all([
        collection.createIndex(
          { namespaceKey: 1 },
          { name: "knowledge_index_namespaces_key", unique: true },
        ),
        collection.createIndex(
          { scope: 1, projectId: 1, sourceType: 1 },
          { name: "knowledge_index_namespaces_scope_project_source" },
        ),
        collection.createIndex(
          { rebuildStatus: 1, updatedAt: -1 },
          { name: "knowledge_index_namespaces_rebuild_status_updated_at_desc" },
        ),
      ])
        .then(() => {
          this.namespaceIndexesEnsured = true;
        })
        .finally(() => {
          this.ensureNamespaceIndexesPromise = null;
        });
    }

    await this.ensureNamespaceIndexesPromise;
  }
}

const readRepositoryMethod = <
  Key extends keyof KnowledgeRepository,
>(
  repository: KnowledgeRepository,
  key: Key,
): KnowledgeRepository[Key] | null => {
  const candidate = (repository as KnowledgeRepository & {
    [K in Key]?: KnowledgeRepository[Key];
  })[key];

  return typeof candidate === "function" ? candidate : null;
};

export const markKnowledgeDocumentPendingIfRetryable = async (
  repository: KnowledgeRepository,
  documentId: string,
  updatedAt: Date,
): Promise<WithId<KnowledgeDocumentRecord> | null> => {
  const method = readRepositoryMethod(
    repository,
    "markKnowledgeDocumentPendingIfRetryable",
  );
  if (method) {
    return method.call(repository, documentId, updatedAt);
  }

  return repository.updateKnowledgeDocument(documentId, {
    status: "pending",
    errorMessage: null,
    processedAt: null,
    updatedAt,
  });
};

export const markKnowledgeDocumentPendingForRecovery = async (
  repository: KnowledgeRepository,
  documentId: string,
  updatedAt: Date,
): Promise<WithId<KnowledgeDocumentRecord> | null> => {
  const method = readRepositoryMethod(
    repository,
    "markKnowledgeDocumentPendingForRecovery",
  );
  if (method) {
    return method.call(repository, documentId, updatedAt);
  }

  return repository.updateKnowledgeDocument(documentId, {
    status: "pending",
    errorMessage: null,
    processedAt: null,
    updatedAt,
  });
};

export const markKnowledgeDocumentProcessingIfPending = async (
  repository: KnowledgeRepository,
  documentId: string,
  updatedAt: Date,
): Promise<WithId<KnowledgeDocumentRecord> | null> => {
  const method = readRepositoryMethod(
    repository,
    "markKnowledgeDocumentProcessingIfPending",
  );
  if (method) {
    return method.call(repository, documentId, updatedAt);
  }

  return repository.updateKnowledgeDocument(documentId, {
    status: "processing",
    errorMessage: null,
    processedAt: null,
    updatedAt,
  });
};

export const markKnowledgeDocumentCompletedIfProcessing = async (
  repository: KnowledgeRepository,
  documentId: string,
  patch: Pick<
    KnowledgeDocumentRecord,
    | "chunkCount"
    | "embeddingProvider"
    | "embeddingModel"
    | "lastIndexedAt"
    | "processedAt"
    | "updatedAt"
  >,
): Promise<WithId<KnowledgeDocumentRecord> | null> => {
  const method = readRepositoryMethod(
    repository,
    "markKnowledgeDocumentCompletedIfProcessing",
  );
  if (method) {
    return method.call(repository, documentId, patch);
  }

  return repository.updateKnowledgeDocument(documentId, {
    status: "completed",
    chunkCount: patch.chunkCount,
    embeddingProvider: patch.embeddingProvider,
    embeddingModel: patch.embeddingModel,
    lastIndexedAt: patch.lastIndexedAt,
    errorMessage: null,
    processedAt: patch.processedAt,
    updatedAt: patch.updatedAt,
  });
};

export const markKnowledgeDocumentFailedIfProcessing = async (
  repository: KnowledgeRepository,
  documentId: string,
  patch: Pick<
    KnowledgeDocumentRecord,
    "errorMessage" | "processedAt" | "updatedAt"
  >,
): Promise<WithId<KnowledgeDocumentRecord> | null> => {
  const method = readRepositoryMethod(
    repository,
    "markKnowledgeDocumentFailedIfProcessing",
  );
  if (method) {
    return method.call(repository, documentId, patch);
  }

  return repository.updateKnowledgeDocument(
    documentId,
    {
      status: "failed",
      chunkCount: 0,
      errorMessage: patch.errorMessage,
      processedAt: patch.processedAt,
      updatedAt: patch.updatedAt,
    },
    {
      incrementRetryCount: true,
    },
  );
};

export const markKnowledgeDocumentFailedIfRecoverable = async (
  repository: KnowledgeRepository,
  documentId: string,
  patch: Pick<
    KnowledgeDocumentRecord,
    "errorMessage" | "processedAt" | "updatedAt"
  >,
): Promise<WithId<KnowledgeDocumentRecord> | null> => {
  const method = readRepositoryMethod(
    repository,
    "markKnowledgeDocumentFailedIfRecoverable",
  );
  if (method) {
    return method.call(repository, documentId, patch);
  }

  return repository.updateKnowledgeDocument(
    documentId,
    {
      status: "failed",
      chunkCount: 0,
      errorMessage: patch.errorMessage,
      processedAt: patch.processedAt,
      updatedAt: patch.updatedAt,
    },
    {
      incrementRetryCount: true,
    },
  );
};

export const markKnowledgeSummaryPending = async (
  repository: KnowledgeRepository,
  knowledgeId: string,
  updatedAt: Date,
): Promise<WithId<KnowledgeBaseDocument> | null> => {
  const method = readRepositoryMethod(repository, "markKnowledgeSummaryPending");
  if (method) {
    return method.call(repository, knowledgeId, updatedAt);
  }

  return repository.syncKnowledgeSummaryFromDocuments(knowledgeId, updatedAt);
};

export const markKnowledgeSummaryProcessing = async (
  repository: KnowledgeRepository,
  knowledgeId: string,
  updatedAt: Date,
): Promise<WithId<KnowledgeBaseDocument> | null> => {
  const method = readRepositoryMethod(
    repository,
    "markKnowledgeSummaryProcessing",
  );
  if (method) {
    return method.call(repository, knowledgeId, updatedAt);
  }

  return repository.syncKnowledgeSummaryFromDocuments(knowledgeId, updatedAt);
};

export const adjustKnowledgeSummaryAfterDocumentCompletion = async (
  repository: KnowledgeRepository,
  knowledgeId: string,
  patch: {
    previousChunkCount: number;
    nextChunkCount: number;
    updatedAt: Date;
  },
): Promise<WithId<KnowledgeBaseDocument> | null> => {
  const method = readRepositoryMethod(
    repository,
    "adjustKnowledgeSummaryAfterDocumentCompletion",
  );
  if (method) {
    return method.call(repository, knowledgeId, patch);
  }

  return repository.syncKnowledgeSummaryFromDocuments(
    knowledgeId,
    patch.updatedAt,
  );
};

export const adjustKnowledgeSummaryAfterDocumentFailure = async (
  repository: KnowledgeRepository,
  knowledgeId: string,
  patch: {
    previousChunkCount: number;
    updatedAt: Date;
  },
): Promise<WithId<KnowledgeBaseDocument> | null> => {
  const method = readRepositoryMethod(
    repository,
    "adjustKnowledgeSummaryAfterDocumentFailure",
  );
  if (method) {
    return method.call(repository, knowledgeId, patch);
  }

  return repository.syncKnowledgeSummaryFromDocuments(
    knowledgeId,
    patch.updatedAt,
  );
};

export const adjustKnowledgeSummaryAfterDocumentRemoval = async (
  repository: KnowledgeRepository,
  knowledgeId: string,
  patch: {
    removedChunkCount: number;
    updatedAt: Date;
  },
): Promise<WithId<KnowledgeBaseDocument> | null> => {
  const method = readRepositoryMethod(
    repository,
    "adjustKnowledgeSummaryAfterDocumentRemoval",
  );
  if (method) {
    return method.call(repository, knowledgeId, patch);
  }

  return repository.syncKnowledgeSummaryFromDocuments(
    knowledgeId,
    patch.updatedAt,
  );
};

export const markKnowledgeDocumentsPendingByKnowledgeIds = async (
  repository: KnowledgeRepository,
  knowledgeIds: string[],
  updatedAt: Date,
): Promise<void> => {
  const method = readRepositoryMethod(
    repository,
    "markKnowledgeDocumentsPendingByKnowledgeIds",
  );
  if (method) {
    await method.call(repository, knowledgeIds, updatedAt);
    return;
  }

  await Promise.all(
    Array.from(new Set(knowledgeIds)).map((knowledgeId) =>
      repository.syncKnowledgeSummaryFromDocuments(knowledgeId, updatedAt),
    ),
  );
};

export const markKnowledgeNamespaceRebuildingIfIdle = async (
  repository: KnowledgeRepository,
  namespaceKey: string,
  patch: Partial<
    Omit<
      KnowledgeNamespaceIndexStateDocument,
      "_id" | "namespaceKey" | "scope" | "projectId" | "sourceType"
    >
  >,
): Promise<WithId<KnowledgeNamespaceIndexStateDocument> | null> => {
  const method = readRepositoryMethod(
    repository,
    "markKnowledgeNamespaceRebuildingIfIdle",
  );
  if (method) {
    return method.call(repository, namespaceKey, patch);
  }

  return repository.updateKnowledgeNamespaceIndexState(namespaceKey, patch);
};

export const createKnowledgeRepository = ({
  mongo,
}: {
  mongo: MongoDatabaseManager;
}): KnowledgeRepository => {
  return new KnowledgeRepository(mongo);
};
