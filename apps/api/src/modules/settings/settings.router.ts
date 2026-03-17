import { Router } from 'express';
import type { RequestHandler } from 'express';
import { asyncHandler } from '@lib/async-handler.js';
import { sendSuccess } from '@lib/api-response.js';
import { getRequiredAuthUser } from '@lib/request-auth.js';
import type { SettingsService } from './settings.service.js';
import type {
  TestIndexingConnectionInput,
  TestSettingsConnectionInput,
  UpdateEmbeddingSettingsInput,
  UpdateIndexingSettingsInput,
  UpdateLlmSettingsInput,
  UpdateWorkspaceSettingsInput,
} from './settings.types.js';

export const createSettingsRouter = (
  settingsService: SettingsService,
  requireAuth: RequestHandler,
): Router => {
  const settingsRouter = Router();

  settingsRouter.use(requireAuth);

  settingsRouter.get(
    '/',
    asyncHandler(async (req, res) => {
      const result = await settingsService.getSettings({
        actor: getRequiredAuthUser(req),
      });

      sendSuccess(res, result);
    }),
  );

  settingsRouter.patch(
    '/workspace',
    asyncHandler(async (req, res) => {
      const result = await settingsService.updateWorkspace(
        {
          actor: getRequiredAuthUser(req),
        },
        req.body as UpdateWorkspaceSettingsInput,
      );

      sendSuccess(res, result);
    }),
  );

  settingsRouter.patch(
    '/embedding',
    asyncHandler(async (req, res) => {
      const result = await settingsService.updateEmbedding(
        {
          actor: getRequiredAuthUser(req),
        },
        req.body as UpdateEmbeddingSettingsInput,
      );

      sendSuccess(res, result);
    }),
  );

  settingsRouter.patch(
    '/llm',
    asyncHandler(async (req, res) => {
      const result = await settingsService.updateLlm(
        {
          actor: getRequiredAuthUser(req),
        },
        req.body as UpdateLlmSettingsInput,
      );

      sendSuccess(res, result);
    }),
  );

  settingsRouter.patch(
    '/indexing',
    asyncHandler(async (req, res) => {
      const result = await settingsService.updateIndexing(
        {
          actor: getRequiredAuthUser(req),
        },
        req.body as UpdateIndexingSettingsInput,
      );

      sendSuccess(res, result);
    }),
  );

  settingsRouter.post(
    '/embedding/test',
    asyncHandler(async (req, res) => {
      const result = await settingsService.testEmbedding(
        {
          actor: getRequiredAuthUser(req),
        },
        req.body as TestSettingsConnectionInput,
      );

      sendSuccess(res, result);
    }),
  );

  settingsRouter.post(
    '/indexing/test',
    asyncHandler(async (req, res) => {
      const result = await settingsService.testIndexing(
        {
          actor: getRequiredAuthUser(req),
        },
        req.body as TestIndexingConnectionInput,
      );

      sendSuccess(res, result);
    }),
  );

  settingsRouter.post(
    '/llm/test',
    asyncHandler(async (req, res) => {
      const result = await settingsService.testLlm(
        {
          actor: getRequiredAuthUser(req),
        },
        req.body as TestSettingsConnectionInput,
      );

      sendSuccess(res, result);
    }),
  );

  return settingsRouter;
};
