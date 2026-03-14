import { ObjectId, type Collection, type WithId } from 'mongodb';
import type { MongoDatabaseManager } from '@db/mongo.js';
import { AGENTS_COLLECTION_NAME } from './agents.shared.js';
import type { AgentDocument } from './agents.types.js';

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

const toObjectId = (value: string): ObjectId | null => {
  if (!OBJECT_ID_REGEX.test(value)) {
    return null;
  }

  return new ObjectId(value);
};

export class AgentsRepository {
  private agentIndexesEnsured = false;
  private ensureAgentIndexesPromise: Promise<void> | null = null;

  constructor(private readonly mongo: MongoDatabaseManager) {}

  getPrimaryDataStore(): 'mongodb' {
    return 'mongodb';
  }

  async listAgents(): Promise<WithId<AgentDocument>[]> {
    const collection = await this.getAgentsCollection();

    return collection
      .find({})
      .sort({
        updatedAt: -1,
        createdAt: -1,
      })
      .toArray();
  }

  async findAgentById(agentId: string): Promise<WithId<AgentDocument> | null> {
    const objectId = toObjectId(agentId);
    if (!objectId) {
      return null;
    }

    const collection = await this.getAgentsCollection();
    return collection.findOne({ _id: objectId });
  }

  async countByBoundSkillId(skillId: string): Promise<number> {
    const collection = await this.getAgentsCollection();
    return collection.countDocuments({ boundSkillIds: skillId });
  }

  async createAgent(
    document: Omit<AgentDocument, '_id'>,
  ): Promise<WithId<AgentDocument>> {
    const collection = await this.getAgentsCollection();
    const result = await collection.insertOne(document);

    return {
      ...document,
      _id: result.insertedId,
    };
  }

  async updateAgent(
    agentId: string,
    patch: Partial<
      Pick<
        AgentDocument,
        | 'name'
        | 'description'
        | 'systemPrompt'
        | 'boundSkillIds'
        | 'boundKnowledgeIds'
        | 'status'
        | 'updatedAt'
      >
    >,
  ): Promise<WithId<AgentDocument> | null> {
    const objectId = toObjectId(agentId);
    if (!objectId) {
      return null;
    }

    const collection = await this.getAgentsCollection();
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

  async deleteAgent(agentId: string): Promise<boolean> {
    const objectId = toObjectId(agentId);
    if (!objectId) {
      return false;
    }

    const collection = await this.getAgentsCollection();
    const result = await collection.deleteOne({ _id: objectId });
    return result.deletedCount === 1;
  }

  private async getAgentsCollection(): Promise<Collection<AgentDocument>> {
    await this.mongo.connect();
    const collection = this.mongo
      .getDb()
      .collection<AgentDocument>(AGENTS_COLLECTION_NAME);
    await this.ensureAgentIndexes(collection);
    return collection;
  }

  private async ensureAgentIndexes(
    collection: Collection<AgentDocument>,
  ): Promise<void> {
    if (this.agentIndexesEnsured) {
      return;
    }

    if (!this.ensureAgentIndexesPromise) {
      this.ensureAgentIndexesPromise = Promise.all([
        collection.createIndex({ name: 1 }, { name: 'agents_name' }),
        collection.createIndex({ createdBy: 1 }, { name: 'agents_created_by' }),
        collection.createIndex({ updatedAt: -1 }, { name: 'agents_updated_at_desc' }),
        collection.createIndex({ boundSkillIds: 1 }, { name: 'agents_bound_skill_ids' }),
        collection.createIndex(
          { status: 1, updatedAt: -1 },
          { name: 'agents_status_updated_at_desc' },
        ),
      ])
        .then(() => {
          this.agentIndexesEnsured = true;
        })
        .finally(() => {
          this.ensureAgentIndexesPromise = null;
        });
    }

    await this.ensureAgentIndexesPromise;
  }
}

export const createAgentsRepository = ({
  mongo,
}: {
  mongo: MongoDatabaseManager;
}): AgentsRepository => {
  return new AgentsRepository(mongo);
};
