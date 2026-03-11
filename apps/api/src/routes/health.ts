import { Router } from 'express';
import type { AppEnv } from '@config/env.js';
import type { MongoDatabaseManager } from '@db/mongo.js';
import { asyncHandler } from '@lib/async-handler.js';
import { getChromaHealthSnapshot } from '@lib/chroma-health.js';

interface CreateHealthRouterOptions {
  env: AppEnv;
  mongo: MongoDatabaseManager;
}

export const createHealthRouter = ({ env, mongo }: CreateHealthRouterOptions): Router => {
  const healthRouter = Router();

  healthRouter.get(
    '/',
    asyncHandler(async (_req, res) => {
      const database = await mongo.getHealthSnapshot();
      const vectorStore = await getChromaHealthSnapshot(env);
      const status =
        database.status === 'up' && vectorStore.status !== 'down' ? 'ok' : 'degraded';

      res.json({
        status,
        service: env.appName,
        environment: env.nodeEnv,
        timestamp: new Date().toISOString(),
        uptimeSeconds: Number(process.uptime().toFixed(2)),
        checks: {
          app: {
            status: 'up',
          },
          database,
          vectorStore,
        },
      });
    }),
  );

  return healthRouter;
};
