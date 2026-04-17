import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import type { RequestHandler } from "express";
import { AppError } from "@lib/app-error.js";
import { resolveLocalizedAppErrorMessage } from "@lib/app-error-message.js";
import { asyncHandler } from "@lib/async-handler.js";
import { DEFAULT_LOCALE } from "@lib/locale.js";
import { getMessage } from "@lib/locale.messages.js";
import { sendCreated, sendSuccess } from "@lib/api-response.js";
import { getRequiredAuthUser } from "@lib/request-auth.js";
import type { SkillsService } from "./skills.service.js";
import type {
  CreateSkillInput,
  ListSkillsInput,
  SkillCreationJobCreateInput,
  SkillCreationJobRefineInput,
  SkillCreationJobSaveInput,
  SkillCreationDraftGenerateInput,
  SkillCreationDraftRefineInput,
  SkillCreationDraftSaveInput,
  SkillAuthoringTurnInput,
  UpdateSkillInput,
} from "./skills.types.js";

const getRequiredSkillId = (request: Request): string => {
  const skillId = request.params.skillId;
  return Array.isArray(skillId) ? (skillId[0] ?? "") : skillId;
};

const waitForSseDrain = async (response: Response): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    const cleanup = (): void => {
      response.off("drain", handleDrain);
      response.off("close", handleClose);
      response.off("error", handleError);
    };

    const handleDrain = (): void => {
      cleanup();
      resolve();
    };

    const handleClose = (): void => {
      cleanup();
      resolve();
    };

    const handleError = (error: Error): void => {
      cleanup();
      reject(error);
    };

    response.on("drain", handleDrain);
    response.on("close", handleClose);
    response.on("error", handleError);

    if (response.writableEnded || response.destroyed) {
      cleanup();
      resolve();
    }
  });
};

