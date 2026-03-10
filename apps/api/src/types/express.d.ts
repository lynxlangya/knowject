import type { AuthenticatedRequestUser } from '@modules/auth/auth.types.js';

export {};

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      authUser?: AuthenticatedRequestUser;
    }
  }
}
