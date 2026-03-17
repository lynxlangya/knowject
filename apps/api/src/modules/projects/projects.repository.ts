import { ObjectId, type Collection, type WithId } from 'mongodb';
import type { MongoDatabaseManager } from '@db/mongo.js';
import type {
  ProjectConversationDocument,
  ProjectConversationMessageDocument,
  ProjectDocument,
} from './projects.types.js';

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

const toObjectId = (value: string): ObjectId | null => {
  if (!OBJECT_ID_REGEX.test(value)) {
    return null;
  }

  return new ObjectId(value);
};

interface UpdateProjectConversationTitleOptions {
  expectedCurrentTitle?: string;
}

export class ProjectsRepository {
  private indexesEnsured = false;
  private ensureIndexesPromise: Promise<void> | null = null;

  constructor(private readonly mongo: MongoDatabaseManager) {}

  async listByMemberUserId(userId: string): Promise<WithId<ProjectDocument>[]> {
    const collection = await this.getCollection();

    return collection
      .find({
        'members.userId': userId,
      })
      .sort({
        updatedAt: -1,
        createdAt: -1,
      })
      .toArray();
  }

  async findById(projectId: string): Promise<WithId<ProjectDocument> | null> {
    const objectId = toObjectId(projectId);
    if (!objectId) {
      return null;
    }

    const collection = await this.getCollection();
    return collection.findOne({ _id: objectId });
  }

  async countBySkillId(skillId: string): Promise<number> {
    const collection = await this.getCollection();
    return collection.countDocuments({ skillIds: skillId });
  }

  async createProject(document: Omit<ProjectDocument, '_id'>): Promise<WithId<ProjectDocument>> {
    const collection = await this.getCollection();
    const result = await collection.insertOne(document);

    return {
      ...document,
      _id: result.insertedId,
    };
  }

  async updateProject(
    projectId: string,
    input: Partial<
      Pick<
        ProjectDocument,
        | 'name'
        | 'description'
        | 'knowledgeBaseIds'
        | 'agentIds'
        | 'skillIds'
        | 'updatedAt'
      >
    >,
  ): Promise<WithId<ProjectDocument> | null> {
    const objectId = toObjectId(projectId);
    if (!objectId) {
      return null;
    }

    const collection = await this.getCollection();
    const result = await collection.findOneAndUpdate(
      { _id: objectId },
      {
        $set: input,
      },
      {
        returnDocument: 'after',
      },
    );

    return result;
  }

  async replaceProjectMembers(
    projectId: string,
    members: ProjectDocument['members'],
    updatedAt: Date,
  ): Promise<WithId<ProjectDocument> | null> {
    const objectId = toObjectId(projectId);
    if (!objectId) {
      return null;
    }

    const collection = await this.getCollection();
    const result = await collection.findOneAndUpdate(
      { _id: objectId },
      {
        $set: {
          members,
          updatedAt,
        },
      },
      {
        returnDocument: 'after',
      },
    );

    return result;
  }

  async appendProjectConversation(
    projectId: string,
    conversation: ProjectConversationDocument,
    updatedAt: Date,
  ): Promise<WithId<ProjectDocument> | null> {
    const objectId = toObjectId(projectId);
    if (!objectId) {
      return null;
    }

    const collection = await this.getCollection();
    const result = await collection.findOneAndUpdate(
      { _id: objectId },
      {
        $push: {
          conversations: {
            $each: [conversation],
            $position: 0,
          },
        },
        $set: {
          updatedAt,
        },
      },
      {
        returnDocument: 'after',
      },
    );

    return result;
  }

