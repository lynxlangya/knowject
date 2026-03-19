import { type Collection, type Filter, type WithId } from "mongodb";
import type { MongoDatabaseManager } from "@db/mongo.js";
import { toObjectId } from "@lib/mongo-id.js";
import {
  KNOWLEDGE_COLLECTION_NAME,
  KNOWLEDGE_DOCUMENT_COLLECTION_NAME,
  KNOWLEDGE_NAMESPACE_INDEX_STATE_COLLECTION_NAME,
} from "./knowledge.shared.js";
import type {
  KnowledgeBaseDocument,
  KnowledgeDocumentRecord,
  KnowledgeIndexStatus,
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
    const collection = await this.getKnowledgeCollection();

    return collection
      .find(buildKnowledgeBaseFilter(options))
      .sort({
        updatedAt: -1,
        createdAt: -1,
      })
      .toArray();
  }

  async listKnowledgeBasesByNamespace(options: {
    scope: KnowledgeScope;
    projectId?: string | null;
    sourceType: KnowledgeSourceType;
  }): Promise<WithId<KnowledgeBaseDocument>[]> {
    return this.listKnowledgeBases({
      scope: options.scope,
      projectId: options.projectId ?? undefined,
      sourceType: options.sourceType,
    });
  }

  async findKnowledgeById(
    knowledgeId: string,
  ): Promise<WithId<KnowledgeBaseDocument> | null> {
    const objectId = toObjectId(knowledgeId);
    if (!objectId) {
      return null;
    }

    const collection = await this.getKnowledgeCollection();
    return collection.findOne({ _id: objectId });
  }

  async listDocumentsByKnowledgeId(
    knowledgeId: string,
  ): Promise<WithId<KnowledgeDocumentRecord>[]> {
    const collection = await this.getKnowledgeDocumentsCollection();

    return collection
      .find({ knowledgeId })
      .sort({
        uploadedAt: -1,
        updatedAt: -1,
      })
      .toArray();
  }

  async listDocumentsByKnowledgeIds(
    knowledgeIds: string[],
  ): Promise<WithId<KnowledgeDocumentRecord>[]> {
    if (knowledgeIds.length === 0) {
      return [];
    }

    const collection = await this.getKnowledgeDocumentsCollection();

    return collection
      .find({
        knowledgeId: {
          $in: knowledgeIds,
        },
      })
      .sort({
        uploadedAt: -1,
        updatedAt: -1,
      })
      .toArray();
  }

  async findKnowledgeDocumentById(
    documentId: string,
  ): Promise<WithId<KnowledgeDocumentRecord> | null> {
    const objectId = toObjectId(documentId);
    if (!objectId) {
      return null;
    }

    const collection = await this.getKnowledgeDocumentsCollection();
    return collection.findOne({ _id: objectId });
  }

  async findKnowledgeDocumentByVersionHash(
    knowledgeId: string,
    documentVersionHash: string,
  ): Promise<WithId<KnowledgeDocumentRecord> | null> {
    const collection = await this.getKnowledgeDocumentsCollection();

    return collection.findOne({
      knowledgeId,
      documentVersionHash,
    });
  }

  async listKnowledgeDocumentsForRecovery(
    staleProcessingBefore: Date,
  ): Promise<WithId<KnowledgeDocumentRecord>[]> {
    const collection = await this.getKnowledgeDocumentsCollection();

    return collection
      .find({
        $or: [
          {
            status: "pending",
          },
          {
            status: "processing",
            updatedAt: {
              $lte: staleProcessingBefore,
            },
          },
        ],
      })
      .sort({
        updatedAt: 1,
        createdAt: 1,
      })
      .toArray();
  }

  async createKnowledgeBase(
    document: Omit<KnowledgeBaseDocument, "_id">,
  ): Promise<WithId<KnowledgeBaseDocument>> {
    const collection = await this.getKnowledgeCollection();
    const result = await collection.insertOne(document);

    return {
      ...document,
      _id: result.insertedId,
    };
  }

  async findKnowledgeNamespaceIndexState(
    namespaceKey: string,
  ): Promise<WithId<KnowledgeNamespaceIndexStateDocument> | null> {
    const collection = await this.getKnowledgeNamespaceStateCollection();
    return collection.findOne({ namespaceKey });
  }

  async listKnowledgeNamespaceIndexStatesByRebuildStatus(
    rebuildStatus: KnowledgeNamespaceRebuildStatus,
  ): Promise<WithId<KnowledgeNamespaceIndexStateDocument>[]> {
    const collection = await this.getKnowledgeNamespaceStateCollection();
    return collection
      .find({ rebuildStatus })
      .sort({
        updatedAt: 1,
        createdAt: 1,
      })
      .toArray();
  }

  async createKnowledgeNamespaceIndexState(
    document: Omit<KnowledgeNamespaceIndexStateDocument, "_id">,
  ): Promise<WithId<KnowledgeNamespaceIndexStateDocument>> {
    const collection = await this.getKnowledgeNamespaceStateCollection();
    const result = await collection.insertOne(document);

    return {
      ...document,
      _id: result.insertedId,
    };
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
    const collection = await this.getKnowledgeNamespaceStateCollection();
    return collection.findOneAndUpdate(
      { namespaceKey },
      {
        $set: patch,
      },
      {
        returnDocument: "after",
      },
    );
  }

  async deleteKnowledgeNamespaceIndexState(
    namespaceKey: string,
  ): Promise<boolean> {
    const collection = await this.getKnowledgeNamespaceStateCollection();
    const result = await collection.deleteOne({ namespaceKey });
    return result.deletedCount === 1;
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
    return this.updateKnowledgeNamespaceIndexStateByRebuildStatus(
      namespaceKey,
      "idle",
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
    const objectId = toObjectId(knowledgeId);
    if (!objectId) {
      return null;
    }

    const collection = await this.getKnowledgeCollection();
    return collection.findOneAndUpdate(
      { _id: objectId },
      {
        $set: patch,
      },
      {
        returnDocument: "after",
      },
    );
  }

  async createKnowledgeDocument(
    document: KnowledgeDocumentRecord & {
      _id: NonNullable<KnowledgeDocumentRecord["_id"]>;
    },
  ): Promise<WithId<KnowledgeDocumentRecord>> {
    const collection = await this.getKnowledgeDocumentsCollection();
    await collection.insertOne(document);

    return document;
  }

  async updateKnowledgeSummaryAfterDocumentUpload(
    knowledgeId: string,
    updatedAt: Date,
  ): Promise<WithId<KnowledgeBaseDocument> | null> {
    return this.applyKnowledgeSummaryPatch(knowledgeId, {
      documentCountDelta: 1,
      indexStatus: "pending",
      updatedAt,
    });
  }

  async markKnowledgeSummaryPending(
    knowledgeId: string,
    updatedAt: Date,
  ): Promise<WithId<KnowledgeBaseDocument> | null> {
    return this.applyKnowledgeSummaryPatch(knowledgeId, {
      indexStatus: "pending",
      updatedAt,
    });
  }

  async markKnowledgeSummaryProcessing(
    knowledgeId: string,
    updatedAt: Date,
  ): Promise<WithId<KnowledgeBaseDocument> | null> {
    return this.applyKnowledgeSummaryPatch(knowledgeId, {
      indexStatus: "processing",
      updatedAt,
    });
  }

  async adjustKnowledgeSummaryAfterDocumentCompletion(
    knowledgeId: string,
    patch: {
      previousChunkCount: number;
      nextChunkCount: number;
      updatedAt: Date;
    },
  ): Promise<WithId<KnowledgeBaseDocument> | null> {
    const updatedKnowledge = await this.applyKnowledgeSummaryPatch(
      knowledgeId,
      {
        chunkCountDelta: patch.nextChunkCount - patch.previousChunkCount,
        updatedAt: patch.updatedAt,
      },
    );

    if (!updatedKnowledge) {
      return null;
    }

    return this.reconcileKnowledgeSummaryStatus(knowledgeId, patch.updatedAt);
  }

  async adjustKnowledgeSummaryAfterDocumentFailure(
    knowledgeId: string,
    patch: {
      previousChunkCount: number;
      updatedAt: Date;
    },
  ): Promise<WithId<KnowledgeBaseDocument> | null> {
    const updatedKnowledge = await this.applyKnowledgeSummaryPatch(
      knowledgeId,
      {
        chunkCountDelta: -patch.previousChunkCount,
        updatedAt: patch.updatedAt,
      },
    );

    if (!updatedKnowledge) {
      return null;
    }

    return this.reconcileKnowledgeSummaryStatus(knowledgeId, patch.updatedAt);
  }

  async adjustKnowledgeSummaryAfterDocumentRemoval(
    knowledgeId: string,
    patch: {
      removedChunkCount: number;
      updatedAt: Date;
    },
  ): Promise<WithId<KnowledgeBaseDocument> | null> {
    const updatedKnowledge = await this.applyKnowledgeSummaryPatch(
      knowledgeId,
      {
        documentCountDelta: -1,
        chunkCountDelta: -patch.removedChunkCount,
        updatedAt: patch.updatedAt,
      },
    );

    if (!updatedKnowledge) {
      return null;
    }

    return this.reconcileKnowledgeSummaryStatus(knowledgeId, patch.updatedAt);
  }

  async markKnowledgeDocumentsPendingByKnowledgeIds(
    knowledgeIds: string[],
    updatedAt: Date,
  ): Promise<void> {
    if (knowledgeIds.length === 0) {
      return;
    }

    const uniqueKnowledgeIds = Array.from(new Set(knowledgeIds));
    const collection = await this.getKnowledgeDocumentsCollection();
    await collection.updateMany(
      {
        knowledgeId: {
          $in: uniqueKnowledgeIds,
        },
      },
      {
        $set: {
          status: "pending",
          errorMessage: null,
          processedAt: null,
          updatedAt,
        },
      },
    );

    const knowledgeCollection = await this.getKnowledgeCollection();
    const knowledgeObjectIds = uniqueKnowledgeIds
      .map((knowledgeId) => toObjectId(knowledgeId))
      .filter((value): value is NonNullable<typeof value> => value !== null);

    if (knowledgeObjectIds.length === 0) {
      return;
    }

    await knowledgeCollection.updateMany(
      {
        _id: {
          $in: knowledgeObjectIds,
        },
      },
      {
        $set: {
          indexStatus: "pending",
          updatedAt,
        },
      },
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
    const objectId = toObjectId(documentId);
    if (!objectId) {
      return null;
    }

    const collection = await this.getKnowledgeDocumentsCollection();
    return collection.findOneAndUpdate(
      { _id: objectId },
      {
        $set: patch,
        ...(options?.incrementRetryCount
          ? {
              $inc: {
                retryCount: 1,
              },
            }
          : {}),
      },
      {
        returnDocument: "after",
      },
    );
  }

  async markKnowledgeDocumentPendingIfRetryable(
    documentId: string,
    updatedAt: Date,
  ): Promise<WithId<KnowledgeDocumentRecord> | null> {
    return this.updateKnowledgeDocumentByStatus(
      documentId,
      ["completed", "failed"],
      {
        status: "pending",
        errorMessage: null,
        processedAt: null,
        updatedAt,
      },
    );
  }

  async markKnowledgeDocumentPendingForRecovery(
    documentId: string,
    updatedAt: Date,
  ): Promise<WithId<KnowledgeDocumentRecord> | null> {
    return this.updateKnowledgeDocumentByStatus(
      documentId,
      ["pending", "processing"],
      {
        status: "pending",
        errorMessage: null,
        processedAt: null,
        updatedAt,
      },
    );
  }

  async markKnowledgeDocumentProcessingIfPending(
    documentId: string,
    updatedAt: Date,
  ): Promise<WithId<KnowledgeDocumentRecord> | null> {
    return this.updateKnowledgeDocumentByStatus(documentId, "pending", {
      status: "processing",
      errorMessage: null,
      processedAt: null,
      updatedAt,
    });
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
    return this.updateKnowledgeDocumentByStatus(documentId, "processing", {
      status: "completed",
      chunkCount: patch.chunkCount,
      embeddingProvider: patch.embeddingProvider,
      embeddingModel: patch.embeddingModel,
      lastIndexedAt: patch.lastIndexedAt,
      errorMessage: null,
      processedAt: patch.processedAt,
      updatedAt: patch.updatedAt,
    });
  }

  async markKnowledgeDocumentFailedIfProcessing(
    documentId: string,
    patch: Pick<
      KnowledgeDocumentRecord,
      "errorMessage" | "processedAt" | "updatedAt"
    >,
  ): Promise<WithId<KnowledgeDocumentRecord> | null> {
    return this.updateKnowledgeDocumentByStatus(
      documentId,
      "processing",
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
  }

  async markKnowledgeDocumentFailedIfRecoverable(
    documentId: string,
    patch: Pick<
      KnowledgeDocumentRecord,
      "errorMessage" | "processedAt" | "updatedAt"
    >,
  ): Promise<WithId<KnowledgeDocumentRecord> | null> {
    return this.updateKnowledgeDocumentByStatus(
      documentId,
      ["pending", "processing"],
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
  }

  async syncKnowledgeSummaryFromDocuments(
    knowledgeId: string,
    updatedAt: Date,
  ): Promise<WithId<KnowledgeBaseDocument> | null> {
    const knowledge = await this.findKnowledgeById(knowledgeId);
    if (!knowledge) {
      return null;
    }

    const documents = await this.listDocumentsByKnowledgeId(knowledgeId);
    const chunkCount = documents.reduce(
      (total, document) => total + document.chunkCount,
      0,
    );
    const indexStatus = resolveKnowledgeIndexStatus(documents);

    return this.updateKnowledgeBase(knowledgeId, {
      indexStatus,
      documentCount: documents.length,
      chunkCount,
      updatedAt,
    });
  }

  async deleteKnowledgeDocumentsByKnowledgeId(
    knowledgeId: string,
  ): Promise<number> {
    const collection = await this.getKnowledgeDocumentsCollection();
    const result = await collection.deleteMany({ knowledgeId });
    return result.deletedCount;
  }

  async deleteKnowledgeDocumentById(documentId: string): Promise<boolean> {
    const objectId = toObjectId(documentId);
    if (!objectId) {
      return false;
    }

    const collection = await this.getKnowledgeDocumentsCollection();
    const result = await collection.deleteOne({ _id: objectId });
    return result.deletedCount === 1;
  }

  async deleteKnowledgeBase(knowledgeId: string): Promise<boolean> {
    const objectId = toObjectId(knowledgeId);
    if (!objectId) {
      return false;
    }

    const collection = await this.getKnowledgeCollection();
    const result = await collection.deleteOne({ _id: objectId });
    return result.deletedCount === 1;
  }

  private async updateKnowledgeNamespaceIndexStateByRebuildStatus(
    namespaceKey: string,
    rebuildStatus: KnowledgeNamespaceRebuildStatus,
    patch: Partial<
      Omit<
        KnowledgeNamespaceIndexStateDocument,
        "_id" | "namespaceKey" | "scope" | "projectId" | "sourceType"
      >
    >,
  ): Promise<WithId<KnowledgeNamespaceIndexStateDocument> | null> {
    const collection = await this.getKnowledgeNamespaceStateCollection();
    return collection.findOneAndUpdate(
      { namespaceKey, rebuildStatus },
      {
        $set: patch,
      },
      {
        returnDocument: "after",
      },
    );
  }

  private async updateKnowledgeDocumentByStatus(
    documentId: string,
    currentStatus:
      | KnowledgeDocumentRecord["status"]
      | KnowledgeDocumentRecord["status"][],
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
    const objectId = toObjectId(documentId);
    if (!objectId) {
      return null;
    }

    const collection = await this.getKnowledgeDocumentsCollection();
    return collection.findOneAndUpdate(
      {
        _id: objectId,
        status: Array.isArray(currentStatus)
          ? {
              $in: currentStatus,
            }
          : currentStatus,
      },
      {
        $set: patch,
        ...(options?.incrementRetryCount
          ? {
              $inc: {
                retryCount: 1,
              },
            }
          : {}),
      },
      {
        returnDocument: "after",
      },
    );
  }

  private async applyKnowledgeSummaryPatch(
    knowledgeId: string,
    patch: {
      indexStatus?: KnowledgeIndexStatus;
      documentCountDelta?: number;
      chunkCountDelta?: number;
      updatedAt: Date;
    },
  ): Promise<WithId<KnowledgeBaseDocument> | null> {
    const objectId = toObjectId(knowledgeId);
    if (!objectId) {
      return null;
    }

    const collection = await this.getKnowledgeCollection();
    const increments: Record<string, number> = {};
    if (patch.documentCountDelta) {
      increments.documentCount = patch.documentCountDelta;
    }
    if (patch.chunkCountDelta) {
      increments.chunkCount = patch.chunkCountDelta;
    }

    return collection.findOneAndUpdate(
      { _id: objectId },
      {
        ...(Object.keys(increments).length > 0
          ? {
              $inc: increments,
            }
          : {}),
        $set: {
          ...(patch.indexStatus
            ? {
                indexStatus: patch.indexStatus,
              }
            : {}),
          updatedAt: patch.updatedAt,
        },
      },
      {
        returnDocument: "after",
      },
    );
  }

  private async resolveKnowledgeIndexStatusForKnowledge(
    knowledgeId: string,
  ): Promise<KnowledgeIndexStatus> {
    const collection = await this.getKnowledgeDocumentsCollection();

    const hasProcessingDocument = await this.findKnowledgeDocumentByStatuses(
      collection,
      knowledgeId,
      "processing",
    );
    if (hasProcessingDocument) {
      return "processing";
    }

    const hasPendingDocument = await this.findKnowledgeDocumentByStatuses(
      collection,
      knowledgeId,
      "pending",
    );
    if (hasPendingDocument) {
      return "pending";
    }

    const hasFailedDocument = await this.findKnowledgeDocumentByStatuses(
      collection,
      knowledgeId,
      "failed",
    );
    if (hasFailedDocument) {
      return "failed";
    }

    const hasAnyDocument = await collection.findOne(
      { knowledgeId },
      {
        projection: {
          _id: 1,
        },
      },
    );
    if (hasAnyDocument) {
      return "completed";
    }

    return "idle";
  }

  private async findKnowledgeDocumentByStatuses(
    collection: Collection<KnowledgeDocumentRecord>,
    knowledgeId: string,
    statuses:
      | KnowledgeDocumentRecord["status"]
      | KnowledgeDocumentRecord["status"][],
  ): Promise<boolean> {
    const document = await collection.findOne(
      {
        knowledgeId,
        status: Array.isArray(statuses)
          ? {
              $in: statuses,
            }
          : statuses,
      },
      {
        projection: {
          _id: 1,
        },
      },
    );

    return document !== null;
  }

  private async reconcileKnowledgeSummaryStatus(
    knowledgeId: string,
    updatedAt: Date,
  ): Promise<WithId<KnowledgeBaseDocument> | null> {
    const knowledge = await this.findKnowledgeById(knowledgeId);
    if (!knowledge) {
      return null;
    }

    const indexStatus = await this.resolveKnowledgeIndexStatusForKnowledge(
      knowledgeId,
    );

    return this.updateKnowledgeBase(knowledgeId, {
      indexStatus,
      updatedAt,
    });
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
    [K in Key]?: KnowledgeRepository[K];
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

const resolveKnowledgeIndexStatus = (
  documents: WithId<KnowledgeDocumentRecord>[],
): KnowledgeIndexStatus => {
  if (documents.length === 0) {
    return "idle";
  }

  if (documents.some((document) => document.status === "processing")) {
    return "processing";
  }

  if (documents.some((document) => document.status === "pending")) {
    return "pending";
  }

  if (documents.some((document) => document.status === "failed")) {
    return "failed";
  }

  if (documents.every((document) => document.status === "completed")) {
    return "completed";
  }

  return "idle";
};

const buildKnowledgeBaseFilter = (options?: {
  scope?: KnowledgeScope;
  projectId?: string;
  sourceType?: KnowledgeSourceType;
}): Filter<KnowledgeBaseDocument> => {
  const sourceTypeFilter = options?.sourceType
    ? {
        sourceType: options.sourceType,
      }
    : {};

  if (options?.scope === "project") {
    return {
      scope: "project",
      ...sourceTypeFilter,
      ...(options.projectId
        ? {
            projectId: options.projectId,
          }
        : {}),
    };
  }

  if (options?.scope === "global") {
    return {
      ...sourceTypeFilter,
      $or: [{ scope: "global" }, { scope: { $exists: false } }],
    };
  }

  return sourceTypeFilter;
};

export const createKnowledgeRepository = ({
  mongo,
}: {
  mongo: MongoDatabaseManager;
}): KnowledgeRepository => {
  return new KnowledgeRepository(mongo);
};
