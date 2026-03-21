import type { AuthenticatedRequestUser } from '@modules/auth/auth.types.js';
import type { SupportedLocale } from '@lib/locale.js';

export {};

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      locale: SupportedLocale;
      authUser?: AuthenticatedRequestUser;
    }
  }
}
