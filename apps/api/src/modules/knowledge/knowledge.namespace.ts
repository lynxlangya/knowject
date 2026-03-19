import { ObjectId, type WithId } from "mongodb";
import { getEffectiveEmbeddingConfig } from "@config/ai-config.js";
import type { AppEnv } from "@config/env.js";
import { decryptApiKey, encryptApiKey } from "@lib/crypto.js";
import type { EffectiveEmbeddingConfig } from "@modules/settings/settings.types.js";
import type { SettingsRepository } from "@modules/settings/settings.repository.js";
import {
  buildKnowledgeEmbeddingFingerprint,
  buildKnowledgeNamespaceKey,
  buildVersionedKnowledgeCollectionName,
  resolveKnowledgeScope,
} from "./knowledge.shared.js";
import type { KnowledgeRepository } from "./knowledge.repository.js";
import type {
  KnowledgeBaseDocument,
  KnowledgeDocumentRecord,
  KnowledgeNamespaceIndexStateDocument,
  KnowledgeSourceType,
} from "./knowledge.types.js";

export interface KnowledgeNamespaceDescriptor {
  namespaceKey: string;
  scope: "global" | "project";
  projectId: string | null;
  sourceType: KnowledgeSourceType;
}

export type ResolvedNamespaceIndexContext =
  | {
      mode: "versioned";
      namespace: KnowledgeNamespaceDescriptor;
      currentEmbeddingConfig: EffectiveEmbeddingConfig;
      currentEmbeddingFingerprint: string;
      namespaceDocumentCount: number;
      state: WithId<KnowledgeNamespaceIndexStateDocument>;
    }
  | {
      mode: "legacy_untracked";
      namespace: KnowledgeNamespaceDescriptor;
      currentEmbeddingConfig: EffectiveEmbeddingConfig;
      currentEmbeddingFingerprint: string;
      namespaceDocumentCount: number;
    };

export const buildKnowledgeNamespaceDescriptor = (
  knowledge: Pick<KnowledgeBaseDocument, "scope" | "projectId" | "sourceType">,
): KnowledgeNamespaceDescriptor => {
  const scope = resolveKnowledgeScope(knowledge);

  return {
    namespaceKey: buildKnowledgeNamespaceKey(knowledge),
    scope: scope.scope,
    projectId: scope.projectId,
    sourceType: knowledge.sourceType,
  };
};

export const createNamespaceStateDocument = ({
  namespace,
  embeddingConfig,
  embeddingFingerprint,
  now,
}: {
  namespace: KnowledgeNamespaceDescriptor;
  embeddingConfig: EffectiveEmbeddingConfig;
  embeddingFingerprint: string;
  now: Date;
}): Omit<KnowledgeNamespaceIndexStateDocument, "_id"> => {
  return {
    namespaceKey: namespace.namespaceKey,
    scope: namespace.scope,
    projectId: namespace.projectId,
    sourceType: namespace.sourceType,
    activeCollectionName: buildVersionedKnowledgeCollectionName(
      namespace.namespaceKey,
      embeddingFingerprint,
    ),
    activeEmbeddingProvider: embeddingConfig.provider,
    activeApiKeyEncrypted: embeddingConfig.apiKey
      ? encryptApiKey(embeddingConfig.apiKey)
      : null,
    activeEmbeddingBaseUrl: embeddingConfig.baseUrl,
    activeEmbeddingModel: embeddingConfig.model,
    activeEmbeddingFingerprint: embeddingFingerprint,
    rebuildStatus: "idle",
    targetCollectionName: null,
    targetEmbeddingProvider: null,
    targetEmbeddingBaseUrl: null,
    targetEmbeddingModel: null,
    targetEmbeddingFingerprint: null,
    lastErrorMessage: null,
    createdAt: now,
    updatedAt: now,
  };
};

