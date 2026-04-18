import argon2 from 'argon2';
import type { WithId } from 'mongodb';
import type { AppEnv } from '@config/env.js';
import { AppError } from '@lib/app-error.js';
import { getFallbackMessage } from '@lib/locale.messages.js';
import {
  createRequiredFieldError,
  createValidationAppError,
  readOptionalStringField,
} from '@lib/validation.js';
import { signAccessToken, verifyAccessToken } from './auth.jwt.js';
import {
  AuthRepository,
  isDuplicateUsernameError,
} from './auth.repository.js';
import type {
  AccessTokenPayload,
  AuthSessionUser,
  AuthSuccessResponse,
  AuthUserDocument,
  AuthenticatedRequestUser,
  AuthUserProfile,
  LoginInput,
  RegisterInput,
  SearchUsersInput,
  SearchUsersResult,
  SupportedLocale,
  UpdateAuthPreferencesInput,
} from './auth.types.js';

export interface AuthService {
  register(input: RegisterInput): Promise<AuthSuccessResponse>;
  login(input: LoginInput): Promise<AuthSuccessResponse>;
  searchUsers(input: SearchUsersInput): Promise<SearchUsersResult>;
  verifyAccessToken(token: string): Promise<AuthenticatedRequestUser>;
  updatePreferences(
    userId: string,
    input: UpdateAuthPreferencesInput,
  ): Promise<AuthSessionUser>;
}

const createUsernameConflictError = (cause?: unknown): AppError => {
  return new AppError({
    statusCode: 409,
    code: 'AUTH_USERNAME_CONFLICT',
    message: getFallbackMessage('auth.usernameConflict'),
    messageKey: 'auth.usernameConflict',
    details: {
      fields: {
        username: getFallbackMessage('auth.usernameConflict'),
      },
    },
    cause,
  });
};

const createInvalidCredentialsError = (): AppError => {
  return new AppError({
    statusCode: 401,
    code: 'AUTH_INVALID_CREDENTIALS',
    message: getFallbackMessage('auth.invalidCredentials'),
    messageKey: 'auth.invalidCredentials',
  });
};

const normalizeUsername = (value: string | undefined): string => {
  return value?.trim() ?? '';
};

const normalizeName = (value: string | undefined): string => {
  return value?.trim() ?? '';
};

const normalizeSearchQuery = (value: unknown): string => {
  return typeof value === 'string' ? value.trim() : '';
};

const normalizeSearchLimit = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.min(Math.max(Math.trunc(value), 1), 20);
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return Math.min(Math.max(parsed, 1), 20);
    }
  }

  return 10;
};

const SUPPORTED_LOCALES: SupportedLocale[] = ['en', 'zh-CN'];
const DEFAULT_LOCALE: SupportedLocale = 'en';

const readLocale = (
  value: unknown,
  { fallback, required }: { fallback?: SupportedLocale; required?: boolean } = {},
): SupportedLocale | undefined => {
  const normalized = readOptionalStringField(value, 'locale');

  if (!normalized) {
    if (required) {
      throw new AppError(createRequiredFieldError('locale'));
    }

    return fallback;
  }

  if (!SUPPORTED_LOCALES.includes(normalized as SupportedLocale)) {
    throw createValidationAppError(
      getFallbackMessage('auth.localeUnsupported'),
      {
        locale: getFallbackMessage('auth.localeUnsupported'),
      },
      'auth.localeUnsupported',
    );
  }

  return normalized as SupportedLocale;
};

const validatePassword = (password: string | undefined): string => {
  if (!password) {
    throw new AppError(createRequiredFieldError('password'));
  }

  if (password.length < 8) {
    throw createValidationAppError(
      getFallbackMessage('auth.password.minLength'),
      {
        password: getFallbackMessage('auth.password.minLength'),
      },
      'auth.password.minLength',
    );
  }

  return password;
};

const toAuthUserProfile = (
  user: Pick<AuthUserProfile, 'id' | 'username' | 'name'>,
): AuthUserProfile => {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
  };
};

