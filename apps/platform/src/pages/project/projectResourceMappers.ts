import type { AgentResponse } from '@api/agents';
import type { KnowledgeSummaryResponse } from '@api/knowledge';
import type { SkillSummaryResponse } from '@api/skills';
import {
  GLOBAL_ASSET_TITLES,
  getGlobalAssetById,
} from '@app/project/project.catalog';
import type {
  ProjectResourceFocus,
  ProjectResourceGroup,
  ProjectResourceItem,
  ProjectSummary,
} from '@app/project/project.types';
import i18n from '../../i18n';
import { tp } from './project.i18n';

export interface ProjectResourceCatalogs {
  knowledgeCatalog?: KnowledgeSummaryResponse[];
  projectKnowledgeCatalog?: KnowledgeSummaryResponse[];
  agentsCatalog?: AgentResponse[];
  skillsCatalog?: SkillSummaryResponse[];
}

const RESOURCE_GROUP_COPY: Record<
  ProjectResourceFocus,
  { title: string; description: string }
> = {
  knowledge: {
    title: tp('resources.group.knowledgeTitle'),
    description: tp('resources.group.knowledgeDescription'),
  },
  skills: {
    title: tp('resources.group.skillsTitle'),
    description: tp('resources.group.skillsDescription'),
  },
  agents: {
    title: tp('resources.group.agentsTitle'),
    description: tp('resources.group.agentsDescription'),
  },
};

const formatCompactDate = (value: string): string => {
  return new Intl.DateTimeFormat(i18n.resolvedLanguage || 'en', {
    month: 'numeric',
    day: 'numeric',
  }).format(new Date(value));
};

const getResourceIdsByFocus = (
  project: Pick<ProjectSummary, 'knowledgeBaseIds' | 'skillIds' | 'agentIds'>,
  focus: ProjectResourceFocus,
): string[] => {
  if (focus === 'knowledge') {
    return project.knowledgeBaseIds;
  }

  if (focus === 'skills') {
    return project.skillIds;
  }

  return project.agentIds;
};

const buildMissingProjectResourceItem = (
  focus: ProjectResourceFocus,
  resourceId: string,
): ProjectResourceItem => {
  return {
    id: resourceId,
    type: focus,
    name: tp('resources.item.unknownName', { id: resourceId }),
    description: tp('resources.item.unknownDescription', {
      title: GLOBAL_ASSET_TITLES[focus],
    }),
    updatedAt: tp('resources.item.notRecorded'),
    owner: tp('resources.item.unassigned'),
    usageCount: 0,
    source: 'global',
  };
};

const mapBoundKnowledgeResources = (
  project: Pick<ProjectSummary, 'knowledgeBaseIds'>,
  knowledgeCatalog: KnowledgeSummaryResponse[],
): ProjectResourceItem[] => {
  const knowledgeById = new Map(
    knowledgeCatalog.map((knowledge) => [knowledge.id, knowledge] as const),
  );

  return project.knowledgeBaseIds.map((resourceId) => {
    const knowledge = knowledgeById.get(resourceId);

    if (knowledge) {
      return {
        id: knowledge.id,
        type: 'knowledge' as const,
        name: knowledge.name,
        description: knowledge.description,
        updatedAt: formatCompactDate(knowledge.updatedAt),
        owner:
          knowledge.maintainerName ??
          knowledge.createdByName ??
          tp('resources.item.unassigned'),
        usageCount: 0,
        source: 'global' as const,
        documentCount: knowledge.documentCount,
        indexStatus: knowledge.indexStatus,
      };
    }

    const legacyKnowledge = getGlobalAssetById('knowledge', resourceId);
    if (legacyKnowledge) {
      return {
        ...legacyKnowledge,
        source: 'global' as const,
      };
    }

    return {
      id: resourceId,
      type: 'knowledge' as const,
      name: tp('resources.item.knowledgeFallbackName', { id: resourceId }),
      description: tp('resources.item.knowledgeFallbackDescription'),
      updatedAt: tp('resources.item.notRecorded'),
      owner: tp('resources.item.unassigned'),
      usageCount: 0,
      source: 'global' as const,
    };
  });
};

