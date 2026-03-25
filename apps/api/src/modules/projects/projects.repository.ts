import { type Collection, type WithId } from "mongodb";
import type { MongoDatabaseManager } from "@db/mongo.js";
import { toObjectId } from "@lib/mongo-id.js";
import type {
  ProjectConversationCollectionDocument,
  ProjectConversationMessageDocument,
  ProjectConversationTitleOrigin,
  ProjectDocument,
} from "./projects.types.js";

interface UpdateProjectConversationTitleOptions {
  expectedCurrentTitle?: string;
  titleOrigin?: ProjectConversationTitleOrigin;
}

interface ReplaceProjectConversationMessagesOptions {
  title?: string;
  titleOrigin?: ProjectConversationTitleOrigin | null;
  expectedCurrentUpdatedAt?: Date;
}

interface UpdateProjectConversationMessageMetadataPatch {
  starred: boolean;
  starredAt: Date | null;
  starredBy: string | null;
}

export class ProjectsRepository {
  private indexesEnsured = false;
  private ensureIndexesPromise: Promise<void> | null = null;

  constructor(private readonly mongo: MongoDatabaseManager) {}

  async listByMemberUserId(userId: string): Promise<WithId<ProjectDocument>[]> {
    const collection = await this.getCollection();

    return collection
      .find({
        "members.userId": userId,
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

  async createProject(
    document: Omit<ProjectDocument, "_id">,
  ): Promise<WithId<ProjectDocument>> {
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
        | "name"
        | "description"
        | "knowledgeBaseIds"
        | "agentIds"
        | "skillIds"
        | "updatedAt"
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
        returnDocument: "after",
      },
    );

    return result;
  }

  async replaceProjectMembers(
    projectId: string,
    members: ProjectDocument["members"],
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
        returnDocument: "after",
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
    const collection = this.mongo
      .getDb()
      .collection<ProjectDocument>("projects");
    await this.ensureIndexes(collection);
    return collection;
  }

  private async ensureIndexes(
    collection: Collection<ProjectDocument>,
  ): Promise<void> {
    if (this.indexesEnsured) {
      return;
    }

    if (!this.ensureIndexesPromise) {
      this.ensureIndexesPromise = Promise.all([
        collection.createIndex(
          { "members.userId": 1 },
          { name: "projects_members_user_id" },
        ),
        collection.createIndex(
          { "members.userId": 1, updatedAt: -1 },
          { name: "projects_members_user_id_updated_at_desc" },
        ),
        collection.createIndex({ ownerId: 1 }, { name: "projects_owner_id" }),
        collection.createIndex({ skillIds: 1 }, { name: "projects_skill_ids" }),
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

export class ProjectConversationsRepository {
  private indexesEnsured = false;
  private ensureIndexesPromise: Promise<void> | null = null;

  constructor(private readonly mongo: MongoDatabaseManager) {}

  async listByProjectId(
    projectId: string,
  ): Promise<WithId<ProjectConversationCollectionDocument>[]> {
    const collection = await this.getCollection();

    return collection
      .find({ projectId })
      .sort({
        updatedAt: -1,
        createdAt: -1,
      })
      .toArray();
  }

  async findByProjectAndConversationId(
    projectId: string,
    conversationId: string,
  ): Promise<WithId<ProjectConversationCollectionDocument> | null> {
    const collection = await this.getCollection();
    return collection.findOne({
      projectId,
      id: conversationId,
    });
  }

  async createConversation(
    document: Omit<ProjectConversationCollectionDocument, "_id">,
  ): Promise<WithId<ProjectConversationCollectionDocument>> {
    const collection = await this.getCollection();

    try {
      const result = await collection.insertOne(document);
      await this.touchProjectUpdatedAt(document.projectId, document.updatedAt);

      return {
        ...document,
        _id: result.insertedId,
      };
    } catch (error) {
      const existingConversation = await collection.findOne({
        projectId: document.projectId,
        id: document.id,
      });

      if (existingConversation) {
        return existingConversation;
      }

      throw error;
    }
  }

  async updateTitle(
    projectId: string,
    conversationId: string,
    title: string,
    options?: UpdateProjectConversationTitleOptions,
  ): Promise<WithId<ProjectConversationCollectionDocument> | null> {
    const updatedAt = new Date();
    const collection = await this.getCollection();
    const result = await collection.findOneAndUpdate(
      options?.expectedCurrentTitle !== undefined
        ? {
            projectId,
            id: conversationId,
            title: options.expectedCurrentTitle,
          }
        : {
            projectId,
            id: conversationId,
          },
      {
        $set: {
          title,
          ...(options?.titleOrigin !== undefined
            ? {
                titleOrigin: options.titleOrigin,
              }
            : {}),
          updatedAt,
        },
      },
      {
        returnDocument: "after",
      },
    );

    if (result) {
      await this.touchProjectUpdatedAt(projectId, updatedAt);
    }

    return result;
  }

  async appendMessage(
    projectId: string,
    conversationId: string,
    message: ProjectConversationMessageDocument,
    updatedAt: Date,
  ): Promise<WithId<ProjectConversationCollectionDocument> | null> {
    const collection = await this.getCollection();
    const result = await collection.findOneAndUpdate(
      {
        projectId,
        id: conversationId,
      },
      {
        $push: {
          messages: message,
        },
        $set: {
          updatedAt,
        },
      },
      {
        returnDocument: "after",
      },
    );

    if (result) {
      await this.touchProjectUpdatedAt(projectId, updatedAt);
    }

    return result;
  }

  async replaceMessages(
    projectId: string,
    conversationId: string,
    messages: ProjectConversationMessageDocument[],
    options?: ReplaceProjectConversationMessagesOptions,
  ): Promise<WithId<ProjectConversationCollectionDocument> | null> {
    const updatedAt = new Date();
    const collection = await this.getCollection();
    const updateQuery =
      options?.expectedCurrentUpdatedAt !== undefined
        ? {
            projectId,
            id: conversationId,
            updatedAt: options.expectedCurrentUpdatedAt,
          }
        : {
            projectId,
            id: conversationId,
          };
    const updateDocument: {
      $set: Record<string, unknown>;
      $unset?: Record<string, "" | 1 | true>;
    } = {
      $set: {
        messages,
        ...(options?.title !== undefined
          ? {
              title: options.title,
            }
          : {}),
        ...(options?.titleOrigin !== undefined && options.titleOrigin !== null
          ? {
              titleOrigin: options.titleOrigin,
            }
          : {}),
        updatedAt,
      },
    };

    if (options?.titleOrigin === null) {
      updateDocument.$unset = {
        titleOrigin: "",
      };
    }

    const result = await collection.findOneAndUpdate(
      updateQuery,
      updateDocument,
      {
        returnDocument: "after",
      },
    );

    if (result) {
      await this.touchProjectUpdatedAt(projectId, updatedAt);
    }

    return result;
  }

  async updateMessageMetadata(
    projectId: string,
    conversationId: string,
    messageId: string,
    patch: UpdateProjectConversationMessageMetadataPatch,
  ): Promise<WithId<ProjectConversationCollectionDocument> | null> {
    const collection = await this.getCollection();
    const setDocument: Record<string, unknown> = {};
    const unsetDocument: Record<string, ""> = {};

    if (patch.starredAt !== null) {
      setDocument["messages.$[message].starredAt"] = patch.starredAt;
      setDocument["messages.$[message].starredBy"] = patch.starredBy;
    } else {
      unsetDocument["messages.$[message].starredAt"] = "";
      unsetDocument["messages.$[message].starredBy"] = "";
    }

    const updateDocument: {
      $set?: Record<string, unknown>;
      $unset?: Record<string, "">;
    } = {};

    if (Object.keys(setDocument).length > 0) {
      updateDocument.$set = setDocument;
    }

    if (Object.keys(unsetDocument).length > 0) {
      updateDocument.$unset = unsetDocument;
    }

    const result = await collection.findOneAndUpdate(
      {
        projectId,
        id: conversationId,
        "messages.id": messageId,
      },
      updateDocument,
      {
        arrayFilters: [
          {
            "message.id": messageId,
          },
        ],
        returnDocument: "after",
      },
    );

    return result;
  }

  async deleteConversation(
    projectId: string,
    conversationId: string,
    updatedAt: Date,
  ): Promise<boolean> {
    const collection = await this.getCollection();
    const conversationCount = await collection.countDocuments({ projectId });

    if (conversationCount <= 1) {
      return false;
    }

    const result = await collection.deleteOne({
      projectId,
      id: conversationId,
    });

    if (result.deletedCount === 1) {
      await this.touchProjectUpdatedAt(projectId, updatedAt);
      return true;
    }

    return false;
  }

  async deleteByProjectId(projectId: string): Promise<number> {
    const collection = await this.getCollection();
    const result = await collection.deleteMany({ projectId });

    return result.deletedCount;
  }

  async ensureIndexes(): Promise<void> {
    const collection = await this.getCollection();
    await this.ensureCollectionIndexes(collection);
  }

  private async getCollection(): Promise<
    Collection<ProjectConversationCollectionDocument>
  > {
    await this.mongo.connect();
    const collection = this.mongo
      .getDb()
      .collection<ProjectConversationCollectionDocument>(
        "project_conversations",
      );
    await this.ensureCollectionIndexes(collection);
    return collection;
  }

  private async ensureCollectionIndexes(
    collection: Collection<ProjectConversationCollectionDocument>,
  ): Promise<void> {
    if (this.indexesEnsured) {
      return;
    }

    if (!this.ensureIndexesPromise) {
      this.ensureIndexesPromise = Promise.all([
        collection.createIndex(
          { projectId: 1, updatedAt: -1 },
          { name: "project_conversations_project_id_updated_at_desc" },
        ),
        collection.createIndex(
          { projectId: 1, id: 1 },
          {
            name: "project_conversations_project_id_id_unique",
            unique: true,
          },
        ),
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

  private async touchProjectUpdatedAt(
    projectId: string,
    updatedAt: Date,
  ): Promise<void> {
    const objectId = toObjectId(projectId);
    if (!objectId) {
      return;
    }

    await this.mongo.connect();
    await this.mongo
      .getDb()
      .collection<ProjectDocument>("projects")
      .updateOne(
        { _id: objectId },
        {
          $set: {
            updatedAt,
          },
        },
      );
  }
}

export const createProjectsRepository = ({
  mongo,
}: {
  mongo: MongoDatabaseManager;
}): ProjectsRepository => {
  return new ProjectsRepository(mongo);
};

export const createProjectConversationsRepository = ({
  mongo,
}: {
  mongo: MongoDatabaseManager;
}): ProjectConversationsRepository => {
  return new ProjectConversationsRepository(mongo);
};