  async materializeDefaultProjectConversation(
    projectId: string,
    conversation: ProjectConversationDocument,
    updatedAt: Date,
  ): Promise<WithId<ProjectDocument> | null> {
    const objectId = toObjectId(projectId);
    if (!objectId) {
      return null;
    }

    const collection = await this.getCollection();
    const result = await collection.findOneAndUpdate(
      {
        _id: objectId,
        'conversations.0': {
          $exists: false,
        },
      },
      {
        $push: {
          conversations: conversation,
        },
        $set: {
          updatedAt,
        },
      },
      {
        returnDocument: 'after',
      },
    );

    return result;
  }

  async appendProjectConversationMessage(
    projectId: string,
    conversationId: string,
    message: ProjectConversationMessageDocument,
    updatedAt: Date,
  ): Promise<WithId<ProjectDocument> | null> {
    const objectId = toObjectId(projectId);
    if (!objectId) {
      return null;
    }

    const collection = await this.getCollection();
    const result = await collection.findOneAndUpdate(
      {
        _id: objectId,
        'conversations.id': conversationId,
      },
      {
        $push: {
          'conversations.$.messages': message,
        },
        $set: {
          'conversations.$.updatedAt': updatedAt,
          updatedAt,
        },
      },
      {
        returnDocument: 'after',
      },
    );

    return result;
  }

  async updateProjectConversationTitle(
    projectId: string,
    conversationId: string,
    title: string,
    updatedAt: Date,
    options?: UpdateProjectConversationTitleOptions,
  ): Promise<WithId<ProjectDocument> | null> {
    const objectId = toObjectId(projectId);
    if (!objectId) {
      return null;
    }

    const collection = await this.getCollection();
    const result = await collection.findOneAndUpdate(
      options?.expectedCurrentTitle !== undefined
        ? {
            _id: objectId,
            conversations: {
              $elemMatch: {
                id: conversationId,
                title: options.expectedCurrentTitle,
              },
            },
          }
        : {
            _id: objectId,
            'conversations.id': conversationId,
          },
      {
        $set: {
          'conversations.$.title': title,
          'conversations.$.updatedAt': updatedAt,
          updatedAt,
        },
      },
      {
        returnDocument: 'after',
      },
    );

    return result;
  }

  async deleteProjectConversation(
    projectId: string,
    conversationId: string,
    updatedAt: Date,
  ): Promise<WithId<ProjectDocument> | null> {
    const objectId = toObjectId(projectId);
    if (!objectId) {
      return null;
    }

    const collection = await this.getCollection();
    const result = await collection.findOneAndUpdate(
      {
        _id: objectId,
        'conversations.id': conversationId,
        'conversations.1': {
          $exists: true,
        },
      },
      {
        $pull: {
          conversations: {
            id: conversationId,
          },
        },
        $set: {
          updatedAt,
        },
      },
      {
        returnDocument: 'after',
      },
    );

    return result;
  }

  async deleteProject(projectId: string): Promise<boolean> {
    const objectId = toObjectId(projectId);
    if (!objectId) {
      return false;
    }

    const collection = await this.getCollection();
    const result = await collection.deleteOne({ _id: objectId });

    return result.deletedCount === 1;
  }

  private async getCollection(): Promise<Collection<ProjectDocument>> {
    await this.mongo.connect();
    const collection = this.mongo.getDb().collection<ProjectDocument>('projects');
    await this.ensureIndexes(collection);
    return collection;
  }

  private async ensureIndexes(collection: Collection<ProjectDocument>): Promise<void> {
    if (this.indexesEnsured) {
      return;
    }

    if (!this.ensureIndexesPromise) {
      this.ensureIndexesPromise = Promise.all([
        collection.createIndex({ 'members.userId': 1 }, { name: 'projects_members_user_id' }),
        collection.createIndex({ ownerId: 1 }, { name: 'projects_owner_id' }),
        collection.createIndex({ skillIds: 1 }, { name: 'projects_skill_ids' }),
      ])
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

export const createProjectsRepository = ({
  mongo,
}: {
  mongo: MongoDatabaseManager;
}): ProjectsRepository => {
  return new ProjectsRepository(mongo);
};
