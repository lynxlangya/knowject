import argon2 from 'argon2';
import type { WithId } from 'mongodb';
import type { AppEnv } from '@config/env.js';
import { AppError } from '@lib/app-error.js';
import { signAccessToken, verifyAccessToken } from './auth.jwt.js';
import {
  AuthRepository,
  isDuplicateUsernameError,
} from './auth.repository.js';
import type {
  AccessTokenPayload,
  AuthSuccessResponse,
  AuthUserDocument,
  AuthenticatedRequestUser,
  LoginInput,
  RegisterInput,
  SearchUsersInput,
  SearchUsersResult,
} from './auth.types.js';

export interface AuthService {
  register(input: RegisterInput): Promise<AuthSuccessResponse>;
  login(input: LoginInput): Promise<AuthSuccessResponse>;
  searchUsers(input: SearchUsersInput): Promise<SearchUsersResult>;
  verifyAccessToken(token: string): Promise<AuthenticatedRequestUser>;
}

const createValidationError = (
  message: string,
  fields: Record<string, string>,
): AppError => {
  return new AppError({
    statusCode: 400,
    code: 'VALIDATION_ERROR',
    message,
    details: {
      fields,
    },
  });
};

const createUsernameConflictError = (cause?: unknown): AppError => {
  return new AppError({
    statusCode: 409,
    code: 'AUTH_USERNAME_CONFLICT',
    message: '用户名已存在',
    details: {
      fields: {
        username: '用户名已存在',
      },
    },
    cause,
  });
};

const createInvalidCredentialsError = (): AppError => {
  return new AppError({
    statusCode: 401,
    code: 'AUTH_INVALID_CREDENTIALS',
    message: '用户名或密码错误',
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

const validatePassword = (password: string | undefined): string => {
  if (!password) {
    throw createValidationError('请输入密码', {
      password: '请输入密码',
    });
  }

  if (password.length < 8) {
    throw createValidationError('密码至少需要 8 位', {
      password: '密码至少需要 8 位',
    });
  }

  return password;
};

const toAuthResponse = async (
  env: AppEnv,
  user: WithId<AuthUserDocument>,
): Promise<AuthSuccessResponse> => {
  const tokenPayload: AccessTokenPayload = {
    sub: user._id.toHexString(),
    username: user.username,
  };

  const token = await signAccessToken(env, tokenPayload);

  return {
    token,
    user: {
      id: tokenPayload.sub,
      username: user.username,
      name: user.name,
    },
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
        throw createValidationError('请输入用户名', {
          username: '请输入用户名',
        });
      }

      if (!name) {
        throw createValidationError('请输入显示名称', {
          name: '请输入显示名称',
        });
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

      try {
        const user = await repository.createUser({
          username,
          name,
          passwordHash,
        });

        return toAuthResponse(env, user);
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
        throw createValidationError('请输入用户名', {
          username: '请输入用户名',
        });
      }

      if (!password) {
        throw createValidationError('请输入密码', {
          password: '请输入密码',
        });
      }

      const user = await repository.findByUsername(username);
      if (!user) {
        throw createInvalidCredentialsError();
      }

      const isPasswordValid = await argon2.verify(user.passwordHash, password);
      if (!isPasswordValid) {
        throw createInvalidCredentialsError();
      }

      return toAuthResponse(env, user);
    },

    searchUsers: async (input) => {
      const query = normalizeSearchQuery(input.query);
      const limit = normalizeSearchLimit(input.limit);
      const items = await repository.searchProfiles(query, limit);

      return {
        total: items.length,
        items,
      };
    },

    verifyAccessToken: async (token) => {
      const payload = await verifyAccessToken(env, token);

      return {
        id: payload.sub,
        username: payload.username,
      };
    },
  };
};
