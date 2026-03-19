import { type Collection, type Filter, type WithId } from "mongodb";
import { toObjectId } from "@lib/mongo-id.js";
import type {
  KnowledgeBaseDocument,
  KnowledgeScope,
  KnowledgeSourceType,
} from "./knowledge.types.js";

interface KnowledgeBaseCollectionAccess {
  getKnowledgeCollection(): Promise<Collection<KnowledgeBaseDocument>>;
}

export const listKnowledgeBases = async (
  { getKnowledgeCollection }: KnowledgeBaseCollectionAccess,
  options?: {
    scope?: KnowledgeScope;
    projectId?: string;
    sourceType?: KnowledgeSourceType;
  },
): Promise<WithId<KnowledgeBaseDocument>[]> => {
  const collection = await getKnowledgeCollection();

  return collection
    .find(buildKnowledgeBaseFilter(options))
    .sort({
      updatedAt: -1,
      createdAt: -1,
    })
    .toArray();
};

export const listKnowledgeBasesByNamespace = (
  access: KnowledgeBaseCollectionAccess,
  options: {
    scope: KnowledgeScope;
    projectId?: string | null;
    sourceType: KnowledgeSourceType;
  },
) => {
  return listKnowledgeBases(access, {
    scope: options.scope,
    projectId: options.projectId ?? undefined,
    sourceType: options.sourceType,
  });
};

export const findKnowledgeById = async (
  { getKnowledgeCollection }: KnowledgeBaseCollectionAccess,
  knowledgeId: string,
): Promise<WithId<KnowledgeBaseDocument> | null> => {
  const objectId = toObjectId(knowledgeId);
  if (!objectId) {
    return null;
  }

  const collection = await getKnowledgeCollection();
  return collection.findOne({ _id: objectId });
};

export const createKnowledgeBase = async (
  { getKnowledgeCollection }: KnowledgeBaseCollectionAccess,
  document: Omit<KnowledgeBaseDocument, "_id">,
): Promise<WithId<KnowledgeBaseDocument>> => {
  const collection = await getKnowledgeCollection();
  const result = await collection.insertOne(document);

  return {
    ...document,
    _id: result.insertedId,
  };
};

export const updateKnowledgeBase = async (
  { getKnowledgeCollection }: KnowledgeBaseCollectionAccess,
  knowledgeId: string,
  patch: Partial<
    Pick<
      KnowledgeBaseDocument,
      | "name"
      | "description"
      | "indexStatus"
      | "documentCount"
      | "chunkCount"
      | "updatedAt"
    >
  >,
): Promise<WithId<KnowledgeBaseDocument> | null> => {
  const objectId = toObjectId(knowledgeId);
  if (!objectId) {
    return null;
  }

  const collection = await getKnowledgeCollection();
  return collection.findOneAndUpdate(
    { _id: objectId },
    {
      $set: patch,
    },
    {
      returnDocument: "after",
    },
  );
};

export const deleteKnowledgeBase = async (
  { getKnowledgeCollection }: KnowledgeBaseCollectionAccess,
  knowledgeId: string,
): Promise<boolean> => {
  const objectId = toObjectId(knowledgeId);
  if (!objectId) {
    return false;
  }

  const collection = await getKnowledgeCollection();
  const result = await collection.deleteOne({ _id: objectId });
  return result.deletedCount === 1;
};

const buildKnowledgeBaseFilter = (options?: {
  scope?: KnowledgeScope;
  projectId?: string;
  sourceType?: KnowledgeSourceType;
}): Filter<KnowledgeBaseDocument> => {
  const filter: Filter<KnowledgeBaseDocument> = {};

  if (options?.scope) {
    filter.scope = options.scope;
  }

  if (options?.projectId !== undefined) {
    filter.projectId = options.projectId;
  }

  if (options?.sourceType) {
    filter.sourceType = options.sourceType;
  }

  return filter;
};
