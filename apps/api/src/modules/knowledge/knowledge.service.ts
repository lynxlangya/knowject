import type { KnowledgeRepository } from './knowledge.repository.js';
import type { KnowledgeCommandContext, KnowledgeListResponse } from './knowledge.types.js';

export interface KnowledgeService {
  listKnowledge(context: KnowledgeCommandContext): Promise<KnowledgeListResponse>;
}

export const createKnowledgeService = ({
  repository,
}: {
  repository: KnowledgeRepository;
}): KnowledgeService => {
  return {
    // Keep future metadata, upload, index trigger, and search orchestration behind the service.
    listKnowledge: async ({ actor }) => {
      return {
        total: 0,
        items: [],
        meta: {
          module: 'knowledge',
          stage: 'GA-02',
          placeholder: true,
          actorId: actor.id,
          nextTask: 'GA-03',
          boundaries: {
            businessRuntime: 'node-express',
            primaryDataStore: repository.getPrimaryDataStore(),
            indexRuntime: 'python-http',
            indexStore: 'chroma',
          },
        },
      };
    },
  };
};