const writeSseChunk = async (
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

export const createSkillsRouter = (
  skillsService: SkillsService,
  requireAuth: RequestHandler,
): Router => {
  const skillsRouter = Router();

  skillsRouter.use(requireAuth);

  skillsRouter.get(
    "/",
    asyncHandler(async (req, res) => {
      const result = await skillsService.listSkills(
        {
          actor: getRequiredAuthUser(req),
        },
        req.query as ListSkillsInput,
      );

      sendSuccess(res, result);
    }),
  );

  skillsRouter.get(
    "/:skillId",
    asyncHandler(async (req, res) => {
      const result = await skillsService.getSkillDetail(
        {
          actor: getRequiredAuthUser(req),
        },
        getRequiredSkillId(req),
      );

      sendSuccess(res, result);
    }),
  );

  skillsRouter.post(
    "/",
    asyncHandler(async (req, res) => {
      const result = await skillsService.createSkill(
        {
          actor: getRequiredAuthUser(req),
        },
        req.body as CreateSkillInput,
      );

      sendCreated(res, result);
    }),
  );

  skillsRouter.post(
    "/creation/jobs",
    asyncHandler(async (req, res) => {
      const result = await skillsService.createCreationJob(
        {
          actor: getRequiredAuthUser(req),
        },
        req.body as SkillCreationJobCreateInput,
      );

      sendCreated(res, result);
    }),
  );

  skillsRouter.get(
    "/creation/jobs",
    asyncHandler(async (req, res) => {
      const result = await skillsService.listCreationJobs({
        actor: getRequiredAuthUser(req),
      });

      sendSuccess(res, result);
    }),
  );

  skillsRouter.get(
    "/creation/jobs/:jobId",
    asyncHandler(async (req, res) => {
      const result = await skillsService.getCreationJob(
        {
          actor: getRequiredAuthUser(req),
        },
        Array.isArray(req.params.jobId) ? (req.params.jobId[0] ?? "") : req.params.jobId,
      );

      sendSuccess(res, result);
    }),
  );

  skillsRouter.post(
    "/creation/jobs/:jobId/refine",
    asyncHandler(async (req, res) => {
      const result = await skillsService.refineCreationJob(
        {
          actor: getRequiredAuthUser(req),
        },
        Array.isArray(req.params.jobId) ? (req.params.jobId[0] ?? "") : req.params.jobId,
        req.body as SkillCreationJobRefineInput,
      );

      sendSuccess(res, result);
    }),
  );

  skillsRouter.post(
    "/creation/jobs/:jobId/save",
    asyncHandler(async (req, res) => {
      const result = await skillsService.saveCreationJob(
        {
          actor: getRequiredAuthUser(req),
        },
        Array.isArray(req.params.jobId) ? (req.params.jobId[0] ?? "") : req.params.jobId,
        req.body as SkillCreationJobSaveInput,
      );

      sendCreated(res, result);
    }),
  );

  skillsRouter.post(
    "/creation/drafts/generate",
    asyncHandler(async (req, res) => {
      const result = await skillsService.generateCreationDraft(
        {
          actor: getRequiredAuthUser(req),
        },
        req.body as SkillCreationDraftGenerateInput,
      );

      sendSuccess(res, result);
    }),
  );

  skillsRouter.post(
    "/creation/drafts/refine",
    asyncHandler(async (req, res) => {
      const result = await skillsService.refineCreationDraft(
        {
          actor: getRequiredAuthUser(req),
        },
        req.body as SkillCreationDraftRefineInput,
      );

      sendSuccess(res, result);
    }),
  );

  skillsRouter.post(
    "/creation/drafts/save",
    asyncHandler(async (req, res) => {
      const result = await skillsService.saveCreationDraft(
        {
          actor: getRequiredAuthUser(req),
        },
        req.body as SkillCreationDraftSaveInput,
      );

      sendCreated(res, result);
    }),
  );

  skillsRouter.post(
    "/authoring/turns",
    asyncHandler(async (req, res) => {
      const result = await skillsService.runAuthoringTurn(
        {
          actor: getRequiredAuthUser(req),
        },
        req.body as SkillAuthoringTurnInput,
      );

      sendSuccess(res, result);
    }),
  );

  skillsRouter.post(
    "/authoring/turns/stream",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const abortController = new AbortController();
      let streamStarted = false;
      let sequence = 0;
      const handleClientDisconnect = () => {
        if (!abortController.signal.aborted) {
          abortController.abort();
        }
      };

      const startStream = (): void => {
        if (streamStarted || res.headersSent) {
          return;
        }

        res.status(200);
        res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache, no-transform");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("X-Accel-Buffering", "no");
        res.flushHeaders();
        streamStarted = true;
      };

      const emitEvent = async (
        event: Record<string, unknown>,
      ): Promise<void> => {
        if (res.writableEnded || res.destroyed) {
          return;
        }

        startStream();
        sequence += 1;
        await writeSseChunk(
          res,
          `data: ${JSON.stringify({
            version: "v1",
            sequence,
            ...event,
          })}\n\n`,
        );
      };

      req.on("close", handleClientDisconnect);

      try {
        if (abortController.signal.aborted) {
          return;
        }

        await emitEvent({
          type: "ack",
        });

        const result = await skillsService.runAuthoringTurn(
          {
            actor: getRequiredAuthUser(req),
          },
          req.body as SkillAuthoringTurnInput,
          {
            signal: abortController.signal,
          },
        );

        if (abortController.signal.aborted) {
          return;
        }

        await emitEvent({
          type: "done",
          turn: result,
        });
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }

        if (!streamStarted) {
          next(error);
          return;
        }

        const normalizedError =
          error instanceof AppError
            ? error
            : new AppError({
                statusCode: 500,
                code: "INTERNAL_SERVER_ERROR",
                message: getMessage("api.internalError", DEFAULT_LOCALE) ?? "",
                messageKey: "api.internalError",
                cause: error,
              });

        await emitEvent({
          type: "error",
          status: normalizedError.statusCode,
          code: normalizedError.code,
          message: resolveLocalizedAppErrorMessage(
            normalizedError,
            req.locale ?? DEFAULT_LOCALE,
          ),
          retryable: normalizedError.statusCode >= 500,
        });
      } finally {
        req.off("close", handleClientDisconnect);

        if (
          !abortController.signal.aborted &&
          !res.writableEnded &&
          !res.destroyed
        ) {
          res.end();
        }
      }
    },
  );

  skillsRouter.patch(
    "/:skillId",
    asyncHandler(async (req, res) => {
      const result = await skillsService.updateSkill(
        {
          actor: getRequiredAuthUser(req),
        },
        getRequiredSkillId(req),
        req.body as UpdateSkillInput,
      );

      sendSuccess(res, result);
    }),
  );

  skillsRouter.delete(
    "/:skillId",
    asyncHandler(async (req, res) => {
      await skillsService.deleteSkill(
        {
          actor: getRequiredAuthUser(req),
        },
        getRequiredSkillId(req),
      );

      sendSuccess(res, null);
    }),
  );

  return skillsRouter;
};
