import type { AgentsRepository } from './agents.repository.js';
import type { AgentsCommandContext, AgentsListResponse } from './agents.types.js';

export interface AgentsService {
  listAgents(context: AgentsCommandContext): Promise<AgentsListResponse>;
}

export const createAgentsService = ({
  repository,
}: {
  repository: AgentsRepository;
}): AgentsService => {
  return {
    listAgents: async ({ actor }) => {
      return {
        total: 0,
        items: [],
        meta: {
          module: 'agents',
          stage: 'GA-02',
          placeholder: true,
          actorId: actor.id,
          nextTask: 'GA-10',
          boundaries: {
            businessRuntime: 'node-express',
            primaryDataStore: repository.getPrimaryDataStore(),
            knowledgeAccess: 'service-layer-only',
            skillBinding: 'registered-skills-only',
          },
        },
      };
    },
  };
};
