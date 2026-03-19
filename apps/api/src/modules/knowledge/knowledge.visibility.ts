import type { WithId } from "mongodb";
import type { ProjectsRepository } from "@modules/projects/projects.repository.js";
import {
  getProjectMember,
  requireVisibleProject,
} from "@modules/projects/projects.shared.js";
import { resolveKnowledgeScope } from "./knowledge.shared.js";
import type { KnowledgeRepository } from "./knowledge.repository.js";
import type {
  KnowledgeBaseDocument,
  KnowledgeCommandContext,
} from "./knowledge.types.js";

export const requireVisibleKnowledge = async ({
  repository,
  projectsRepository,
  actorId,
  knowledgeId,
  createKnowledgeNotFoundError,
}: {
  repository: KnowledgeRepository;
  projectsRepository: ProjectsRepository;
  actorId: string;
  knowledgeId: string;
  createKnowledgeNotFoundError: () => Error;
}): Promise<WithId<KnowledgeBaseDocument>> => {
  const knowledge = await repository.findKnowledgeById(knowledgeId);

  if (!knowledge) {
    throw createKnowledgeNotFoundError();
  }

  const scope = resolveKnowledgeScope(knowledge);

  if (scope.scope !== "project") {
    return knowledge;
  }

  if (!scope.projectId) {
    throw createKnowledgeNotFoundError();
  }

  const project = await projectsRepository.findById(scope.projectId);
  if (!project || !getProjectMember(project, actorId)) {
    throw createKnowledgeNotFoundError();
  }

  return knowledge;
};

export const requireKnowledgeInProject = async ({
  repository,
  projectsRepository,
  actor,
  projectId,
  knowledgeId,
  createKnowledgeNotFoundError,
}: {
  repository: KnowledgeRepository;
  projectsRepository: ProjectsRepository;
  actor: KnowledgeCommandContext["actor"];
  projectId: string;
  knowledgeId: string;
  createKnowledgeNotFoundError: () => Error;
}): Promise<WithId<KnowledgeBaseDocument>> => {
  await requireVisibleProject(projectsRepository, projectId, actor);

  const knowledge = await repository.findKnowledgeById(knowledgeId);
  if (!knowledge) {
    throw createKnowledgeNotFoundError();
  }

  const scope = resolveKnowledgeScope(knowledge);
  if (scope.scope !== "project" || scope.projectId !== projectId) {
    throw createKnowledgeNotFoundError();
  }

  return knowledge;
};
