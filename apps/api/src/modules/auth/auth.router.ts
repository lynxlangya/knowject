import { Router } from 'express';
import { asyncHandler } from '@lib/async-handler.js';
import type { AuthService } from './auth.service.js';
import type { LoginInput, RegisterInput } from './auth.types.js';

export const createAuthRouter = (authService: AuthService): Router => {
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

  return authRouter;
};
