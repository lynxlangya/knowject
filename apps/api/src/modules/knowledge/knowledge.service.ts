import type { KnowledgeRepository } from './knowledge.repository.js';
import { toKnowledgeSummaryResponse } from './knowledge.shared.js';
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
    listKnowledge: async (_context) => {
      await repository.ensureMetadataModel();
      const items = await repository.listKnowledgeBases();

      return {
        total: items.length,
        items: items.map(toKnowledgeSummaryResponse),
      };
    },
  };
};
