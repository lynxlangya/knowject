import type { Request } from 'express';
import type { AuthenticatedRequestUser } from '@modules/auth/auth.types.js';

export const getRequiredAuthUser = (request: Request): AuthenticatedRequestUser => {
  if (!request.authUser) {
    throw new Error('Authenticated user is missing from request context');
  }

  return request.authUser;
};
