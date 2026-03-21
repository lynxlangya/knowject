import type { ObjectId } from 'mongodb';

export type SupportedLocale = 'en' | 'zh-CN';

export interface AuthUserDocument {
  _id?: ObjectId;
  username: string;
  name: string;
  passwordHash: string;
  preferences?: {
    locale?: SupportedLocale;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthUserProfile {
  id: string;
  username: string;
  name: string;
  locale?: SupportedLocale;
}

export interface AuthSuccessResponse {
  token: string;
  user: AuthUserProfile;
}

export interface AuthenticatedRequestUser {
  id: string;
  username: string;
}

export interface RegisterInput {
  username?: string;
  password?: string;
  name?: string;
  locale?: SupportedLocale;
}

export interface LoginInput {
  username?: string;
  password?: string;
  locale?: SupportedLocale;
}

export interface SearchUsersInput {
  query?: unknown;
  limit?: unknown;
}

export interface SearchUsersResult {
  total: number;
  items: AuthUserProfile[];
}

export interface AccessTokenPayload {
  sub: string;
  username: string;
}

export interface UpdateAuthPreferencesInput {
  locale?: SupportedLocale;
}
