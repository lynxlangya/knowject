import { type Collection, type WithId } from "mongodb";
import { toObjectId } from "@lib/mongo-id.js";
import type {
  KnowledgeBaseDocument,
  KnowledgeDocumentRecord,
  KnowledgeIndexStatus,
} from "./knowledge.types.js";

interface KnowledgeDocumentCollectionAccess {
  getKnowledgeCollection(): Promise<Collection<KnowledgeBaseDocument>>;
  getKnowledgeDocumentsCollection(): Promise<Collection<KnowledgeDocumentRecord>>;
}

export const listDocumentsByKnowledgeId = async (
  { getKnowledgeDocumentsCollection }: KnowledgeDocumentCollectionAccess,
  knowledgeId: string,
): Promise<WithId<KnowledgeDocumentRecord>[]> => {
  const collection = await getKnowledgeDocumentsCollection();

  return collection
    .find({ knowledgeId })
    .sort({
      uploadedAt: -1,
      updatedAt: -1,
    })
    .toArray();
};

export const listDocumentsByKnowledgeIds = async (
  { getKnowledgeDocumentsCollection }: KnowledgeDocumentCollectionAccess,
  knowledgeIds: string[],
): Promise<WithId<KnowledgeDocumentRecord>[]> => {
  if (knowledgeIds.length === 0) {
    return [];
  }

  const collection = await getKnowledgeDocumentsCollection();

  return collection
    .find({
      knowledgeId: {
        $in: knowledgeIds,
      },
    })
    .sort({
      uploadedAt: -1,
      updatedAt: -1,
    })
    .toArray();
};

export const findKnowledgeDocumentById = async (
  { getKnowledgeDocumentsCollection }: KnowledgeDocumentCollectionAccess,
  documentId: string,
): Promise<WithId<KnowledgeDocumentRecord> | null> => {
  const objectId = toObjectId(documentId);
  if (!objectId) {
    return null;
  }

  const collection = await getKnowledgeDocumentsCollection();
  return collection.findOne({ _id: objectId });
};

export const findKnowledgeDocumentByVersionHash = async (
  { getKnowledgeDocumentsCollection }: KnowledgeDocumentCollectionAccess,
  knowledgeId: string,
  documentVersionHash: string,
): Promise<WithId<KnowledgeDocumentRecord> | null> => {
  const collection = await getKnowledgeDocumentsCollection();

  return collection.findOne({
    knowledgeId,
    documentVersionHash,
  });
};

export const listKnowledgeDocumentsForRecovery = async (
  { getKnowledgeDocumentsCollection }: KnowledgeDocumentCollectionAccess,
  staleProcessingBefore: Date,
): Promise<WithId<KnowledgeDocumentRecord>[]> => {
  const collection = await getKnowledgeDocumentsCollection();

  return collection
    .find({
      $or: [
        {
          status: "pending",
        },
        {
          status: "processing",
          updatedAt: {
            $lte: staleProcessingBefore,
          },
        },
      ],
    })
    .sort({
      updatedAt: 1,
      createdAt: 1,
    })
    .toArray();
};

export const createKnowledgeDocument = async (
  { getKnowledgeDocumentsCollection }: KnowledgeDocumentCollectionAccess,
  document: KnowledgeDocumentRecord & {
    _id: NonNullable<KnowledgeDocumentRecord["_id"]>;
  },
): Promise<WithId<KnowledgeDocumentRecord>> => {
  const collection = await getKnowledgeDocumentsCollection();
  await collection.insertOne(document);

  return document;
};

export const updateKnowledgeSummaryAfterDocumentUpload = async (
  access: KnowledgeDocumentCollectionAccess,
  knowledgeId: string,
  updatedAt: Date,
) => {
  return applyKnowledgeSummaryPatch(access, knowledgeId, {
    documentCountDelta: 1,
    indexStatus: "pending",
    updatedAt,
  });
};

