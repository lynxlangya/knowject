import { Router, type NextFunction, type Request, type Response } from 'express';
import { asyncHandler } from '@lib/async-handler.js';
import type { RequestHandler } from 'express';
import { sendCreated, sendSuccess } from '@lib/api-response.js';
import { getRequiredAuthUser } from '@lib/request-auth.js';
import type { ProjectsService } from './projects.service.js';
import type {
  CreateProjectConversationInput,
  CreateProjectConversationMessageInput,
  CreateProjectInput,
  UpdateProjectConversationMessageMetadataInput,
  UpdateProjectConversationInput,
  UpdateProjectInput,
} from './projects.types.js';

const getRequiredProjectId = (request: Request): string => {
  const projectId = request.params.projectId;

  return Array.isArray(projectId) ? projectId[0] ?? '' : projectId;
};

const getRequiredConversationId = (request: Request): string => {
  const conversationId = request.params.conversationId;

  return Array.isArray(conversationId)
    ? conversationId[0] ?? ''
    : conversationId ?? '';
};

const getRequiredMessageId = (request: Request): string => {
  const messageId = request.params.messageId;

  return Array.isArray(messageId) ? messageId[0] ?? '' : messageId ?? '';
};

const waitForSseDrain = (response: Response): Promise<void> => {
  if (response.writableEnded || response.destroyed) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      response.off('drain', handleDrain);
      response.off('close', handleClose);
      response.off('error', handleError);
    };
    const handleDrain = () => {
      cleanup();
      resolve();
    };
    const handleClose = () => {
      cleanup();
      resolve();
    };
    const handleError = (error: Error) => {
      cleanup();
      reject(error);
    };

    response.on('drain', handleDrain);
    response.on('close', handleClose);
    response.on('error', handleError);

    if (response.writableEnded || response.destroyed) {
      cleanup();
      resolve();
    }
  });
};

export const writeSseChunk = async (
  response: Response,
  chunk: string,
): Promise<void> => {
  if (response.writableEnded || response.destroyed) {
    return;
  }

  if (!response.write(chunk)) {
    await waitForSseDrain(response);
  }
};

