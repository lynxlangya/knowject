import cors from 'cors';
import express, { type Express } from 'express';
import type { AppEnv } from '@config/env.js';
import type { MongoDatabaseManager } from '@db/mongo.js';
import { createErrorHandler } from '@middleware/error-handler.js';
import { notFoundHandler } from '@middleware/not-found.js';
import { requestContextMiddleware } from '@middleware/request-context.js';
import { createSensitiveRouteTransportGuard } from '@middleware/secure-transport.js';
import { sendSuccess } from '@lib/api-response.js';
import { createAgentsRepository } from '@modules/agents/agents.repository.js';
import { createAgentsRouter } from '@modules/agents/agents.router.js';
import { createAgentsService } from '@modules/agents/agents.service.js';
import { createRequireAuth } from '@modules/auth/auth.middleware.js';
import { createAuthRepository } from '@modules/auth/auth.repository.js';
import { createAuthRouter } from '@modules/auth/auth.router.js';
import { createAuthService } from '@modules/auth/auth.service.js';
import { createProjectKnowledgeRouter } from '@modules/knowledge/knowledge.project-router.js';
import { createKnowledgeRepository } from '@modules/knowledge/knowledge.repository.js';
import { createKnowledgeRouter } from '@modules/knowledge/knowledge.router.js';
import { createKnowledgeSearchService } from '@modules/knowledge/knowledge.search.js';
import { createKnowledgeService } from '@modules/knowledge/knowledge.service.js';
import { createMembersRouter } from '@modules/members/members.router.js';
import { createMembersService } from '@modules/members/members.service.js';
import { createMembershipsRouter } from '@modules/memberships/memberships.router.js';
import { createMembershipsService } from '@modules/memberships/memberships.service.js';
import { createProjectConversationRuntime } from '@modules/projects/project-conversation-runtime.js';
import { createProjectsRepository } from '@modules/projects/projects.repository.js';
import { createProjectsRouter } from '@modules/projects/projects.router.js';
import { createProjectsService } from '@modules/projects/projects.service.js';
import { createSettingsRepository } from '@modules/settings/settings.repository.js';
import { createSettingsRouter } from '@modules/settings/settings.router.js';
import { createSettingsService } from '@modules/settings/settings.service.js';
import { createSkillsRepository } from '@modules/skills/skills.repository.js';
import { createSkillsRouter } from '@modules/skills/skills.router.js';
import { createSkillsService } from '@modules/skills/skills.service.js';
import { createSkillBindingValidator } from '@modules/skills/skills.binding.js';
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
  const settingsRepository = createSettingsRepository({ mongo });
  const skillsRepository = createSkillsRepository({ mongo });
  const skillBindingValidator = createSkillBindingValidator({
    repository: skillsRepository,
  });
  const knowledgeRepository = createKnowledgeRepository({ mongo });
  const knowledgeSearchService = createKnowledgeSearchService({
    env,
    settingsRepository,
  });
  const knowledgeService = createKnowledgeService({
    env,
    repository: knowledgeRepository,
    searchService: knowledgeSearchService,
    authRepository,
    projectsRepository,
    settingsRepository,
  });
  const projectsService = createProjectsService({
    repository: projectsRepository,
    authRepository,
    skillBindingValidator,
    knowledgeUsage: {
      deleteProjectKnowledge: async (projectId, actor) => {
        const knowledgeList = await knowledgeService.listProjectKnowledge(
          { actor },
          projectId,
        );

        for (const knowledge of knowledgeList.items) {
          await knowledgeService.deleteKnowledge({ actor }, knowledge.id);
        }
      },
    },
    conversationRuntime: createProjectConversationRuntime({
      env,
      settingsRepository,
      knowledgeSearch: {
        searchProjectDocuments: (context, projectId, input) =>
          knowledgeService.searchProjectDocuments(context, projectId, input),
      },
    }),
  });
  const agentsRepository = createAgentsRepository({ mongo });
  const skillsService = createSkillsService({
    env,
    repository: skillsRepository,
    usageLookup: {
      countManagedSkillReferences: async (skillId) => {
        const [projectCount, agentCount] = await Promise.all([
          projectsRepository.countBySkillId(skillId),
          agentsRepository.countByBoundSkillId(skillId),
        ]);

        return {
          projectCount,
          agentCount,
        };
      },
    },
  });
  const agentsService = createAgentsService({
    repository: agentsRepository,
    knowledgeRepository,
    skillBindingValidator,
  });
  const membershipsService = createMembershipsService({
    projectsRepository,
    authRepository,
  });
  const settingsService = createSettingsService({
    env,
    repository: settingsRepository,
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
  app.use('/api/projects', createProjectKnowledgeRouter(knowledgeService, requireAuth));
  app.use('/api/knowledge', createKnowledgeRouter(knowledgeService, requireAuth));
  app.use('/api/skills', createSkillsRouter(skillsService, requireAuth));
  app.use('/api/agents', createAgentsRouter(agentsService, requireAuth));
  app.use(
    '/api/settings',
    sensitiveRouteTransportGuard,
    createSettingsRouter(settingsService, requireAuth),
  );
  app.use('/api/memory', sensitiveRouteTransportGuard, createMemoryRouter(requireAuth));

  app.get('/', (_req, res) => {
    sendSuccess(res, {
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
        '/api/projects/:projectId/conversations',
        '/api/projects/:projectId/conversations/:conversationId',
        '/api/projects/:projectId/conversations/:conversationId/messages',
        '/api/projects/:projectId/conversations/:conversationId/messages/stream',
        '/api/projects/:projectId/members',
        '/api/projects/:projectId/knowledge',
        '/api/projects/:projectId/knowledge/:knowledgeId',
        '/api/projects/:projectId/knowledge/:knowledgeId/documents',
        '/api/knowledge',
        '/api/knowledge/search',
        '/api/knowledge/:knowledgeId',
        '/api/knowledge/:knowledgeId/documents',
        '/api/skills',
        '/api/skills/:skillId',
        '/api/skills/import',
        '/api/agents',
        '/api/agents/:agentId',
        '/api/settings',
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