const toAuthSessionUser = (
  user: WithId<AuthUserDocument>,
  localeOverride?: SupportedLocale,
): AuthSessionUser => {
  return {
    id: user._id.toHexString(),
    username: user.username,
    name: user.name,
    locale: localeOverride ?? user.preferences?.locale ?? DEFAULT_LOCALE,
  };
};

const toAuthResponse = async (
  env: AppEnv,
  user: AuthSessionUser,
): Promise<AuthSuccessResponse> => {
  const tokenPayload: AccessTokenPayload = {
    sub: user.id,
    username: user.username,
  };

  const token = await signAccessToken(env, tokenPayload);

  return {
    token,
    user,
  };
};

export const createAuthService = ({
  env,
  repository,
}: {
  env: AppEnv;
  repository: AuthRepository;
}): AuthService => {
  return {
    register: async (input) => {
      const username = normalizeUsername(input.username);
      const name = normalizeName(input.name);
      const password = validatePassword(input.password);

      if (!username) {
        throw new AppError(createRequiredFieldError('username'));
      }

      if (!name) {
        throw createValidationAppError(
          getFallbackMessage('auth.displayName.required'),
          {
            name: getFallbackMessage('auth.displayName.required'),
          },
          'auth.displayName.required',
        );
      }

      const existing = await repository.findByUsername(username);
      if (existing) {
        throw createUsernameConflictError();
      }

      const passwordHash = await argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: env.argon2.memoryCost,
        timeCost: env.argon2.timeCost,
        parallelism: env.argon2.parallelism,
      });
      const locale = readLocale(input.locale, { fallback: DEFAULT_LOCALE });

      try {
        const user = await repository.createUser({
          username,
          name,
          passwordHash,
          preferences: {
            locale,
          },
        });

        return toAuthResponse(env, toAuthSessionUser(user));
      } catch (error) {
        if (isDuplicateUsernameError(error)) {
          throw createUsernameConflictError(error);
        }

        throw error;
      }
    },

    login: async (input) => {
      const username = normalizeUsername(input.username);
      const password = input.password ?? '';

      if (!username) {
        throw new AppError(createRequiredFieldError('username'));
      }

      if (!password) {
        throw new AppError(createRequiredFieldError('password'));
      }

      const user = await repository.findByUsername(username);
      if (!user) {
        throw createInvalidCredentialsError();
      }

      const isPasswordValid = await argon2.verify(user.passwordHash, password);
      if (!isPasswordValid) {
        throw createInvalidCredentialsError();
      }

      if (!user.preferences?.locale) {
        const locale = readLocale(input.locale, { fallback: DEFAULT_LOCALE });
        const resolvedLocale = locale ?? DEFAULT_LOCALE;

        try {
          const updated = await repository.updatePreferences(user._id.toHexString(), {
            locale: resolvedLocale,
          });
          return toAuthResponse(env, updated);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Unknown locale backfill failure';
          console.warn(
            `[auth] locale backfill failed for user ${user._id.toHexString()}: ${message}`,
          );
          return toAuthResponse(env, toAuthSessionUser(user, resolvedLocale));
        }
      }

      return toAuthResponse(env, toAuthSessionUser(user));
    },

    searchUsers: async (input) => {
      const query = normalizeSearchQuery(input.query);
      const limit = normalizeSearchLimit(input.limit);

      if (!query) {
        return {
          total: 0,
          items: [],
        };
      }

      const items = await repository.searchProfiles(query, limit);

      return {
        total: items.length,
        items: items.map(toAuthUserProfile),
      };
    },

    verifyAccessToken: async (token) => {
      const payload = await verifyAccessToken(env, token);

      return {
        id: payload.sub,
        username: payload.username,
      };
    },

    updatePreferences: async (userId, input) => {
      const locale = readLocale(input.locale, { required: true });
      return repository.updatePreferences(userId, {
        locale: locale ?? DEFAULT_LOCALE,
      });
    },
  };
};
