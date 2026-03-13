import type { MongoDatabaseManager } from '@db/mongo.js';

export class KnowledgeRepository {
  constructor(private readonly mongo: MongoDatabaseManager) {}

  getPrimaryDataStore(): 'mongodb' {
    void this.mongo;
    return 'mongodb';
  }
}

export const createKnowledgeRepository = ({
  mongo,
}: {
  mongo: MongoDatabaseManager;
}): KnowledgeRepository => {
  return new KnowledgeRepository(mongo);
};