export const createNamespaceRebuildStateDocument = ({
  namespace,
  activeCollectionName,
  embeddingConfig,
  embeddingFingerprint,
  now,
}: {
  namespace: KnowledgeNamespaceDescriptor;
  activeCollectionName: string;
  embeddingConfig: EffectiveEmbeddingConfig;
  embeddingFingerprint: string;
  now: Date;
}): Omit<KnowledgeNamespaceIndexStateDocument, "_id"> => {
  const document = createNamespaceStateDocument({
    namespace,
    embeddingConfig,
    embeddingFingerprint,
    now,
  });

  return {
    ...document,
    activeCollectionName,
    rebuildStatus: "rebuilding",
    targetCollectionName: buildVersionedKnowledgeCollectionName(
      namespace.namespaceKey,
      embeddingFingerprint,
    ),
    targetEmbeddingProvider: embeddingConfig.provider,
    targetEmbeddingBaseUrl: embeddingConfig.baseUrl,
    targetEmbeddingModel: embeddingConfig.model,
    targetEmbeddingFingerprint: embeddingFingerprint,
  };
};

const buildNamespaceStateResetPatch = ({
  namespace,
  embeddingConfig,
  embeddingFingerprint,
  now,
}: {
  namespace: KnowledgeNamespaceDescriptor;
  embeddingConfig: EffectiveEmbeddingConfig;
  embeddingFingerprint: string;
  now: Date;
}): Partial<
  Omit<
    KnowledgeNamespaceIndexStateDocument,
    "_id" | "namespaceKey" | "scope" | "projectId" | "sourceType"
  >
> => {
  const document = createNamespaceStateDocument({
    namespace,
    embeddingConfig,
    embeddingFingerprint,
    now,
  });
  const {
    namespaceKey: _namespaceKey,
    scope: _scope,
    projectId: _projectId,
    sourceType: _sourceType,
    createdAt: _createdAt,
    ...patch
  } = document;

  return patch;
};

const doesEncryptedApiKeyMatch = (
  encryptedApiKey: string | null,
  plaintextApiKey: string,
): boolean => {
  if (!encryptedApiKey) {
    return false;
  }

  try {
    return decryptApiKey(encryptedApiKey) === plaintextApiKey;
  } catch {
    return false;
  }
};

export const resolveActiveEmbeddingConfig = (
  context: ResolvedNamespaceIndexContext,
): EffectiveEmbeddingConfig => {
  if (context.mode !== "versioned") {
    return context.currentEmbeddingConfig;
  }

  if (
    context.state.activeEmbeddingFingerprint ===
    context.currentEmbeddingFingerprint
  ) {
    return context.currentEmbeddingConfig;
  }

  return {
    source: context.currentEmbeddingConfig.source,
    provider: context.state.activeEmbeddingProvider,
    apiKey: context.state.activeApiKeyEncrypted
      ? decryptApiKey(context.state.activeApiKeyEncrypted)
      : null,
    baseUrl: context.state.activeEmbeddingBaseUrl,
    model: context.state.activeEmbeddingModel,
    requestTimeoutMs: context.currentEmbeddingConfig.requestTimeoutMs,
  };
};

export const resolveSearchCollectionName = (
  context: ResolvedNamespaceIndexContext,
): string => {
  return context.mode === "versioned"
    ? context.state.activeCollectionName
    : context.namespace.namespaceKey;
};

export const resolveSearchEmbeddingSpaceKey = (
  context: ResolvedNamespaceIndexContext,
): string => {
  return context.mode === "versioned"
    ? context.state.activeEmbeddingFingerprint
    : context.currentEmbeddingFingerprint;
};

const findNamespaceIndexStateOrNull = async (
  repository: KnowledgeRepository,
  namespaceKey: string,
): Promise<WithId<KnowledgeNamespaceIndexStateDocument> | null> => {
  const repositoryWithState = repository as KnowledgeRepository & {
    findKnowledgeNamespaceIndexState?: KnowledgeRepository["findKnowledgeNamespaceIndexState"];
  };

  if (
    typeof repositoryWithState.findKnowledgeNamespaceIndexState !== "function"
  ) {
    return null;
  }

  return repositoryWithState.findKnowledgeNamespaceIndexState(namespaceKey);
};

