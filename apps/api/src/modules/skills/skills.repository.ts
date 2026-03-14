import { ObjectId, type Collection, type WithId } from 'mongodb';
import type { MongoDatabaseManager } from '@db/mongo.js';
import { SKILLS_COLLECTION_NAME } from './skills.shared.js';
import type {
  SkillDocument,
  SkillLifecycleStatus,
  SkillSource,
} from './skills.types.js';

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

const toObjectId = (value: string): ObjectId | null => {
  if (!OBJECT_ID_REGEX.test(value)) {
    return null;
  }

  return new ObjectId(value);
};

export class SkillsRepository {
  private skillIndexesEnsured = false;
  private ensureSkillIndexesPromise: Promise<void> | null = null;

  constructor(private readonly mongo: MongoDatabaseManager) {}

  getPrimaryDataStore(): 'mongodb' {
    return 'mongodb';
  }

  async ensureMetadataModel(): Promise<void> {
    await this.getSkillsCollection();
  }

  async listSkills(filters?: {
    source?: SkillSource;
    lifecycleStatus?: SkillLifecycleStatus;
  }): Promise<WithId<SkillDocument>[]> {
    const collection = await this.getSkillsCollection();

    return collection
      .find({
        ...(filters?.source ? { source: filters.source } : {}),
        ...(filters?.lifecycleStatus ? { lifecycleStatus: filters.lifecycleStatus } : {}),
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
    document: SkillDocument & { _id: NonNullable<SkillDocument['_id']> },
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
        | 'name'
        | 'slug'
        | 'description'
        | 'lifecycleStatus'
        | 'skillMarkdown'
        | 'markdownExcerpt'
        | 'bundleFiles'
        | 'importProvenance'
        | 'publishedAt'
        | 'updatedAt'
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
        returnDocument: 'after',
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

  private async getSkillsCollection(): Promise<Collection<SkillDocument>> {
    await this.mongo.connect();
    const collection = this.mongo
      .getDb()
      .collection<SkillDocument>(SKILLS_COLLECTION_NAME);
    await this.ensureSkillIndexes(collection);
    return collection;
  }

  private async ensureSkillIndexes(collection: Collection<SkillDocument>): Promise<void> {
    if (this.skillIndexesEnsured) {
      return;
    }

    if (!this.ensureSkillIndexesPromise) {
      this.ensureSkillIndexesPromise = Promise.all([
        collection.createIndex({ slug: 1 }, { name: 'skills_slug_unique', unique: true }),
        collection.createIndex({ source: 1, updatedAt: -1 }, { name: 'skills_source_updated_at_desc' }),
        collection.createIndex(
          { lifecycleStatus: 1, updatedAt: -1 },
          { name: 'skills_lifecycle_status_updated_at_desc' },
        ),
        collection.createIndex({ createdBy: 1 }, { name: 'skills_created_by' }),
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
}

export const createSkillsRepository = ({
  mongo,
}: {
  mongo: MongoDatabaseManager;
}): SkillsRepository => {
  return new SkillsRepository(mongo);
};
