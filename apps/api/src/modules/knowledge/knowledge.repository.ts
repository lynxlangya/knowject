import { ObjectId, type Collection, type WithId } from 'mongodb';
import type { MongoDatabaseManager } from '@db/mongo.js';
import {
  KNOWLEDGE_COLLECTION_NAME,
  KNOWLEDGE_DOCUMENT_COLLECTION_NAME,
} from './knowledge.shared.js';
import type {
  KnowledgeBaseDocument,
  KnowledgeDocumentRecord,
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

  async listKnowledgeBases(): Promise<WithId<KnowledgeBaseDocument>[]> {
    const collection = await this.getKnowledgeCollection();

    return collection
      .find({})
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

export const createKnowledgeRepository = ({
  mongo,
}: {
  mongo: MongoDatabaseManager;
}): KnowledgeRepository => {
  return new KnowledgeRepository(mongo);
};