const mapProjectKnowledgeResources = (
  projectKnowledgeCatalog: KnowledgeSummaryResponse[],
): ProjectResourceItem[] => {
  return projectKnowledgeCatalog.map((knowledge) => ({
    id: knowledge.id,
    type: 'knowledge' as const,
    name: knowledge.name,
    description: knowledge.description,
    updatedAt: formatCompactDate(knowledge.updatedAt),
    owner:
      knowledge.maintainerName ??
      knowledge.createdByName ??
      tp('resources.item.unassigned'),
    usageCount: 1,
    source: 'project' as const,
    documentCount: knowledge.documentCount,
    indexStatus: knowledge.indexStatus,
  }));
};

const mapProjectResources = (
  project: Pick<ProjectSummary, 'knowledgeBaseIds' | 'skillIds' | 'agentIds'>,
  focus: ProjectResourceFocus,
  catalogs: ProjectResourceCatalogs = {},
): ProjectResourceItem[] => {
  const knowledgeCatalog = catalogs.knowledgeCatalog ?? [];
  const projectKnowledgeCatalog = catalogs.projectKnowledgeCatalog ?? [];
  const agentsCatalog = catalogs.agentsCatalog ?? [];
  const skillsCatalog = catalogs.skillsCatalog ?? [];

  if (focus === 'knowledge') {
    return [
      ...mapProjectKnowledgeResources(projectKnowledgeCatalog),
      ...mapBoundKnowledgeResources(project, knowledgeCatalog),
    ];
  }

  if (focus === 'skills') {
    const skillsById = new Map(
      skillsCatalog.map((skill) => [skill.id, skill] as const),
    );

    return getResourceIdsByFocus(project, focus).map((resourceId) => {
      const skill = skillsById.get(resourceId);

      if (skill) {
        return {
          id: skill.id,
          type: 'skills' as const,
          name: skill.name,
          description: skill.description,
          updatedAt: formatCompactDate(skill.updatedAt),
          owner:
            skill.source === 'system'
              ? tp('resources.item.systemBuiltin')
              : skill.source === 'imported'
                ? tp('resources.item.importedPublic')
                : tp('resources.item.currentTeam'),
          usageCount: 0,
          source: 'global' as const,
        };
      }

      return buildMissingProjectResourceItem(focus, resourceId);
    });
  }

  if (focus === 'agents') {
    const agentsById = new Map(
      agentsCatalog.map((agent) => [agent.id, agent] as const),
    );

    return getResourceIdsByFocus(project, focus).map((resourceId) => {
      const agent = agentsById.get(resourceId);

      if (agent) {
        return {
          id: agent.id,
          type: 'agents' as const,
          name: agent.name,
          description: agent.description,
          updatedAt: formatCompactDate(agent.updatedAt),
          owner: tp('resources.item.currentTeam'),
          usageCount: 0,
          source: 'global' as const,
        };
      }

      const legacyAgent = getGlobalAssetById('agents', resourceId);
      if (legacyAgent) {
        return {
          ...legacyAgent,
          source: 'global' as const,
        };
      }

      return buildMissingProjectResourceItem(focus, resourceId);
    });
  }

  return getResourceIdsByFocus(project, focus).map((resourceId) => {
    const resource = getGlobalAssetById(focus, resourceId);

    if (resource) {
      return {
        ...resource,
        source: 'global' as const,
      };
    }

    return buildMissingProjectResourceItem(focus, resourceId);
  });
};

export const getProjectResourceGroups = (
  project: Pick<ProjectSummary, 'knowledgeBaseIds' | 'skillIds' | 'agentIds'>,
  catalogs: ProjectResourceCatalogs = {},
): ProjectResourceGroup[] => {
  return (['knowledge', 'skills', 'agents'] as const).map((focus) => ({
    key: focus,
    title: RESOURCE_GROUP_COPY[focus].title,
    description: RESOURCE_GROUP_COPY[focus].description,
    items: mapProjectResources(project, focus, catalogs),
  }));
};

export const getRecentProjectResources = (
  project: Pick<ProjectSummary, 'knowledgeBaseIds' | 'skillIds' | 'agentIds'>,
  catalogs: ProjectResourceCatalogs = {},
  limit = 4,
): ProjectResourceItem[] => {
  return getProjectResourceGroups(project, catalogs)
    .flatMap((group) => group.items)
    .slice(0, limit);
};