export const markKnowledgeSummaryPending = async (
  access: KnowledgeDocumentCollectionAccess,
  knowledgeId: string,
  updatedAt: Date,
) => {
  return applyKnowledgeSummaryPatch(access, knowledgeId, {
    indexStatus: "pending",
    updatedAt,
  });
};

export const markKnowledgeSummaryProcessing = async (
  access: KnowledgeDocumentCollectionAccess,
  knowledgeId: string,
  updatedAt: Date,
) => {
  return applyKnowledgeSummaryPatch(access, knowledgeId, {
    indexStatus: "processing",
    updatedAt,
  });
};

export const adjustKnowledgeSummaryAfterDocumentCompletion = async (
  access: KnowledgeDocumentCollectionAccess,
  knowledgeId: string,
  patch: {
    previousChunkCount: number;
    nextChunkCount: number;
    updatedAt: Date;
  },
) => {
  const updatedKnowledge = await applyKnowledgeSummaryPatch(
    access,
    knowledgeId,
    {
      chunkCountDelta: patch.nextChunkCount - patch.previousChunkCount,
      updatedAt: patch.updatedAt,
    },
  );

  if (!updatedKnowledge) {
    return null;
  }

  return reconcileKnowledgeSummaryStatus(access, knowledgeId, patch.updatedAt);
};

export const adjustKnowledgeSummaryAfterDocumentFailure = async (
  access: KnowledgeDocumentCollectionAccess,
  knowledgeId: string,
  patch: {
    previousChunkCount: number;
    updatedAt: Date;
  },
) => {
  const updatedKnowledge = await applyKnowledgeSummaryPatch(
    access,
    knowledgeId,
    {
      chunkCountDelta: -patch.previousChunkCount,
      updatedAt: patch.updatedAt,
    },
  );

  if (!updatedKnowledge) {
    return null;
  }

  return reconcileKnowledgeSummaryStatus(access, knowledgeId, patch.updatedAt);
};

export const adjustKnowledgeSummaryAfterDocumentRemoval = async (
  access: KnowledgeDocumentCollectionAccess,
  knowledgeId: string,
  patch: {
    removedChunkCount: number;
    updatedAt: Date;
  },
) => {
  const updatedKnowledge = await applyKnowledgeSummaryPatch(
    access,
    knowledgeId,
    {
      documentCountDelta: -1,
      chunkCountDelta: -patch.removedChunkCount,
      updatedAt: patch.updatedAt,
    },
  );

  if (!updatedKnowledge) {
    return null;
  }

  return reconcileKnowledgeSummaryStatus(access, knowledgeId, patch.updatedAt);
};

export const markKnowledgeDocumentsPendingByKnowledgeIds = async (
  { getKnowledgeCollection, getKnowledgeDocumentsCollection }: KnowledgeDocumentCollectionAccess,
  knowledgeIds: string[],
  updatedAt: Date,
): Promise<void> => {
  if (knowledgeIds.length === 0) {
    return;
  }

  const uniqueKnowledgeIds = Array.from(new Set(knowledgeIds));
  const collection = await getKnowledgeDocumentsCollection();
  await collection.updateMany(
    {
      knowledgeId: {
        $in: uniqueKnowledgeIds,
      },
    },
    {
      $set: {
        status: "pending",
        errorMessage: null,
        processedAt: null,
        updatedAt,
      },
    },
  );

  const knowledgeCollection = await getKnowledgeCollection();
  const knowledgeObjectIds = uniqueKnowledgeIds
    .map((knowledgeId) => toObjectId(knowledgeId))
    .filter((value): value is NonNullable<typeof value> => value !== null);

  if (knowledgeObjectIds.length === 0) {
    return;
  }

  await knowledgeCollection.updateMany(
    {
      _id: {
        $in: knowledgeObjectIds,
      },
    },
    {
      $set: {
        indexStatus: "pending",
        updatedAt,
      },
    },
  );
};

