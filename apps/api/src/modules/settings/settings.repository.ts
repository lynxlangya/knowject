import { type Collection, type WithId } from 'mongodb';
import type { MongoDatabaseManager } from '@db/mongo.js';
import type { WorkspaceSettingsDocument } from './settings.types.js';
import { SETTINGS_SINGLETON_ID } from './settings.types.js';

export const WORKSPACE_SETTINGS_COLLECTION_NAME = 'workspace_settings';

export class SettingsRepository {
  private indexesEnsured = false;
  private ensureIndexesPromise: Promise<void> | null = null;

  constructor(private readonly mongo: MongoDatabaseManager) {}

  getPrimaryDataStore(): 'mongodb' {
    return 'mongodb';
  }

  async ensureMetadataModel(): Promise<void> {
    await this.getCollection();
  }

  async getSettings(): Promise<WithId<WorkspaceSettingsDocument> | null> {
    const collection = await this.getCollection();
    return collection.findOne({ singleton: SETTINGS_SINGLETON_ID });
  }

  async upsertSettings(
    patch: Partial<
      Pick<
        WorkspaceSettingsDocument,
        'embedding' | 'llm' | 'indexing' | 'workspace' | 'updatedAt' | 'updatedBy'
      >
    >,
  ): Promise<WithId<WorkspaceSettingsDocument>> {
    const collection = await this.getCollection();
    const settings = await collection.findOneAndUpdate(
      { singleton: SETTINGS_SINGLETON_ID },
      {
        $set: {
          singleton: SETTINGS_SINGLETON_ID,
          ...patch,
        },
      },
      {
        upsert: true,
        returnDocument: 'after',
      },
    );

    if (!settings) {
      throw new Error('workspace_settings upsert failed');
    }

    return settings;
  }

  private async getCollection(): Promise<Collection<WorkspaceSettingsDocument>> {
    await this.mongo.connect();
    const collection = this.mongo
      .getDb()
      .collection<WorkspaceSettingsDocument>(WORKSPACE_SETTINGS_COLLECTION_NAME);
    await this.ensureIndexes(collection);
    return collection;
  }

  private async ensureIndexes(
    collection: Collection<WorkspaceSettingsDocument>,
  ): Promise<void> {
    if (this.indexesEnsured) {
      return;
    }

    if (!this.ensureIndexesPromise) {
      this.ensureIndexesPromise = collection
        .createIndex(
          { singleton: 1 },
          {
            name: 'workspace_settings_singleton_unique',
            unique: true,
          },
        )
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

export const createSettingsRepository = ({
  mongo,
}: {
  mongo: MongoDatabaseManager;
}): SettingsRepository => {
  return new SettingsRepository(mongo);
};
