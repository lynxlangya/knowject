import {
  MongoServerError,
  ObjectId,
  type Collection,
  type WithId,
} from 'mongodb';
import type { MongoDatabaseManager } from '@db/mongo.js';
import type { AuthUserDocument, AuthUserProfile } from './auth.types.js';

interface CreateUserRecordInput {
  username: string;
  name: string;
  passwordHash: string;
}

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;
const REGEX_ESCAPE_PATTERN = /[.*+?^${}()|[\]\\]/g;

const toObjectId = (value: string): ObjectId | null => {
  if (!OBJECT_ID_REGEX.test(value)) {
    return null;
  }

  return new ObjectId(value);
};

const toAuthUserProfile = (user: WithId<AuthUserDocument>): AuthUserProfile => {
  return {
    id: user._id.toHexString(),
    username: user.username,
    name: user.name,
  };
};

const escapeRegex = (value: string): string => {
  return value.replace(REGEX_ESCAPE_PATTERN, '\\$&');
};

export const isDuplicateUsernameError = (error: unknown): boolean => {
  return error instanceof MongoServerError && error.code === 11000;
};

export class AuthRepository {
  private indexesEnsured = false;
  private ensureIndexesPromise: Promise<void> | null = null;

  constructor(private readonly mongo: MongoDatabaseManager) {}

  async findByUsername(username: string): Promise<WithId<AuthUserDocument> | null> {
    const collection = await this.getCollection();
    return collection.findOne({ username });
  }

  async findProfilesByIds(userIds: string[]): Promise<AuthUserProfile[]> {
    const objectIds = Array.from(new Set(userIds))
      .map((userId) => toObjectId(userId))
      .filter((objectId): objectId is ObjectId => objectId !== null);

    if (objectIds.length === 0) {
      return [];
    }

    const collection = await this.getCollection();
    const users = await collection.find({ _id: { $in: objectIds } }).toArray();

    return users.map(toAuthUserProfile);
  }

  async searchProfiles(query: string, limit: number): Promise<AuthUserProfile[]> {
    const collection = await this.getCollection();
    const normalizedLimit = Math.min(Math.max(limit, 1), 20);
    const normalizedQuery = query.trim();

    const filter = normalizedQuery
      ? {
          $or: [
            { username: { $regex: escapeRegex(normalizedQuery), $options: 'i' } },
            { name: { $regex: escapeRegex(normalizedQuery), $options: 'i' } },
          ],
        }
      : {};

    const users = await collection
      .find(filter)
      .sort({ username: 1, createdAt: -1 })
      .limit(normalizedLimit)
      .toArray();

    return users.map(toAuthUserProfile);
  }

  async createUser(input: CreateUserRecordInput): Promise<WithId<AuthUserDocument>> {
    const collection = await this.getCollection();
    const now = new Date();
    const document: Omit<AuthUserDocument, '_id'> = {
      username: input.username,
      name: input.name,
      passwordHash: input.passwordHash,
      createdAt: now,
      updatedAt: now,
    };

    const result = await collection.insertOne(document);

    return {
      ...document,
      _id: result.insertedId,
    } as WithId<AuthUserDocument>;
  }

  private async getCollection(): Promise<Collection<AuthUserDocument>> {
    await this.mongo.connect();
    const collection = this.mongo.getDb().collection<AuthUserDocument>('users');
    await this.ensureIndexes(collection);
    return collection;
  }

  private async ensureIndexes(collection: Collection<AuthUserDocument>): Promise<void> {
    if (this.indexesEnsured) {
      return;
    }

    if (!this.ensureIndexesPromise) {
      this.ensureIndexesPromise = collection
        .createIndex({ username: 1 }, { unique: true, name: 'users_username_unique' })
        .then(() => {
          this.indexesEnsured = true;
        })
        .finally(() => {
          this.ensureIndexesPromise = null;
        });
    }

    await this.ensureIndexesPromise;
  }
}

export const createAuthRepository = ({
  mongo,
}: {
  mongo: MongoDatabaseManager;
}): AuthRepository => {
  return new AuthRepository(mongo);
};
