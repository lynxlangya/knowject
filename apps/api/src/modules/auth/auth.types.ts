import type { ObjectId } from 'mongodb';

export interface AuthUserDocument {
  _id?: ObjectId;
  username: string;
  name: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthUserProfile {
  id: string;
  username: string;
  name: string;
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
}

export interface LoginInput {
  username?: string;
  password?: string;
}

export interface AccessTokenPayload {
  sub: string;
  username: string;
}
