import { ObjectId, type WithId } from "mongodb";
import { getEffectiveIndexingConfig } from "@config/ai-config.js";
import { queueKnowledgeDocumentProcessing } from "./knowledge.index-orchestrator.js";
import { resolveNamespaceIndexContext } from "./knowledge.namespace.js";
import { adjustKnowledgeSummaryAfterDocumentRemoval } from "./knowledge.repository.js";
import {
  createKnowledgeDocumentStorageLayout,
  removeKnowledgeDocumentStorage,
  writeKnowledgeDocumentFile,
} from "./knowledge.storage.js";
import { toKnowledgeDocumentResponse, toKnowledgeSummaryResponse } from "./knowledge.shared.js";
import type {
  KnowledgeBaseDocument,
  KnowledgeCommandContext,
  KnowledgeDocumentRecord,
  KnowledgeDocumentUploadResponse,
  UploadedKnowledgeFile,
} from "./knowledge.types.js";
import {
  assertNamespaceReadyForMutation,
  buildDocumentVersionHash,
  buildKnowledgeActorProfileMap,
  createDuplicateKnowledgeDocumentVersionError,
  createKnowledgeNotFoundError,
  isKnowledgeDocumentVersionDuplicateError,
  resolveEmbeddingMetadata,
  type KnowledgeServiceDependencies,
  validateUploadFile,
} from "./knowledge.service.helpers.js";

export const uploadKnowledgeDocument = async ({
  env,
  repository,
  searchService,
  authRepository,
  settingsRepository,
  actor,
  knowledgeId,
  knowledge,
  file,
}: KnowledgeServiceDependencies & {
  actor: KnowledgeCommandContext["actor"];
  knowledgeId: string;
  knowledge: WithId<KnowledgeBaseDocument>;
  file: UploadedKnowledgeFile;
}): Promise<KnowledgeDocumentUploadResponse> => {
  const indexingConfig = await getEffectiveIndexingConfig({
    env,
    repository: settingsRepository,
  });
  validateUploadFile(
    knowledge.sourceType,
    file,
    indexingConfig.supportedTypes,
  );

  const documentId = new ObjectId();
  const documentVersionHash = buildDocumentVersionHash(file);
  const duplicatedDocument =
    (await repository.findKnowledgeDocumentByVersionHash?.(
      knowledgeId,
      documentVersionHash,
    )) ?? null;

  if (duplicatedDocument) {
    throw createDuplicateKnowledgeDocumentVersionError(duplicatedDocument);
  }

  const namespaceContext = await resolveNamespaceIndexContext({
    env,
    repository,
    settingsRepository,
    knowledge,
  });
  const activeState = assertNamespaceReadyForMutation(namespaceContext);
  const collectionName = activeState.activeCollectionName;
  const embeddingMetadata = await resolveEmbeddingMetadata({
    env,
    settingsRepository,
    embeddingConfig: namespaceContext.currentEmbeddingConfig,
  });
  const storageLayout = createKnowledgeDocumentStorageLayout({
    env,
    knowledge,
    knowledgeId,
    documentId: documentId.toHexString(),
    documentVersionHash,
    fileName: file.originalName,
  });
  const now = new Date();
  let documentPersisted = false;
  let knowledgeSummaryUpdated = false;

  try {
    await writeKnowledgeDocumentFile({
      layout: storageLayout,
      file,
    });

    const documentRecord: KnowledgeDocumentRecord & {
      _id: NonNullable<KnowledgeDocumentRecord["_id"]>;
    } = {
      _id: documentId,
      knowledgeId,
      fileName: storageLayout.fileName,
      mimeType: file.mimeType,
      storagePath: storageLayout.storagePath,
      status: "pending",
      chunkCount: 0,
      documentVersionHash,
      embeddingProvider: embeddingMetadata.embeddingProvider,
      embeddingModel: embeddingMetadata.embeddingModel,
      lastIndexedAt: null,
      retryCount: 0,
      errorMessage: null,
      uploadedBy: actor.id,
      uploadedAt: now,
      processedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    let document: WithId<KnowledgeDocumentRecord>;
    try {
      document = await repository.createKnowledgeDocument(documentRecord);
    } catch (error) {
      if (isKnowledgeDocumentVersionDuplicateError(error)) {
        const duplicatedDocument =
          (await repository.findKnowledgeDocumentByVersionHash?.(
            knowledgeId,
            documentVersionHash,
          )) ?? null;

        if (duplicatedDocument) {
          throw createDuplicateKnowledgeDocumentVersionError(
            duplicatedDocument,
          );
        }
      }

      throw error;
    }

    documentPersisted = true;
    const updatedKnowledge =
      await repository.updateKnowledgeSummaryAfterDocumentUpload(
        knowledgeId,
        now,
      );

    if (!updatedKnowledge) {
      throw createKnowledgeNotFoundError();
    }

    knowledgeSummaryUpdated = true;
    const actorProfileMap = await buildKnowledgeActorProfileMap(
      authRepository,
      [updatedKnowledge],
    );

    queueKnowledgeDocumentProcessing({
      env,
      repository,
      searchService,
      settingsRepository,
      knowledgeId,
      documentId: documentId.toHexString(),
      storagePath: storageLayout.absoluteStoragePath,
      fileName: storageLayout.fileName,
      mimeType: file.mimeType,
      sourceType: knowledge.sourceType,
      collectionName,
      documentVersionHash,
      embeddingConfig: namespaceContext.currentEmbeddingConfig,
      indexingConfig,
      embeddingMetadata,
    });

    return {
      knowledge: toKnowledgeSummaryResponse(updatedKnowledge, actorProfileMap),
      document: toKnowledgeDocumentResponse(document),
    };
  } catch (error) {
    if (documentPersisted) {
      const deletedDocument = await repository.deleteKnowledgeDocumentById(
        documentId.toHexString(),
      );

      if (deletedDocument && knowledgeSummaryUpdated) {
        await adjustKnowledgeSummaryAfterDocumentRemoval(
          repository,
          knowledgeId,
          {
            removedChunkCount: 0,
            updatedAt: new Date(),
          },
        );
      }
    }

    await removeKnowledgeDocumentStorage({
      env,
      knowledge,
      knowledgeId,
      documentId: documentId.toHexString(),
    });
    throw error;
  }
};
