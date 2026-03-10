import cors from 'cors';
import express, { type Express } from 'express';
import type { AppEnv } from '@config/env.js';
import type { MongoDatabaseManager } from '@db/mongo.js';
import { createErrorHandler } from '@middleware/error-handler.js';
import { notFoundHandler } from '@middleware/not-found.js';
import { requestContextMiddleware } from '@middleware/request-context.js';
import { createSensitiveRouteTransportGuard } from '@middleware/secure-transport.js';
import { createRequireAuth } from '@modules/auth/auth.middleware.js';
import { createAuthRepository } from '@modules/auth/auth.repository.js';
import { createAuthRouter } from '@modules/auth/auth.router.js';
import { createAuthService } from '@modules/auth/auth.service.js';
import { createMembershipsRouter } from '@modules/memberships/memberships.router.js';
import { createMembershipsService } from '@modules/memberships/memberships.service.js';
import { createProjectsRepository } from '@modules/projects/projects.repository.js';
import { createProjectsRouter } from '@modules/projects/projects.router.js';
import { createProjectsService } from '@modules/projects/projects.service.js';
import { createHealthRouter } from '@routes/health.js';
import { createMemoryRouter } from '@routes/memory.js';

interface CreateAppOptions {
  env: AppEnv;
  mongo: MongoDatabaseManager;
}

export const createApp = ({ env, mongo }: CreateAppOptions): Express => {
  const app = express();
  const authRepository = createAuthRepository({ mongo });
  const authService = createAuthService({ env, repository: authRepository });
  const projectsRepository = createProjectsRepository({ mongo });
  const projectsService = createProjectsService({
    repository: projectsRepository,
    authRepository,
  });
  const membershipsService = createMembershipsService({
    projectsRepository,
    authRepository,
  });
  const requireAuth = createRequireAuth(authService);
  const sensitiveRouteTransportGuard = createSensitiveRouteTransportGuard(env);

  app.disable('x-powered-by');

  app.use(requestContextMiddleware);
  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json());

  app.use('/api/health', createHealthRouter({ env, mongo }));
  app.use('/api/auth', sensitiveRouteTransportGuard, createAuthRouter(authService));
  app.use('/api/projects', createProjectsRouter(projectsService, requireAuth));
  app.use('/api/projects', createMembershipsRouter(membershipsService, requireAuth));
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
        '/api/projects',
        '/api/projects/:projectId/members',
        '/api/memory/overview',
        '/api/memory/query',
      ],
    });
  });

  app.use(notFoundHandler);
  app.use(createErrorHandler(env));

  return app;
};
