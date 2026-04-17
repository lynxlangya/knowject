import { ObjectId, type Collection, type WithId } from "mongodb";
import type { MongoDatabaseManager } from "@db/mongo.js";
import { toObjectId } from "@lib/mongo-id.js";
import {
  SKILL_CREATION_JOBS_COLLECTION_NAME,
  SKILLS_COLLECTION_NAME,
} from "./skills.shared.js";
import type { SkillCreationJobDocument } from "./skills.creation-jobs.js";
import type {
  SkillDocument,
  SkillLifecycleStatus,
  SkillSource,
} from "./skills.types.js";

export class SkillsRepository {
  private skillIndexesEnsured = false;
  private ensureSkillIndexesPromise: Promise<void> | null = null;
  private creationJobIndexesEnsured = false;
  private ensureCreationJobIndexesPromise: Promise<void> | null = null;

  constructor(private readonly mongo: MongoDatabaseManager) {}

  getPrimaryDataStore(): "mongodb" {
    return "mongodb";
  }

  async ensureMetadataModel(): Promise<void> {
    await Promise.all([
      this.getSkillsCollection(),
      this.getSkillCreationJobsCollection(),
    ]);
  }

  async listSkills(filters?: {
    source?: SkillSource;
    lifecycleStatus?: SkillLifecycleStatus;
  }): Promise<WithId<SkillDocument>[]> {
    const collection = await this.getSkillsCollection();

    return collection
      .find({
        ...(filters?.source ? { source: filters.source } : {}),
        ...(filters?.lifecycleStatus
          ? { lifecycleStatus: filters.lifecycleStatus }
          : {}),
      })
      .sort({
        updatedAt: -1,
        createdAt: -1,
      })
      .toArray();
  }

  async findSkillById(skillId: string): Promise<WithId<SkillDocument> | null> {
    const objectId = toObjectId(skillId);
    if (!objectId) {
      return null;
    }

    const collection = await this.getSkillsCollection();
    return collection.findOne({ _id: objectId });
  }

  async findSkillsByIds(skillIds: string[]): Promise<WithId<SkillDocument>[]> {
    const objectIds = skillIds
      .map((skillId) => toObjectId(skillId))
      .filter((skillId): skillId is ObjectId => Boolean(skillId));

    if (objectIds.length === 0) {
      return [];
    }

    const collection = await this.getSkillsCollection();
    return collection.find({ _id: { $in: objectIds } }).toArray();
  }

  async findSkillBySlug(slug: string): Promise<WithId<SkillDocument> | null> {
    const collection = await this.getSkillsCollection();
    return collection.findOne({ slug });
  }

  async createSkill(
    document: SkillDocument & { _id: NonNullable<SkillDocument["_id"]> },
  ): Promise<WithId<SkillDocument>> {
    const collection = await this.getSkillsCollection();
    await collection.insertOne(document);
    return document;
  }

