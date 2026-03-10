import { MongoClient, type Db } from 'mongodb';
import type { AppEnv } from '@config/env.js';

export type DatabaseConnectionState = 'idle' | 'connecting' | 'connected' | 'error';
export type DatabaseHealthStatus = 'up' | 'down' | 'connecting';

export interface DatabaseHealthSnapshot {
  status: DatabaseHealthStatus;
  state: DatabaseConnectionState;
  database: string;
  host: string;
  checkedAt: string;
  lastError: string | null;
}

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown error';
};

export class MongoDatabaseManager {
  private readonly client: MongoClient;
  private database: Db | null = null;
  private connectPromise: Promise<void> | null = null;
  private state: DatabaseConnectionState = 'idle';
  private lastError: string | null = null;

  constructor(private readonly env: AppEnv) {
    this.client = new MongoClient(env.mongo.uri, {
      serverSelectionTimeoutMS: 5000,
    });
  }

  async connect(): Promise<void> {
    if (this.database) {
      return;
    }

    if (this.connectPromise) {
      await this.connectPromise;
      return;
    }

    this.state = 'connecting';
    this.lastError = null;

    this.connectPromise = (async () => {
      await this.client.connect();

      const db = this.client.db(this.env.mongo.dbName);
      await db.command({ ping: 1 });

      this.database = db;
      this.state = 'connected';
    })()
      .catch((error: unknown) => {
        this.state = 'error';
        this.lastError = getErrorMessage(error);
        this.database = null;
        throw error;
      })
      .finally(() => {
        this.connectPromise = null;
      });

    await this.connectPromise;
  }

  getDb(): Db {
    if (!this.database) {
      throw new Error('MongoDB has not been connected');
    }

    return this.database;
  }

  async getHealthSnapshot(): Promise<DatabaseHealthSnapshot> {
    if (!this.database) {
      if (this.connectPromise) {
        try {
          await this.connectPromise;
        } catch {
          return this.buildSnapshot('down');
        }
      } else {
        // health 只报告最后一次已知状态，不主动发起新的 Mongo 建连。
        return this.buildSnapshot(this.state === 'connecting' ? 'connecting' : 'down');
      }
    }

    try {
      await this.getDb().command({ ping: 1 });
      this.state = 'connected';
      this.lastError = null;
      return this.buildSnapshot('up');
    } catch (error: unknown) {
      this.state = 'error';
      this.lastError = getErrorMessage(error);
      this.database = null;
      return this.buildSnapshot('down');
    }
  }

  async close(): Promise<void> {
    this.database = null;
    this.state = 'idle';
    this.lastError = null;
    await this.client.close();
  }

  private buildSnapshot(status: DatabaseHealthStatus): DatabaseHealthSnapshot {
    return {
      status,
      state: this.state,
      database: this.env.mongo.dbName,
      host: this.env.mongo.host,
      checkedAt: new Date().toISOString(),
      lastError: this.lastError,
    };
  }
}
