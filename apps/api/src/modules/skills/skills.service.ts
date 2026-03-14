import type { SkillsRepository } from './skills.repository.js';
import { listRegisteredSkills } from './skills.registry.js';
import type { SkillsCommandContext, SkillsListResponse } from './skills.types.js';

export interface SkillsService {
  listSkills(context: SkillsCommandContext): Promise<SkillsListResponse>;
}

export const createSkillsService = ({
  repository,
}: {
  repository: SkillsRepository;
}): SkillsService => {
  void repository;

  return {
    listSkills: async () => {
      const items = listRegisteredSkills();

      return {
        total: items.length,
        items,
        meta: {
          module: 'skills',
          stage: 'GA-08',
          registry: 'code',
          builtinOnly: true,
          boundaries: {
            businessRuntime: 'node-express',
            registryStore: 'code-registry',
            knowledgeAccess: 'service-layer-only',
            execution: 'service-linked-or-contract-only',
          },
        },
      };
    },
  };
};
