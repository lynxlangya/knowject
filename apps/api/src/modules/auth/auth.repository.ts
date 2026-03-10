import {
  MongoServerError,
  type Collection,
  type WithId,
} from 'mongodb';
import type { MongoDatabaseManager } from '@db/mongo.js';
import type { AuthUserDocument } from './auth.types.js';

interface CreateUserRecordInput {
  username: string;
  name: string;
  passwordHash: string;
}

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