export const createNamespaceIndexState = async (
  repository: KnowledgeRepository,
  document: Omit<KnowledgeNamespaceIndexStateDocument, "_id">,
): Promise<WithId<KnowledgeNamespaceIndexStateDocument>> => {
  const repositoryWithState = repository as KnowledgeRepository & {
    createKnowledgeNamespaceIndexState?: KnowledgeRepository["createKnowledgeNamespaceIndexState"];
  };

  if (
    typeof repositoryWithState.createKnowledgeNamespaceIndexState !== "function"
  ) {
    return {
      ...document,
      _id: new ObjectId(),
    };
  }

  return repositoryWithState.createKnowledgeNamespaceIndexState(document);
};

export const updateNamespaceIndexState = async (
  repository: KnowledgeRepository,
  namespaceKey: string,
  patch: Partial<
    Omit<
      KnowledgeNamespaceIndexStateDocument,
      "_id" | "namespaceKey" | "scope" | "projectId" | "sourceType"
    >
  >,
): Promise<WithId<KnowledgeNamespaceIndexStateDocument> | null> => {
  const repositoryWithState = repository as KnowledgeRepository & {
    updateKnowledgeNamespaceIndexState?: KnowledgeRepository["updateKnowledgeNamespaceIndexState"];
  };

  if (
    typeof repositoryWithState.updateKnowledgeNamespaceIndexState !== "function"
  ) {
    return null;
  }

  return repositoryWithState.updateKnowledgeNamespaceIndexState(
    namespaceKey,
    patch,
  );
};

const listKnowledgeBasesForNamespace = async ({
  repository,
  namespace,
}: {
  repository: KnowledgeRepository;
  namespace: KnowledgeNamespaceDescriptor;
}): Promise<WithId<KnowledgeBaseDocument>[]> => {
  const repositoryWithNamespace = repository as KnowledgeRepository & {
    listKnowledgeBasesByNamespace?: KnowledgeRepository["listKnowledgeBasesByNamespace"];
  };

  if (
    typeof repositoryWithNamespace.listKnowledgeBasesByNamespace === "function"
  ) {
    return repositoryWithNamespace.listKnowledgeBasesByNamespace({
      scope: namespace.scope,
      projectId: namespace.projectId,
      sourceType: namespace.sourceType,
    });
  }

  if (typeof repository.listKnowledgeBases !== "function") {
    return [];
  }

  return repository.listKnowledgeBases({
    scope: namespace.scope,
    projectId: namespace.projectId ?? undefined,
    sourceType: namespace.sourceType,
  });
};

export const listDocumentsForKnowledgeIds = async ({
  repository,
  knowledgeIds,
}: {
  repository: KnowledgeRepository;
  knowledgeIds: string[];
}): Promise<WithId<KnowledgeDocumentRecord>[]> => {
  const repositoryWithNamespace = repository as KnowledgeRepository & {
    listDocumentsByKnowledgeIds?: KnowledgeRepository["listDocumentsByKnowledgeIds"];
  };

  if (
    typeof repositoryWithNamespace.listDocumentsByKnowledgeIds === "function"
  ) {
    return repositoryWithNamespace.listDocumentsByKnowledgeIds(knowledgeIds);
  }

  if (typeof repository.listDocumentsByKnowledgeId !== "function") {
    return [];
  }

  const groups = await Promise.all(
    knowledgeIds.map((knowledgeId) =>
      repository.listDocumentsByKnowledgeId(knowledgeId),
    ),
  );
  return groups.flat();
};

export const listNamespaceDocuments = async (
  repository: KnowledgeRepository,
  namespace: KnowledgeNamespaceDescriptor,
): Promise<WithId<KnowledgeDocumentRecord>[]> => {
  const knowledgeItems = await listKnowledgeBasesForNamespace({
    repository,
    namespace,
  });
  const knowledgeIds = knowledgeItems.map((item) => item._id.toHexString());

  return listDocumentsForKnowledgeIds({
    repository,
    knowledgeIds,
  });
};

