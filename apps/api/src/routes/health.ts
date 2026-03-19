import { Router } from 'express';
import type { AppEnv } from '@config/env.js';
import type { MongoDatabaseManager } from '@db/mongo.js';
import { asyncHandler } from '@lib/async-handler.js';
import { sendSuccess } from '@lib/api-response.js';
import { getChromaHealthSnapshot } from '@lib/chroma-health.js';

interface CreateHealthRouterOptions {
  env: AppEnv;
  mongo: MongoDatabaseManager;
}

type PublicHealthStatus = 'up' | 'down';

const toPublicDatabaseStatus = (
  status: Awaited<ReturnType<MongoDatabaseManager['getHealthSnapshot']>>['status'],
): PublicHealthStatus => {
  return status === 'up' ? 'up' : 'down';
};

const toPublicVectorStoreStatus = (
  status: Awaited<ReturnType<typeof getChromaHealthSnapshot>>['status'],
): PublicHealthStatus => {
  return status === 'down' ? 'down' : 'up';
};

export const createHealthRouter = ({ env, mongo }: CreateHealthRouterOptions): Router => {
  const healthRouter = Router();

  healthRouter.get(
    '/',
    asyncHandler(async (_req, res) => {
      const database = await mongo.getHealthSnapshot();
      const vectorStore = await getChromaHealthSnapshot(env);
      const databaseStatus = toPublicDatabaseStatus(database.status);
      const vectorStoreStatus = toPublicVectorStoreStatus(vectorStore.status);
      const status = databaseStatus === 'up' && vectorStoreStatus === 'up' ? 'up' : 'down';

      sendSuccess(res, {
        status,
        checks: {
          app: {
            status: 'up',
          },
          database: {
            status: databaseStatus,
          },
          vectorStore: {
            status: vectorStoreStatus,
          },
        },
      });
    }),
  );

  return healthRouter;
};