export const updateKnowledgeDocument = async (
  { getKnowledgeDocumentsCollection }: KnowledgeDocumentCollectionAccess,
  documentId: string,
  patch: Partial<
    Pick<
      KnowledgeDocumentRecord,
      | "status"
      | "chunkCount"
      | "embeddingProvider"
      | "embeddingModel"
      | "lastIndexedAt"
      | "errorMessage"
      | "errorMessageKey"
      | "errorMessageParams"
      | "processedAt"
      | "updatedAt"
    >
  >,
  options?: {
    incrementRetryCount?: boolean;
  },
) => {
  const objectId = toObjectId(documentId);
  if (!objectId) {
    return null;
  }

  const collection = await getKnowledgeDocumentsCollection();
  return collection.findOneAndUpdate(
    { _id: objectId },
    {
      $set: patch,
      ...(options?.incrementRetryCount
        ? {
            $inc: {
              retryCount: 1,
            },
          }
        : {}),
    },
    {
      returnDocument: "after",
    },
  );
};

export const markKnowledgeDocumentPendingIfRetryable = (
  access: KnowledgeDocumentCollectionAccess,
  documentId: string,
  updatedAt: Date,
) => {
  return updateKnowledgeDocumentByStatus(
    access,
    documentId,
    ["completed", "failed"],
    {
      status: "pending",
      errorMessage: null,
      errorMessageKey: null,
      errorMessageParams: null,
      processedAt: null,
      updatedAt,
    },
  );
};

export const markKnowledgeDocumentPendingForRecovery = (
  access: KnowledgeDocumentCollectionAccess,
  documentId: string,
  updatedAt: Date,
) => {
  return updateKnowledgeDocumentByStatus(
    access,
    documentId,
    ["pending", "processing"],
    {
      status: "pending",
      errorMessage: null,
      processedAt: null,
      updatedAt,
    },
  );
};

export const markKnowledgeDocumentProcessingIfPending = (
  access: KnowledgeDocumentCollectionAccess,
  documentId: string,
  updatedAt: Date,
) => {
  return updateKnowledgeDocumentByStatus(access, documentId, "pending", {
    status: "processing",
    errorMessage: null,
    errorMessageKey: null,
    errorMessageParams: null,
    processedAt: null,
    updatedAt,
  });
};

export const markKnowledgeDocumentCompletedIfProcessing = (
  access: KnowledgeDocumentCollectionAccess,
  documentId: string,
  patch: Pick<
    KnowledgeDocumentRecord,
    | "chunkCount"
    | "embeddingProvider"
    | "embeddingModel"
    | "lastIndexedAt"
    | "processedAt"
    | "updatedAt"
  >,
) => {
  return updateKnowledgeDocumentByStatus(access, documentId, "processing", {
    status: "completed",
    chunkCount: patch.chunkCount,
    embeddingProvider: patch.embeddingProvider,
    embeddingModel: patch.embeddingModel,
    lastIndexedAt: patch.lastIndexedAt,
    errorMessage: null,
    errorMessageKey: null,
    errorMessageParams: null,
    processedAt: patch.processedAt,
    updatedAt: patch.updatedAt,
  });
};

export const markKnowledgeDocumentFailedIfProcessing = (
  access: KnowledgeDocumentCollectionAccess,
  documentId: string,
  patch: Pick<
    KnowledgeDocumentRecord,
    "errorMessage" | "processedAt" | "updatedAt"
    | "errorMessageKey"
    | "errorMessageParams"
  >,
) => {
  return updateKnowledgeDocumentByStatus(
    access,
    documentId,
    "processing",
    {
      status: "failed",
      chunkCount: 0,
      errorMessage: patch.errorMessage,
      errorMessageKey: patch.errorMessageKey,
      errorMessageParams: patch.errorMessageParams,
      processedAt: patch.processedAt,
      updatedAt: patch.updatedAt,
    },
    {
      incrementRetryCount: true,
    },
  );
};