  async updateSkill(
    skillId: string,
    patch: Partial<
      Pick<
        SkillDocument,
        | "source"
        | "name"
        | "slug"
        | "description"
        | "category"
        | "status"
        | "owner"
        | "definition"
        | "statusChangedAt"
        | "lifecycleStatus"
        | "skillMarkdown"
        | "markdownExcerpt"
        | "bundleFiles"
        | "importProvenance"
        | "publishedAt"
        | "updatedAt"
      >
    >,
  ): Promise<WithId<SkillDocument> | null> {
    const objectId = toObjectId(skillId);
    if (!objectId) {
      return null;
    }

    const collection = await this.getSkillsCollection();
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

  async deleteSkill(skillId: string): Promise<boolean> {
    const objectId = toObjectId(skillId);
    if (!objectId) {
      return false;
    }

    const collection = await this.getSkillsCollection();
    const result = await collection.deleteOne({ _id: objectId });
    return result.deletedCount === 1;
  }

  async createSkillCreationJob(
    document: SkillCreationJobDocument & {
      _id: NonNullable<SkillCreationJobDocument["_id"]>;
    },
  ): Promise<WithId<SkillCreationJobDocument>> {
    const collection = await this.getSkillCreationJobsCollection();
    await collection.insertOne(document);
    return document;
  }

  async listSkillCreationJobsByOwner(
    ownerId: string,
    options?: { limit?: number },
  ): Promise<WithId<SkillCreationJobDocument>[]> {
    const collection = await this.getSkillCreationJobsCollection();
    return collection
      .find({ ownerId })
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(options?.limit ?? 20)
      .toArray();
  }

  async findSkillCreationJobById(
    jobId: string,
  ): Promise<WithId<SkillCreationJobDocument> | null> {
    const objectId = toObjectId(jobId);
    if (!objectId) {
      return null;
    }

    const collection = await this.getSkillCreationJobsCollection();
    return collection.findOne({ _id: objectId });
  }

  async findSkillCreationJobByIdForOwner(
    jobId: string,
    ownerId: string,
  ): Promise<WithId<SkillCreationJobDocument> | null> {
    const objectId = toObjectId(jobId);
    if (!objectId) {
      return null;
    }

    const collection = await this.getSkillCreationJobsCollection();
    return collection.findOne({ _id: objectId, ownerId });
  }

  async updateSkillCreationJob(
    jobId: string,
    ownerId: string,
    patch: Partial<
      Pick<
        SkillCreationJobDocument,
        | "name"
        | "description"
        | "taskIntent"
        | "templateHint"
        | "status"
        | "markdownDraft"
        | "currentSummary"
        | "currentInference"
        | "confirmationQuestions"
        | "errorMessage"
        | "savedSkillId"
        | "updatedAt"
        | "startedAt"
        | "completedAt"
        | "failedAt"
        | "expiresAt"
      >
    >,
  ): Promise<WithId<SkillCreationJobDocument> | null> {
    const objectId = toObjectId(jobId);
    if (!objectId) {
      return null;
    }

    const collection = await this.getSkillCreationJobsCollection();
    return collection.findOneAndUpdate(
      { _id: objectId, ownerId },
      { $set: patch },
      { returnDocument: "after" },
    );
  }

  async updateSkillCreationJobById(
    jobId: string,
    patch: Partial<
      Pick<
        SkillCreationJobDocument,
        | "status"
        | "markdownDraft"
        | "currentSummary"
        | "currentInference"
        | "confirmationQuestions"
        | "errorMessage"
        | "savedSkillId"
        | "updatedAt"
        | "startedAt"
        | "completedAt"
        | "failedAt"
        | "expiresAt"
      >
    >,
  ): Promise<WithId<SkillCreationJobDocument> | null> {
    const objectId = toObjectId(jobId);
    if (!objectId) {
      return null;
    }

    const collection = await this.getSkillCreationJobsCollection();
    return collection.findOneAndUpdate(
      { _id: objectId },
      { $set: patch },
      { returnDocument: "after" },
    );
  }

  private async getSkillsCollection(): Promise<Collection<SkillDocument>> {
    await this.mongo.connect();
    const collection = this.mongo
      .getDb()
      .collection<SkillDocument>(SKILLS_COLLECTION_NAME);
    await this.ensureSkillIndexes(collection);
    return collection;
  }

  private async getSkillCreationJobsCollection(): Promise<
    Collection<SkillCreationJobDocument>
  > {
    await this.mongo.connect();
    const collection = this.mongo
      .getDb()
      .collection<SkillCreationJobDocument>(SKILL_CREATION_JOBS_COLLECTION_NAME);
    await this.ensureSkillCreationJobIndexes(collection);
    return collection;
  }

  private async ensureSkillIndexes(
    collection: Collection<SkillDocument>,
  ): Promise<void> {
    if (this.skillIndexesEnsured) {
      return;
    }

    if (!this.ensureSkillIndexesPromise) {
      this.ensureSkillIndexesPromise = Promise.all([
        collection.createIndex(
          { slug: 1 },
          { name: "skills_slug_unique", unique: true },
        ),
        collection.createIndex(
          { source: 1, updatedAt: -1 },
          { name: "skills_source_updated_at_desc" },
        ),
        collection.createIndex(
          { lifecycleStatus: 1, updatedAt: -1 },
          { name: "skills_lifecycle_status_updated_at_desc" },
        ),
        collection.createIndex({ createdBy: 1 }, { name: "skills_created_by" }),
      ])
        .then(() => {
          this.skillIndexesEnsured = true;
        })
        .finally(() => {
          this.ensureSkillIndexesPromise = null;
        });
    }

    await this.ensureSkillIndexesPromise;
  }

  private async ensureSkillCreationJobIndexes(
    collection: Collection<SkillCreationJobDocument>,
  ): Promise<void> {
    if (this.creationJobIndexesEnsured) {
      return;
    }

    if (!this.ensureCreationJobIndexesPromise) {
      this.ensureCreationJobIndexesPromise = Promise.all([
        collection.createIndex(
          { ownerId: 1, updatedAt: -1 },
          { name: "skill_creation_jobs_owner_updated_at_desc" },
        ),
        collection.createIndex(
          { expiresAt: 1 },
          { name: "skill_creation_jobs_expires_at_ttl", expireAfterSeconds: 0 },
        ),
      ])
        .then(() => {
          this.creationJobIndexesEnsured = true;
        })
        .finally(() => {
          this.ensureCreationJobIndexesPromise = null;
        });
    }

    await this.ensureCreationJobIndexesPromise;
  }
}

export const createSkillsRepository = ({
  mongo,
}: {
  mongo: MongoDatabaseManager;
}): SkillsRepository => {
  return new SkillsRepository(mongo);
};
