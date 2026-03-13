import type { SkillsRepository } from './skills.repository.js';
import type { SkillsCommandContext, SkillsListResponse } from './skills.types.js';

export interface SkillsService {
  listSkills(context: SkillsCommandContext): Promise<SkillsListResponse>;
}

export const createSkillsService = ({
  repository,
}: {
  repository: SkillsRepository;
}): SkillsService => {
  return {
    listSkills: async ({ actor }) => {
      return {
        total: 0,
        items: [],
        meta: {
          module: 'skills',
          stage: 'GA-02',
          placeholder: true,
          actorId: actor.id,
          nextTask: 'GA-08',
          boundaries: {
            businessRuntime: 'node-express',
            primaryDataStore: repository.getPrimaryDataStore(),
            knowledgeAccess: 'service-layer-only',
          },
        },
      };
    },
  };
};