export const resolveNamespaceIndexContext = async ({
  env,
  repository,
  settingsRepository,
  knowledge,
}: {
  env: AppEnv;
  repository: KnowledgeRepository;
  settingsRepository: SettingsRepository;
  knowledge: Pick<KnowledgeBaseDocument, "scope" | "projectId" | "sourceType">;
}): Promise<ResolvedNamespaceIndexContext> => {
  const namespace = buildKnowledgeNamespaceDescriptor(knowledge);
  const [currentEmbeddingConfig, existingState, namespaceKnowledgeBases] =
    await Promise.all([
      getEffectiveEmbeddingConfig({
        env,
        repository: settingsRepository,
      }),
      findNamespaceIndexStateOrNull(repository, namespace.namespaceKey),
      listKnowledgeBasesForNamespace({
        repository,
        namespace,
      }),
    ]);
  const currentEmbeddingFingerprint = buildKnowledgeEmbeddingFingerprint(
    currentEmbeddingConfig,
  );
  const namespaceDocumentCount = namespaceKnowledgeBases.reduce(
    (total, item) => total + item.documentCount,
    0,
  );

  if (existingState) {
    let resolvedState = existingState;
    const now = new Date();
    const shouldReinitializeEmptyNamespace =
      namespaceDocumentCount === 0 &&
      (existingState.activeEmbeddingFingerprint !==
        currentEmbeddingFingerprint ||
        existingState.rebuildStatus !== "idle" ||
        existingState.targetCollectionName !== null ||
        existingState.targetEmbeddingProvider !== null ||
        existingState.targetEmbeddingBaseUrl !== null ||
        existingState.targetEmbeddingModel !== null ||
        existingState.targetEmbeddingFingerprint !== null ||
        existingState.lastErrorMessage !== null);

    if (shouldReinitializeEmptyNamespace) {
      const patch = buildNamespaceStateResetPatch({
        namespace,
        embeddingConfig: currentEmbeddingConfig,
        embeddingFingerprint: currentEmbeddingFingerprint,
        now,
      });
      const updatedState = await updateNamespaceIndexState(
        repository,
        namespace.namespaceKey,
        patch,
      );

      resolvedState = updatedState ?? {
        ...existingState,
        ...patch,
      };
    } else if (
      existingState.activeEmbeddingFingerprint ===
        currentEmbeddingFingerprint &&
      currentEmbeddingConfig.apiKey &&
      !doesEncryptedApiKeyMatch(
        existingState.activeApiKeyEncrypted,
        currentEmbeddingConfig.apiKey,
      )
    ) {
      const patch = {
        activeApiKeyEncrypted: encryptApiKey(currentEmbeddingConfig.apiKey),
        updatedAt: now,
      };
      const updatedState = await updateNamespaceIndexState(
        repository,
        namespace.namespaceKey,
        patch,
      );

      resolvedState = updatedState ?? {
        ...existingState,
        ...patch,
      };
    }

    return {
      mode: "versioned",
      namespace,
      currentEmbeddingConfig,
      currentEmbeddingFingerprint,
      namespaceDocumentCount,
      state: resolvedState,
    };
  }

  if (namespaceDocumentCount > 0) {
    return {
      mode: "legacy_untracked",
      namespace,
      currentEmbeddingConfig,
      currentEmbeddingFingerprint,
      namespaceDocumentCount,
    };
  }

  const now = new Date();
  const createdDocument = createNamespaceStateDocument({
    namespace,
    embeddingConfig: currentEmbeddingConfig,
    embeddingFingerprint: currentEmbeddingFingerprint,
    now,
  });

  try {
    const createdState = await createNamespaceIndexState(
      repository,
      createdDocument,
    );
    return {
      mode: "versioned",
      namespace,
      currentEmbeddingConfig,
      currentEmbeddingFingerprint,
      namespaceDocumentCount,
      state: createdState,
    };
  } catch (error) {
    const recoveredState = await findNamespaceIndexStateOrNull(
      repository,
      namespace.namespaceKey,
    );
    if (!recoveredState) {
      throw error;
    }

    return {
      mode: "versioned",
      namespace,
      currentEmbeddingConfig,
      currentEmbeddingFingerprint,
      namespaceDocumentCount,
      state: recoveredState,
    };
  }
};
