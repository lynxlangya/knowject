import { access, mkdir, rm, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import type { AppEnv } from "@config/env.js";
import { resolveKnowledgeScope, sanitizeFileName } from "./knowledge.shared.js";
import type {
  KnowledgeBaseDocument,
  KnowledgeDocumentRecord,
  UploadedKnowledgeFile,
} from "./knowledge.types.js";

export interface KnowledgeDocumentStorageLayout {
  knowledgeRootPath: string;
  documentRootPath: string;
  documentVersionPath: string;
  storagePath: string;
  fileName: string;
  absoluteKnowledgeRootPath: string;
  absoluteDocumentRootPath: string;
  absoluteDocumentVersionPath: string;
  absoluteStoragePath: string;
}

export const buildStorageKnowledgeRootPath = (
  knowledge: Pick<KnowledgeBaseDocument, "scope" | "projectId">,
  knowledgeId: string,
): string => {
  const scope = resolveKnowledgeScope(knowledge);

  if (scope.scope === "project" && scope.projectId) {
    return join("projects", scope.projectId, "knowledge", knowledgeId);
  }

  return knowledgeId;
};

export const buildStorageDocumentRootPath = (
  knowledge: Pick<KnowledgeBaseDocument, "scope" | "projectId">,
  knowledgeId: string,
  documentId: string,
): string => {
  return join(
    buildStorageKnowledgeRootPath(knowledge, knowledgeId),
    documentId,
  );
};

export const buildStorageDocumentVersionPath = (
  knowledge: Pick<KnowledgeBaseDocument, "scope" | "projectId">,
  knowledgeId: string,
  documentId: string,
  documentVersionHash: string,
): string => {
  return join(
    buildStorageDocumentRootPath(knowledge, knowledgeId, documentId),
    documentVersionHash,
  );
};

export const buildStoragePath = (
  knowledge: Pick<KnowledgeBaseDocument, "scope" | "projectId">,
  knowledgeId: string,
  documentId: string,
  documentVersionHash: string,
  fileName: string,
): string => {
  return join(
    buildStorageDocumentVersionPath(
      knowledge,
      knowledgeId,
      documentId,
      documentVersionHash,
    ),
    sanitizeFileName(basename(fileName)),
  );
};

export const createKnowledgeDocumentStorageLayout = ({
  env,
  knowledge,
  knowledgeId,
  documentId,
  documentVersionHash,
  fileName,
}: {
  env: AppEnv;
  knowledge: Pick<KnowledgeBaseDocument, "scope" | "projectId">;
  knowledgeId: string;
  documentId: string;
  documentVersionHash: string;
  fileName: string;
}): KnowledgeDocumentStorageLayout => {
  const knowledgeRootPath = buildStorageKnowledgeRootPath(
    knowledge,
    knowledgeId,
  );
  const documentRootPath = buildStorageDocumentRootPath(
    knowledge,
    knowledgeId,
    documentId,
  );
  const documentVersionPath = buildStorageDocumentVersionPath(
    knowledge,
    knowledgeId,
    documentId,
    documentVersionHash,
  );
  const storagePath = buildStoragePath(
    knowledge,
    knowledgeId,
    documentId,
    documentVersionHash,
    fileName,
  );

  return {
    knowledgeRootPath,
    documentRootPath,
    documentVersionPath,
    storagePath,
    fileName: basename(fileName),
    absoluteKnowledgeRootPath: join(
      env.knowledge.storageRoot,
      knowledgeRootPath,
    ),
    absoluteDocumentRootPath: join(env.knowledge.storageRoot, documentRootPath),
    absoluteDocumentVersionPath: join(
      env.knowledge.storageRoot,
      documentVersionPath,
    ),
    absoluteStoragePath: join(env.knowledge.storageRoot, storagePath),
  };
};

export const writeKnowledgeDocumentFile = async ({
  layout,
  file,
}: {
  layout: KnowledgeDocumentStorageLayout;
  file: UploadedKnowledgeFile;
}): Promise<void> => {
  await mkdir(layout.absoluteDocumentVersionPath, {
    recursive: true,
  });
  await writeFile(layout.absoluteStoragePath, file.buffer);
};

export const removeKnowledgeStorageRoot = async ({
  env,
  knowledge,
  knowledgeId,
}: {
  env: AppEnv;
  knowledge: Pick<KnowledgeBaseDocument, "scope" | "projectId">;
  knowledgeId: string;
}): Promise<void> => {
  await rm(
    join(
      env.knowledge.storageRoot,
      buildStorageKnowledgeRootPath(knowledge, knowledgeId),
    ),
    {
      recursive: true,
      force: true,
    },
  );
};

export const removeKnowledgeDocumentStorage = async ({
  env,
  knowledge,
  knowledgeId,
  documentId,
}: {
  env: AppEnv;
  knowledge: Pick<KnowledgeBaseDocument, "scope" | "projectId">;
  knowledgeId: string;
  documentId: string;
}): Promise<void> => {
  await rm(
    join(
      env.knowledge.storageRoot,
      buildStorageDocumentRootPath(knowledge, knowledgeId, documentId),
    ),
    {
      recursive: true,
      force: true,
    },
  );
};

export const readDocumentStoragePresence = async ({
  env,
  document,
}: {
  env: AppEnv;
  document: Pick<KnowledgeDocumentRecord, "storagePath">;
}): Promise<boolean> => {
  try {
    await access(join(env.knowledge.storageRoot, document.storagePath));
    return true;
  } catch {
    return false;
  }
};
