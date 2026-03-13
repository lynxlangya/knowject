import type { MongoDatabaseManager } from '@db/mongo.js';

export class SkillsRepository {
  constructor(private readonly mongo: MongoDatabaseManager) {}

  getPrimaryDataStore(): 'mongodb' {
    void this.mongo;
    return 'mongodb';
  }
}

export const createSkillsRepository = ({
  mongo,
}: {
  mongo: MongoDatabaseManager;
}): SkillsRepository => {
  return new SkillsRepository(mongo);
};
