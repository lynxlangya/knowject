import { createServer } from 'node:http';
import { createApp } from './app/create-app.js';
import { getEnv } from './config/env.js';
import { MongoDatabaseManager } from './db/mongo.js';

const bootstrap = async (): Promise<void> => {
  const env = getEnv();
  const mongo = new MongoDatabaseManager(env);

  try {
    await mongo.connect();
    console.log(`[bootstrap] MongoDB connected at ${env.mongo.host}/${env.mongo.dbName}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.warn(`[bootstrap] MongoDB unavailable at startup: ${message}`);
  }

  const app = createApp({ env, mongo });
  const server = createServer(app);

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`[shutdown] received ${signal}, closing server`);

    server.close(async (serverError) => {
      if (serverError) {
        console.error('[shutdown] failed to close HTTP server', serverError);
      }

      try {
        await mongo.close();
      } catch (mongoError) {
        console.error('[shutdown] failed to close MongoDB client', mongoError);
      } finally {
        process.exit(serverError ? 1 : 0);
      }
    });
  };

  process.once('SIGINT', () => {
    void shutdown('SIGINT');
  });

  process.once('SIGTERM', () => {
    void shutdown('SIGTERM');
  });

  server.listen(env.port, () => {
    console.log(`${env.appName} running on http://localhost:${env.port}`);
  });
};

bootstrap().catch((error) => {
  console.error('[bootstrap] failed to start knowject api', error);
  process.exit(1);
});
