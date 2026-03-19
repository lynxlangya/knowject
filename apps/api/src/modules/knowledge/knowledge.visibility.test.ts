import assert from "node:assert/strict";
import test from "node:test";
import { ObjectId } from "mongodb";
import { AppError } from "@lib/app-error.js";
import type { ProjectsRepository } from "@modules/projects/projects.repository.js";
import type { KnowledgeRepository } from "./knowledge.repository.js";
import {
  requireKnowledgeInProject,
  requireVisibleKnowledge,
} from "./knowledge.visibility.js";
import type { KnowledgeBaseDocument } from "./knowledge.types.js";

const createKnowledgeNotFoundError = (): AppError => {
  return new AppError({
    statusCode: 404,
    code: "KNOWLEDGE_NOT_FOUND",
    message: "知识库不存在",
  });
};

const createKnowledge = (
  overrides: Partial<KnowledgeBaseDocument> & {
    _id?: ObjectId;
  } = {},
): KnowledgeBaseDocument & { _id: ObjectId } => {
  return {
    _id: overrides._id ?? new ObjectId("507f1f77bcf86cd799439021"),
    name: "知识库",
    description: "",
    scope: "global",
    projectId: null,
    sourceType: "global_docs",
    indexStatus: "idle",
    documentCount: 0,
    chunkCount: 0,
    maintainerId: "user-1",
    createdBy: "user-1",
    createdAt: new Date("2026-03-18T00:00:00.000Z"),
    updatedAt: new Date("2026-03-18T00:00:00.000Z"),
    ...overrides,
  };
};

test("requireVisibleKnowledge returns global knowledge without project membership lookup", async () => {
  const knowledge = createKnowledge();
  let projectLookupCount = 0;

  const result = await requireVisibleKnowledge({
    repository: {
      findKnowledgeById: async () => knowledge,
    } as unknown as KnowledgeRepository,
    projectsRepository: {
      findById: async () => {
        projectLookupCount += 1;
        return null;
      },
    } as unknown as ProjectsRepository,
    actorId: "user-1",
    knowledgeId: knowledge._id.toHexString(),
    createKnowledgeNotFoundError,
  });

  assert.equal(result._id.toHexString(), knowledge._id.toHexString());
  assert.equal(projectLookupCount, 0);
});

test("requireVisibleKnowledge hides project knowledge from non-members", async () => {
  const projectId = "507f1f77bcf86cd799439031";
  const knowledge = createKnowledge({
    scope: "project",
    projectId,
  });

  await assert.rejects(
    () =>
      requireVisibleKnowledge({
        repository: {
          findKnowledgeById: async () => knowledge,
        } as unknown as KnowledgeRepository,
        projectsRepository: {
          findById: async () => ({
            _id: new ObjectId(projectId),
            name: "项目",
            description: "",
            ownerId: "other-user",
            members: [],
            knowledgeBaseIds: [],
            agentIds: [],
            skillIds: [],
            conversations: [],
            createdAt: new Date("2026-03-18T00:00:00.000Z"),
            updatedAt: new Date("2026-03-18T00:00:00.000Z"),
          }),
        } as unknown as ProjectsRepository,
        actorId: "user-1",
        knowledgeId: knowledge._id.toHexString(),
        createKnowledgeNotFoundError,
      }),
    /知识库不存在/,
  );
});

test("requireKnowledgeInProject rejects knowledge from another project namespace", async () => {
  const projectId = "507f1f77bcf86cd799439031";
  const otherProjectId = "507f1f77bcf86cd799439032";
  const knowledge = createKnowledge({
    scope: "project",
    projectId: otherProjectId,
  });

  await assert.rejects(
    () =>
      requireKnowledgeInProject({
        repository: {
          findKnowledgeById: async () => knowledge,
        } as unknown as KnowledgeRepository,
        projectsRepository: {
          findById: async (id: string) =>
            id === projectId
              ? {
                  _id: new ObjectId(projectId),
                  name: "项目",
                  description: "",
                  ownerId: "user-1",
                  members: [
                    {
                      userId: "user-1",
                      role: "admin",
                      joinedAt: new Date("2026-03-18T00:00:00.000Z"),
                    },
                  ],
                  knowledgeBaseIds: [],
                  agentIds: [],
                  skillIds: [],
                  conversations: [],
                  createdAt: new Date("2026-03-18T00:00:00.000Z"),
                  updatedAt: new Date("2026-03-18T00:00:00.000Z"),
                }
              : null,
        } as unknown as ProjectsRepository,
        actor: {
          id: "user-1",
          username: "langya",
        },
        projectId,
        knowledgeId: knowledge._id.toHexString(),
        createKnowledgeNotFoundError,
      }),
    /知识库不存在/,
  );
});