export const markKnowledgeDocumentFailedIfRecoverable = (
  access: KnowledgeDocumentCollectionAccess,
  documentId: string,
  patch: Pick<
    KnowledgeDocumentRecord,
    "errorMessage" | "processedAt" | "updatedAt"
    | "errorMessageKey"
    | "errorMessageParams"
  >,
) => {
  return updateKnowledgeDocumentByStatus(
    access,
    documentId,
    ["pending", "processing"],
    {
      status: "failed",
      chunkCount: 0,
      errorMessage: patch.errorMessage,
      errorMessageKey: patch.errorMessageKey,
      errorMessageParams: patch.errorMessageParams,
      processedAt: patch.processedAt,
      updatedAt: patch.updatedAt,
    },
    {
      incrementRetryCount: true,
    },
  );
};

export const syncKnowledgeSummaryFromDocuments = async (
  access: KnowledgeDocumentCollectionAccess,
  knowledgeId: string,
  updatedAt: Date,
) => {
  const knowledge = await findKnowledgeById(access, knowledgeId);
  if (!knowledge) {
    return null;
  }

  const documents = await listDocumentsByKnowledgeId(access, knowledgeId);
  const chunkCount = documents.reduce(
    (total, document) => total + document.chunkCount,
    0,
  );
  const indexStatus = resolveKnowledgeIndexStatus(documents);

  return updateKnowledgeBase(access, knowledgeId, {
    indexStatus,
    documentCount: documents.length,
    chunkCount,
    updatedAt,
  });
};

export const deleteKnowledgeDocumentsByKnowledgeId = async (
  { getKnowledgeDocumentsCollection }: KnowledgeDocumentCollectionAccess,
  knowledgeId: string,
): Promise<number> => {
  const collection = await getKnowledgeDocumentsCollection();
  const result = await collection.deleteMany({ knowledgeId });
  return result.deletedCount;
};

export const deleteKnowledgeDocumentById = async (
  { getKnowledgeDocumentsCollection }: KnowledgeDocumentCollectionAccess,
  documentId: string,
): Promise<boolean> => {
  const objectId = toObjectId(documentId);
  if (!objectId) {
    return false;
  }

  const collection = await getKnowledgeDocumentsCollection();
  const result = await collection.deleteOne({ _id: objectId });
  return result.deletedCount === 1;
};

const updateKnowledgeDocumentByStatus = async (
  { getKnowledgeDocumentsCollection }: KnowledgeDocumentCollectionAccess,
  documentId: string,
  currentStatus:
    | KnowledgeDocumentRecord["status"]
    | KnowledgeDocumentRecord["status"][],
  patch: Partial<
    Pick<
      KnowledgeDocumentRecord,
      | "status"
      | "chunkCount"
      | "embeddingProvider"
      | "embeddingModel"
      | "lastIndexedAt"
      | "errorMessage"
      | "processedAt"
      | "updatedAt"
    >
  >,
  options?: {
    incrementRetryCount?: boolean;
  },
) => {
  const objectId = toObjectId(documentId);
  if (!objectId) {
    return null;
  }

  const collection = await getKnowledgeDocumentsCollection();
  return collection.findOneAndUpdate(
    {
      _id: objectId,
      status: Array.isArray(currentStatus)
        ? {
            $in: currentStatus,
          }
        : currentStatus,
    },
    {
      $set: patch,
      ...(options?.incrementRetryCount
        ? {
            $inc: {
              retryCount: 1,
            },
          }
        : {}),
    },
    {
      returnDocument: "after",
    },
  );
};