export const createProjectsRouter = (
  projectsService: ProjectsService,
  requireAuth: RequestHandler,
): Router => {
  const projectsRouter = Router();

  projectsRouter.use(requireAuth);

  projectsRouter.get(
    '/',
    asyncHandler(async (req, res) => {
      const result = await projectsService.listProjects({
        actor: getRequiredAuthUser(req),
        locale: req.locale,
      });

      sendSuccess(res, result);
    }),
  );

  projectsRouter.post(
    '/',
    asyncHandler(async (req, res) => {
      const project = await projectsService.createProject(
        {
          actor: getRequiredAuthUser(req),
          locale: req.locale,
        },
        req.body as CreateProjectInput,
      );

      sendCreated(res, {
        project,
      });
    }),
  );

  projectsRouter.get(
    '/:projectId/conversations',
    asyncHandler(async (req, res) => {
      const result = await projectsService.listProjectConversations(
        {
          actor: getRequiredAuthUser(req),
          locale: req.locale,
        },
        getRequiredProjectId(req),
      );

      sendSuccess(res, result);
    }),
  );

  projectsRouter.post(
    '/:projectId/conversations',
    asyncHandler(async (req, res) => {
      const result = await projectsService.createProjectConversation(
        {
          actor: getRequiredAuthUser(req),
          locale: req.locale,
        },
        getRequiredProjectId(req),
        req.body as CreateProjectConversationInput,
      );

      sendCreated(res, result);
    }),
  );

  projectsRouter.get(
    '/:projectId/conversations/:conversationId',
    asyncHandler(async (req, res) => {
      const result = await projectsService.getProjectConversationDetail(
        {
          actor: getRequiredAuthUser(req),
          locale: req.locale,
        },
        getRequiredProjectId(req),
        getRequiredConversationId(req),
      );

      sendSuccess(res, result);
    }),
  );

  projectsRouter.patch(
    '/:projectId/conversations/:conversationId',
    asyncHandler(async (req, res) => {
      const result = await projectsService.updateProjectConversation(
        {
          actor: getRequiredAuthUser(req),
          locale: req.locale,
        },
        getRequiredProjectId(req),
        getRequiredConversationId(req),
        req.body as UpdateProjectConversationInput,
      );

      sendSuccess(res, result);
    }),
  );

  projectsRouter.patch(
    '/:projectId/conversations/:conversationId/messages/:messageId',
    asyncHandler(async (req, res) => {
      const result = await projectsService.updateProjectConversationMessageMetadata(
        {
          actor: getRequiredAuthUser(req),
          locale: req.locale,
        },
        getRequiredProjectId(req),
        getRequiredConversationId(req),
        getRequiredMessageId(req),
        req.body as UpdateProjectConversationMessageMetadataInput,
      );

      sendSuccess(res, result);
    }),
  );

  projectsRouter.delete(
    '/:projectId/conversations/:conversationId',
    asyncHandler(async (req, res) => {
      await projectsService.deleteProjectConversation(
        {
          actor: getRequiredAuthUser(req),
          locale: req.locale,
        },
        getRequiredProjectId(req),
        getRequiredConversationId(req),
      );

      sendSuccess(res, null);
    }),
  );

  projectsRouter.post(
    '/:projectId/conversations/:conversationId/messages',
    asyncHandler(async (req, res) => {
      const result = await projectsService.createProjectConversationMessage(
        {
          actor: getRequiredAuthUser(req),
          locale: req.locale,
        },
        getRequiredProjectId(req),
        getRequiredConversationId(req),
        req.body as CreateProjectConversationMessageInput,
      );

      sendCreated(res, result);
    }),
  );

  projectsRouter.post(
    '/:projectId/conversations/:conversationId/messages/stream',
    async (
      req: Request,
      res: Response,
      next: NextFunction,
    ): Promise<void> => {
      const abortController = new AbortController();
      let streamStarted = false;
      const handleClientDisconnect = () => {
        if (!res.writableEnded && !abortController.signal.aborted) {
          abortController.abort();
        }
      };
      const startStream = (): void => {
        if (streamStarted || res.headersSent) {
          return;
        }

        res.status(200);
        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders();
        streamStarted = true;
      };
      const writeEvent = async (event: unknown): Promise<void> => {
        if (abortController.signal.aborted) {
          return;
        }

        startStream();
        await writeSseChunk(res, `data: ${JSON.stringify(event)}\n\n`);
      };

      req.on('close', handleClientDisconnect);

      try {
        await projectsService.streamProjectConversationMessage(
          {
            actor: getRequiredAuthUser(req),
            locale: req.locale,
          },
          getRequiredProjectId(req),
          getRequiredConversationId(req),
          req.body as CreateProjectConversationMessageInput,
          {
            signal: abortController.signal,
            onEvent: writeEvent,
          },
        );
      } catch (error) {
        req.off('close', handleClientDisconnect);

        if (!streamStarted && !abortController.signal.aborted) {
          next(error);
          return;
        }

        if (!res.writableEnded && !res.destroyed) {
          res.end();
        }

        return;
      }

      req.off('close', handleClientDisconnect);

      if (!abortController.signal.aborted && !res.writableEnded && !res.destroyed) {
        res.end();
      }
    },
  );

  projectsRouter.patch(
    '/:projectId',
    asyncHandler(async (req, res) => {
      const project = await projectsService.updateProject(
        {
          actor: getRequiredAuthUser(req),
          locale: req.locale,
        },
        getRequiredProjectId(req),
        req.body as UpdateProjectInput,
      );

      sendSuccess(res, {
        project,
      });
    }),
  );

  projectsRouter.delete(
    '/:projectId',
    asyncHandler(async (req, res) => {
      await projectsService.deleteProject(
        {
          actor: getRequiredAuthUser(req),
          locale: req.locale,
        },
        getRequiredProjectId(req),
      );

      sendSuccess(res, null);
    }),
  );

  return projectsRouter;
};
