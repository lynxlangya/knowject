import { Router } from 'express';
import type { RequestHandler } from 'express';
import { asyncHandler } from '@lib/async-handler.js';
import { sendCreated, sendSuccess } from '@lib/api-response.js';
import { getRequiredAuthUser } from '@lib/request-auth.js';
import type { AuthService } from './auth.service.js';
import type {
  LoginInput,
  RegisterInput,
  SearchUsersInput,
} from './auth.types.js';

export const createAuthRouter = (
  authService: AuthService,
  requireAuth: RequestHandler,
): Router => {
  const authRouter = Router();

  authRouter.post(
    '/register',
    asyncHandler(async (req, res) => {
      const result = await authService.register(req.body as RegisterInput);

      sendCreated(res, result);
    }),
  );

  authRouter.post(
    '/login',
    asyncHandler(async (req, res) => {
      const result = await authService.login(req.body as LoginInput);

      sendSuccess(res, result);
    }),
  );

  authRouter.get(
    '/users',
    requireAuth,
    asyncHandler(async (req, res) => {
      getRequiredAuthUser(req);

      const result = await authService.searchUsers(req.query as SearchUsersInput);
      sendSuccess(res, result);
    }),
  );

  return authRouter;
};