const applyKnowledgeSummaryPatch = async (
  { getKnowledgeCollection }: KnowledgeDocumentCollectionAccess,
  knowledgeId: string,
  patch: {
    indexStatus?: KnowledgeIndexStatus;
    documentCountDelta?: number;
    chunkCountDelta?: number;
    updatedAt: Date;
  },
) => {
  const objectId = toObjectId(knowledgeId);
  if (!objectId) {
    return null;
  }

  const collection = await getKnowledgeCollection();
  const increments: Record<string, number> = {};
  if (patch.documentCountDelta) {
    increments.documentCount = patch.documentCountDelta;
  }
  if (patch.chunkCountDelta) {
    increments.chunkCount = patch.chunkCountDelta;
  }

  return collection.findOneAndUpdate(
    { _id: objectId },
    {
      ...(Object.keys(increments).length > 0
        ? {
            $inc: increments,
          }
        : {}),
      $set: {
        ...(patch.indexStatus
          ? {
              indexStatus: patch.indexStatus,
            }
          : {}),
        updatedAt: patch.updatedAt,
      },
    },
    {
      returnDocument: "after",
    },
  );
};

const resolveKnowledgeIndexStatus = (
  documents: Array<Pick<KnowledgeDocumentRecord, "status">>,
): KnowledgeIndexStatus => {
  if (documents.some((document) => document.status === "processing")) {
    return "processing";
  }

  if (documents.some((document) => document.status === "pending")) {
    return "pending";
  }

  if (documents.some((document) => document.status === "failed")) {
    return "failed";
  }

  if (documents.length > 0) {
    return "completed";
  }

  return "idle";
};

const resolveKnowledgeIndexStatusForKnowledge = async (
  access: KnowledgeDocumentCollectionAccess,
  knowledgeId: string,
): Promise<KnowledgeIndexStatus> => {
  const collection = await access.getKnowledgeDocumentsCollection();

  const hasProcessingDocument = await findKnowledgeDocumentByStatuses(
    collection,
    knowledgeId,
    "processing",
  );
  if (hasProcessingDocument) {
    return "processing";
  }

  const hasPendingDocument = await findKnowledgeDocumentByStatuses(
    collection,
    knowledgeId,
    "pending",
  );
  if (hasPendingDocument) {
    return "pending";
  }

  const hasFailedDocument = await findKnowledgeDocumentByStatuses(
    collection,
    knowledgeId,
    "failed",
  );
  if (hasFailedDocument) {
    return "failed";
  }

  const hasAnyDocument = await collection.findOne(
    { knowledgeId },
    {
      projection: {
        _id: 1,
      },
    },
  );
  if (hasAnyDocument) {
    return "completed";
  }

  return "idle";
};

const findKnowledgeDocumentByStatuses = async (
  collection: Collection<KnowledgeDocumentRecord>,
  knowledgeId: string,
  statuses:
    | KnowledgeDocumentRecord["status"]
    | KnowledgeDocumentRecord["status"][],
): Promise<boolean> => {
  const document = await collection.findOne(
    {
      knowledgeId,
      status: Array.isArray(statuses)
        ? {
            $in: statuses,
          }
        : statuses,
    },
    {
      projection: {
        _id: 1,
      },
    },
  );

  return document !== null;
};

const reconcileKnowledgeSummaryStatus = async (
  access: KnowledgeDocumentCollectionAccess,
  knowledgeId: string,
  updatedAt: Date,
) => {
  const knowledge = await findKnowledgeById(access, knowledgeId);
  if (!knowledge) {
    return null;
  }

  const indexStatus = await resolveKnowledgeIndexStatusForKnowledge(
    access,
    knowledgeId,
  );

  return updateKnowledgeBase(access, knowledgeId, {
    indexStatus,
    updatedAt,
  });
};

const findKnowledgeById = async (
  { getKnowledgeCollection }: KnowledgeDocumentCollectionAccess,
  knowledgeId: string,
): Promise<WithId<KnowledgeBaseDocument> | null> => {
  const objectId = toObjectId(knowledgeId);
  if (!objectId) {
    return null;
  }

  const collection = await getKnowledgeCollection();
  return collection.findOne({ _id: objectId });
};

const updateKnowledgeBase = async (
  { getKnowledgeCollection }: KnowledgeDocumentCollectionAccess,
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
