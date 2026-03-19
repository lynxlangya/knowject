import { PATHS } from "@app/navigation/paths";
import type { ProjectResourceFocus } from "@app/project/project.types";

export const PROJECT_KNOWLEDGE_BATCH_UPLOAD_MESSAGE_KEY =
  "project-knowledge-batch-upload";

export const GLOBAL_PATH_BY_FOCUS: Record<ProjectResourceFocus, string> = {
  knowledge: PATHS.knowledge,
  skills: PATHS.skills,
  agents: PATHS.agents,
};

export const RESOURCE_FOCUS_KEYS = ["knowledge", "skills", "agents"] as const;

export const formatProjectKnowledgeBatchUploadProgress = (
  current: number,
  total: number,
): string => {
  return `正在上传项目文档 ${current}/${total}`;
};

export const formatProjectKnowledgeBatchUploadSuccessMessage = (
  successCount: number,
  totalCount: number,
): string => {
  if (successCount === totalCount) {
    return `已上传 ${successCount} 个文件，正在进入项目索引队列`;
  }

  return `已上传 ${successCount}/${totalCount} 个文件，正在进入项目索引队列`;
};
