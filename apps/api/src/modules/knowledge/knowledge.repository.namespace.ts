import { type Collection, type WithId } from "mongodb";
import type {
  KnowledgeNamespaceIndexStateDocument,
  KnowledgeNamespaceRebuildStatus,
} from "./knowledge.types.js";

interface KnowledgeNamespaceCollectionAccess {
  getKnowledgeNamespaceStateCollection(): Promise<
    Collection<KnowledgeNamespaceIndexStateDocument>
  >;
}

export const findKnowledgeNamespaceIndexState = async (
  { getKnowledgeNamespaceStateCollection }: KnowledgeNamespaceCollectionAccess,
  namespaceKey: string,
): Promise<WithId<KnowledgeNamespaceIndexStateDocument> | null> => {
  const collection = await getKnowledgeNamespaceStateCollection();
  return collection.findOne({ namespaceKey });
};

export const listKnowledgeNamespaceIndexStatesByRebuildStatus = async (
  { getKnowledgeNamespaceStateCollection }: KnowledgeNamespaceCollectionAccess,
  rebuildStatus: KnowledgeNamespaceRebuildStatus,
): Promise<WithId<KnowledgeNamespaceIndexStateDocument>[]> => {
  const collection = await getKnowledgeNamespaceStateCollection();
  return collection
    .find({ rebuildStatus })
    .sort({
      updatedAt: 1,
      createdAt: 1,
    })
    .toArray();
};

export const createKnowledgeNamespaceIndexState = async (
  { getKnowledgeNamespaceStateCollection }: KnowledgeNamespaceCollectionAccess,
  document: Omit<KnowledgeNamespaceIndexStateDocument, "_id">,
): Promise<WithId<KnowledgeNamespaceIndexStateDocument>> => {
  const collection = await getKnowledgeNamespaceStateCollection();
  const result = await collection.insertOne(document);

  return {
    ...document,
    _id: result.insertedId,
  };
};

export const updateKnowledgeNamespaceIndexState = async (
  { getKnowledgeNamespaceStateCollection }: KnowledgeNamespaceCollectionAccess,
  namespaceKey: string,
  patch: Partial<
    Omit<
      KnowledgeNamespaceIndexStateDocument,
      "_id" | "namespaceKey" | "scope" | "projectId" | "sourceType"
    >
  >,
): Promise<WithId<KnowledgeNamespaceIndexStateDocument> | null> => {
  const collection = await getKnowledgeNamespaceStateCollection();
  return collection.findOneAndUpdate(
    { namespaceKey },
    {
      $set: patch,
    },
    {
      returnDocument: "after",
    },
  );
};

export const deleteKnowledgeNamespaceIndexState = async (
  { getKnowledgeNamespaceStateCollection }: KnowledgeNamespaceCollectionAccess,
  namespaceKey: string,
): Promise<boolean> => {
  const collection = await getKnowledgeNamespaceStateCollection();
  const result = await collection.deleteOne({ namespaceKey });
  return result.deletedCount === 1;
};

export const markKnowledgeNamespaceRebuildingIfIdle = async (
  access: KnowledgeNamespaceCollectionAccess,
  namespaceKey: string,
  patch: Partial<
    Omit<
      KnowledgeNamespaceIndexStateDocument,
      "_id" | "namespaceKey" | "scope" | "projectId" | "sourceType"
    >
  >,
): Promise<WithId<KnowledgeNamespaceIndexStateDocument> | null> => {
  return updateKnowledgeNamespaceIndexStateByRebuildStatus(
    access,
    namespaceKey,
    "idle",
    patch,
  );
};

const updateKnowledgeNamespaceIndexStateByRebuildStatus = async (
  { getKnowledgeNamespaceStateCollection }: KnowledgeNamespaceCollectionAccess,
  namespaceKey: string,
  rebuildStatus: KnowledgeNamespaceRebuildStatus,
  patch: Partial<
    Omit<
      KnowledgeNamespaceIndexStateDocument,
      "_id" | "namespaceKey" | "scope" | "projectId" | "sourceType"
    >
  >,
): Promise<WithId<KnowledgeNamespaceIndexStateDocument> | null> => {
  const collection = await getKnowledgeNamespaceStateCollection();
  return collection.findOneAndUpdate(
    { namespaceKey, rebuildStatus },
    {
      $set: patch,
    },
    {
      returnDocument: "after",
    },
  );
};
