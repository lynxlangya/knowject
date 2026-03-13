import cors from 'cors';
import express, { type Express } from 'express';
import type { AppEnv } from '@config/env.js';
import type { MongoDatabaseManager } from '@db/mongo.js';
import { createErrorHandler } from '@middleware/error-handler.js';
import { notFoundHandler } from '@middleware/not-found.js';
import { requestContextMiddleware } from '@middleware/request-context.js';
import { createSensitiveRouteTransportGuard } from '@middleware/secure-transport.js';
import { createAgentsRepository } from '@modules/agents/agents.repository.js';
import { createAgentsRouter } from '@modules/agents/agents.router.js';
import { createAgentsService } from '@modules/agents/agents.service.js';
import { createRequireAuth } from '@modules/auth/auth.middleware.js';
import { createAuthRepository } from '@modules/auth/auth.repository.js';
import { createAuthRouter } from '@modules/auth/auth.router.js';
import { createAuthService } from '@modules/auth/auth.service.js';
import { createKnowledgeRepository } from '@modules/knowledge/knowledge.repository.js';
import { createKnowledgeRouter } from '@modules/knowledge/knowledge.router.js';
import { createKnowledgeSearchService } from '@modules/knowledge/knowledge.search.js';
import { createKnowledgeService } from '@modules/knowledge/knowledge.service.js';
import { createMembersRouter } from '@modules/members/members.router.js';
import { createMembersService } from '@modules/members/members.service.js';
import { createMembershipsRouter } from '@modules/memberships/memberships.router.js';
import { createMembershipsService } from '@modules/memberships/memberships.service.js';
import { createProjectsRepository } from '@modules/projects/projects.repository.js';
import { createProjectsRouter } from '@modules/projects/projects.router.js';
import { createProjectsService } from '@modules/projects/projects.service.js';
import { createSkillsRepository } from '@modules/skills/skills.repository.js';
import { createSkillsRouter } from '@modules/skills/skills.router.js';
import { createSkillsService } from '@modules/skills/skills.service.js';
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
  const knowledgeRepository = createKnowledgeRepository({ mongo });
  const knowledgeSearchService = createKnowledgeSearchService({ env });
  const knowledgeService = createKnowledgeService({
    env,
    repository: knowledgeRepository,
    searchService: knowledgeSearchService,
    authRepository,
  });
  const skillsRepository = createSkillsRepository({ mongo });
  const skillsService = createSkillsService({
    repository: skillsRepository,
  });
  const agentsRepository = createAgentsRepository({ mongo });
  const agentsService = createAgentsService({
    repository: agentsRepository,
  });
  const membershipsService = createMembershipsService({
    projectsRepository,
    authRepository,
  });
  const membersService = createMembersService({
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
  app.use(
    '/api/auth',
    sensitiveRouteTransportGuard,
    createAuthRouter(authService, requireAuth),
  );
  app.use('/api/members', createMembersRouter(membersService, requireAuth));
  app.use('/api/projects', createProjectsRouter(projectsService, requireAuth));
  app.use('/api/projects', createMembershipsRouter(membershipsService, requireAuth));
  app.use('/api/knowledge', createKnowledgeRouter(knowledgeService, requireAuth));
  app.use('/api/skills', createSkillsRouter(skillsService, requireAuth));
  app.use('/api/agents', createAgentsRouter(agentsService, requireAuth));
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
        '/api/auth/users',
        '/api/members',
        '/api/projects',
        '/api/projects/:projectId/members',
        '/api/knowledge',
        '/api/knowledge/search',
        '/api/knowledge/:knowledgeId',
        '/api/knowledge/:knowledgeId/documents',
        '/api/skills',
        '/api/agents',
        '/api/memory/overview',
        '/api/memory/query',
      ],
    });
  });

  app.use(notFoundHandler);
  app.use(createErrorHandler(env));

  void knowledgeService.initializeSearchInfrastructure().catch((error) => {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.warn(`[bootstrap] failed to initialize knowledge search infrastructure: ${message}`);
  });

  return app;
};
