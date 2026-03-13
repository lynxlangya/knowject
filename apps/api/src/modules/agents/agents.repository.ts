import type { MongoDatabaseManager } from '@db/mongo.js';

export class AgentsRepository {
  constructor(private readonly mongo: MongoDatabaseManager) {}

  getPrimaryDataStore(): 'mongodb' {
    void this.mongo;
    return 'mongodb';
  }
}

export const createAgentsRepository = ({
  mongo,
}: {
  mongo: MongoDatabaseManager;
}): AgentsRepository => {
  return new AgentsRepository(mongo);
};
