import { AGENTS_FEATURE_ENABLED } from "@app/navigation/features";
import { PATHS } from "@app/navigation/paths";
import type { ProjectResourceFocus } from "@app/project/project.types";
import { tp } from "../project.i18n";

export const PROJECT_KNOWLEDGE_BATCH_UPLOAD_MESSAGE_KEY =
  "project-knowledge-batch-upload";

export const GLOBAL_PATH_BY_FOCUS: Record<ProjectResourceFocus, string> = {
  knowledge: PATHS.knowledge,
  skills: PATHS.skills,
  agents: PATHS.agents,
};

export const RESOURCE_FOCUS_KEYS: ProjectResourceFocus[] =
  AGENTS_FEATURE_ENABLED
    ? ["knowledge", "skills", "agents"]
    : ["knowledge", "skills"];

export const formatProjectKnowledgeBatchUploadProgress = (
  current: number,
  total: number,
): string => {
  return tp("resources.upload.progress", { current, total });
};

export const formatProjectKnowledgeBatchUploadSuccessMessage = (
  successCount: number,
  totalCount: number,
): string => {
  if (successCount === totalCount) {
    return tp("resources.upload.successAll", { count: successCount });
  }

  return tp("resources.upload.successPartial", {
    success: successCount,
    total: totalCount,
  });
};
