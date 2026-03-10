import cors from 'cors';
import express, { type Express } from 'express';
import type { AppEnv } from '@config/env.js';
import type { MongoDatabaseManager } from '@db/mongo.js';
import { createErrorHandler } from '@middleware/error-handler.js';
import { notFoundHandler } from '@middleware/not-found.js';
import { requestContextMiddleware } from '@middleware/request-context.js';
import { createSensitiveRouteTransportGuard } from '@middleware/secure-transport.js';
import { createRequireAuth } from '@modules/auth/auth.middleware.js';
import { createAuthRouter } from '@modules/auth/auth.router.js';
import { createAuthService } from '@modules/auth/auth.service.js';
import { membershipsRouter } from '@modules/memberships/memberships.router.js';
import { projectsRouter } from '@modules/projects/projects.router.js';
import { createHealthRouter } from '@routes/health.js';
import { createMemoryRouter } from '@routes/memory.js';

interface CreateAppOptions {
  env: AppEnv;
  mongo: MongoDatabaseManager;
}

export const createApp = ({ env, mongo }: CreateAppOptions): Express => {
  const app = express();
  const authService = createAuthService({ env, mongo });
  const requireAuth = createRequireAuth(authService);
  const sensitiveRouteTransportGuard = createSensitiveRouteTransportGuard(env);

  app.disable('x-powered-by');

  app.use(requestContextMiddleware);
  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json());

  app.use('/api/health', createHealthRouter({ env, mongo }));
  app.use('/api/auth', sensitiveRouteTransportGuard, createAuthRouter(authService));
  app.use('/api/projects', projectsRouter);
  app.use('/api/projects', membershipsRouter);
  app.use('/api/memory', sensitiveRouteTransportGuard, createMemoryRouter(requireAuth));

  app.get('/', (_req, res) => {
    res.json({
      name: env.appName,
      status: 'running',
      environment: env.nodeEnv,
      docs: [
        '/api/health',
        '/api/auth/register',
        '/api/auth/login',
        '/api/memory/overview',
        '/api/memory/query',
      ],
    });
  });

  app.use(notFoundHandler);
  app.use(createErrorHandler(env));

  return app;
};
