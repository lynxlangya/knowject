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
    title: '知识库',
    description:
      '当前项目既可以绑定全局知识库，也可以维护项目私有知识，二者都会作为项目协作上下文参与消费。',
  },
  skills: {
    title: '技能',
    description:
      '当前项目可直接调用的技能能力，用于复用成熟工作流，来源仍来自全局技能资产。',
  },
  agents: {
    title: '智能体',
    description:
      '当前项目已绑定的智能体能力，可参与分析、审查和执行协作，来源仍来自全局智能体资产。',
  },
};

const compactDateFormatter = new Intl.DateTimeFormat('zh-CN', {
  month: 'numeric',
  day: 'numeric',
});

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
    name: `未知资源（${resourceId}）`,
    description: `该${GLOBAL_ASSET_TITLES[focus]}已绑定到当前项目，但本地尚未拿到完整元数据。`,
    updatedAt: '未记录',
    owner: '未指定',
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
        updatedAt: compactDateFormatter.format(new Date(knowledge.updatedAt)),
        owner: knowledge.maintainerName ?? knowledge.createdByName ?? '未指定',
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
      name: `知识库 ${resourceId}`,
      description: '该知识库已绑定到当前项目，但本地尚未拿到完整元数据。',
      updatedAt: '未记录',
      owner: '未指定',
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
    updatedAt: compactDateFormatter.format(new Date(knowledge.updatedAt)),
    owner: knowledge.maintainerName ?? knowledge.createdByName ?? '未指定',
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
          updatedAt: compactDateFormatter.format(new Date(skill.updatedAt)),
          owner:
            skill.source === 'system'
              ? '系统内置'
              : skill.source === 'imported'
                ? '公网导入'
                : '当前团队',
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
          updatedAt: compactDateFormatter.format(new Date(agent.updatedAt)),
          owner: '当前团队',
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
