import { Router, type Request } from 'express';
import type { RequestHandler } from 'express';
import { asyncHandler } from '@lib/async-handler.js';
import type { AuthService } from './auth.service.js';
import type {
  LoginInput,
  RegisterInput,
  SearchUsersInput,
} from './auth.types.js';
import type { AuthenticatedRequestUser } from './auth.types.js';

const getRequiredAuthUser = (request: Request): AuthenticatedRequestUser => {
  if (!request.authUser) {
    throw new Error('Authenticated user is missing from request context');
  }

  return request.authUser;
};

export const createAuthRouter = (
  authService: AuthService,
  requireAuth: RequestHandler,
): Router => {
  const authRouter = Router();

  authRouter.post(
    '/register',
    asyncHandler(async (req, res) => {
      const result = await authService.register(req.body as RegisterInput);

      res.json(result);
    }),
  );

  authRouter.post(
    '/login',
    asyncHandler(async (req, res) => {
      const result = await authService.login(req.body as LoginInput);

      res.json(result);
    }),
  );

  authRouter.get(
    '/users',
    requireAuth,
    asyncHandler(async (req, res) => {
      getRequiredAuthUser(req);

      const result = await authService.searchUsers(req.query as SearchUsersInput);
      res.json(result);
    }),
  );

  return authRouter;
};
