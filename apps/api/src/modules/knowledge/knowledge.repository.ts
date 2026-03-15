import { ObjectId, type Collection, type Filter, type WithId } from 'mongodb';
import type { MongoDatabaseManager } from '@db/mongo.js';
import {
  KNOWLEDGE_COLLECTION_NAME,
  KNOWLEDGE_DOCUMENT_COLLECTION_NAME,
} from './knowledge.shared.js';
import type {
  KnowledgeBaseDocument,
  KnowledgeDocumentRecord,
  KnowledgeIndexStatus,
  KnowledgeScope,
} from './knowledge.types.js';

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

const toObjectId = (value: string): ObjectId | null => {
  if (!OBJECT_ID_REGEX.test(value)) {
    return null;
  }

  return new ObjectId(value);
};

export class KnowledgeRepository {
  private knowledgeIndexesEnsured = false;
  private ensureKnowledgeIndexesPromise: Promise<void> | null = null;
  private documentIndexesEnsured = false;
  private ensureDocumentIndexesPromise: Promise<void> | null = null;

  constructor(private readonly mongo: MongoDatabaseManager) {}

  getPrimaryDataStore(): 'mongodb' {
    return 'mongodb';
  }

  async ensureMetadataModel(): Promise<void> {
    await Promise.all([
      this.getKnowledgeCollection(),
      this.getKnowledgeDocumentsCollection(),
    ]);
  }

  async listKnowledgeBases(options?: {
    scope?: KnowledgeScope;
    projectId?: string;
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

  async createKnowledgeBase(
    document: Omit<KnowledgeBaseDocument, '_id'>,
  ): Promise<WithId<KnowledgeBaseDocument>> {
    const collection = await this.getKnowledgeCollection();
    const result = await collection.insertOne(document);

    return {
      ...document,
      _id: result.insertedId,
    };
  }

  async updateKnowledgeBase(
    knowledgeId: string,
    patch: Partial<
      Pick<
        KnowledgeBaseDocument,
        'name' | 'description' | 'indexStatus' | 'documentCount' | 'chunkCount' | 'updatedAt'
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
        returnDocument: 'after',
      },
    );
  }

  async createKnowledgeDocument(
    document: KnowledgeDocumentRecord & { _id: NonNullable<KnowledgeDocumentRecord['_id']> },
  ): Promise<WithId<KnowledgeDocumentRecord>> {
    const collection = await this.getKnowledgeDocumentsCollection();
    await collection.insertOne(document);

    return document;
  }

  async updateKnowledgeSummaryAfterDocumentUpload(
    knowledgeId: string,
    updatedAt: Date,
  ): Promise<WithId<KnowledgeBaseDocument> | null> {
    const objectId = toObjectId(knowledgeId);
    if (!objectId) {
      return null;
    }

    const collection = await this.getKnowledgeCollection();
    return collection.findOneAndUpdate(
      { _id: objectId },
      {
        $inc: {
          documentCount: 1,
        },
        $set: {
          indexStatus: 'pending',
          updatedAt,
        },
      },
      {
        returnDocument: 'after',
      },
    );
  }

  async updateKnowledgeDocument(
    documentId: string,
    patch: Partial<
      Pick<
        KnowledgeDocumentRecord,
        | 'status'
        | 'chunkCount'
        | 'lastIndexedAt'
        | 'errorMessage'
        | 'processedAt'
        | 'updatedAt'
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
        returnDocument: 'after',
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
    const chunkCount = documents.reduce((total, document) => total + document.chunkCount, 0);
    const indexStatus = resolveKnowledgeIndexStatus(documents);

    return this.updateKnowledgeBase(knowledgeId, {
      indexStatus,
      documentCount: documents.length,
      chunkCount,
      updatedAt,
    });
  }

  async deleteKnowledgeDocumentsByKnowledgeId(knowledgeId: string): Promise<number> {
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

  private async getKnowledgeCollection(): Promise<Collection<KnowledgeBaseDocument>> {
    await this.mongo.connect();
    const collection = this.mongo
      .getDb()
      .collection<KnowledgeBaseDocument>(KNOWLEDGE_COLLECTION_NAME);
    await this.ensureKnowledgeIndexes(collection);
    return collection;
  }

  private async getKnowledgeDocumentsCollection(): Promise<Collection<KnowledgeDocumentRecord>> {
    await this.mongo.connect();
    const collection = this.mongo
      .getDb()
      .collection<KnowledgeDocumentRecord>(KNOWLEDGE_DOCUMENT_COLLECTION_NAME);
    await this.ensureDocumentIndexes(collection);
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
        collection.createIndex({ name: 1 }, { name: 'knowledge_bases_name' }),
        collection.createIndex({ createdBy: 1 }, { name: 'knowledge_bases_created_by' }),
        collection.createIndex({ updatedAt: -1 }, { name: 'knowledge_bases_updated_at_desc' }),
        collection.createIndex(
          { scope: 1, updatedAt: -1 },
          { name: 'knowledge_bases_scope_updated_at_desc' },
        ),
        collection.createIndex(
          { scope: 1, projectId: 1, updatedAt: -1 },
          { name: 'knowledge_bases_scope_project_id_updated_at_desc' },
        ),
        collection.createIndex(
          { sourceType: 1, updatedAt: -1 },
          { name: 'knowledge_bases_source_type_updated_at_desc' },
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
          { name: 'knowledge_documents_knowledge_id_updated_at_desc' },
        ),
        collection.createIndex(
          { knowledgeId: 1, status: 1, updatedAt: -1 },
          { name: 'knowledge_documents_knowledge_id_status_updated_at_desc' },
        ),
        collection.createIndex(
          { knowledgeId: 1, documentVersionHash: 1 },
          { name: 'knowledge_documents_knowledge_id_version_hash' },
        ),
        collection.createIndex(
          { uploadedBy: 1, uploadedAt: -1 },
          { name: 'knowledge_documents_uploaded_by_uploaded_at_desc' },
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
}

const resolveKnowledgeIndexStatus = (
  documents: WithId<KnowledgeDocumentRecord>[],
): KnowledgeIndexStatus => {
  if (documents.length === 0) {
    return 'idle';
  }

  if (documents.some((document) => document.status === 'processing')) {
    return 'processing';
  }

  if (documents.some((document) => document.status === 'pending')) {
    return 'pending';
  }

  if (documents.some((document) => document.status === 'failed')) {
    return 'failed';
  }

  if (documents.every((document) => document.status === 'completed')) {
    return 'completed';
  }

  return 'idle';
};

const buildKnowledgeBaseFilter = (options?: {
  scope?: KnowledgeScope;
  projectId?: string;
}): Filter<KnowledgeBaseDocument> => {
  if (options?.scope === 'project') {
    return {
      scope: 'project',
      ...(options.projectId
        ? {
            projectId: options.projectId,
          }
        : {}),
    };
  }

  if (options?.scope === 'global') {
    return {
      $or: [
        { scope: 'global' },
        { scope: { $exists: false } },
      ],
    };
  }

  return {};
};

export const createKnowledgeRepository = ({
  mongo,
}: {
  mongo: MongoDatabaseManager;
}): KnowledgeRepository => {
  return new KnowledgeRepository(mongo);
};
