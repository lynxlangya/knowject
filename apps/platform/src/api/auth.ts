import {
  unwrapApiData,
  type ApiEnvelope,
} from '@knowject/request';
import type { SupportedLocale } from '@app/providers/locale.storage';
import { client, publicClient } from './client';

export interface LoginRequest {
  username: string;
  password: string;
  locale: SupportedLocale;
}

export interface RegisterRequest {
  username: string;
  password: string;
  name: string;
  locale: SupportedLocale;
}

export interface UserProfile {
  id: string;
  username: string;
  name: string;
  locale: SupportedLocale;
}

export interface AuthSuccessResponse {
  token: string;
  user: UserProfile;
}

export interface UpdateAuthPreferencesRequest {
  locale: SupportedLocale;
}

export interface UpdateAuthPreferencesResponse {
  user: UserProfile;
}

export const register = async (payload: RegisterRequest): Promise<AuthSuccessResponse> => {
  const response = await publicClient.post<ApiEnvelope<AuthSuccessResponse>>('/auth/register', payload);
  return unwrapApiData(response.data);
};

export const login = async (payload: LoginRequest): Promise<AuthSuccessResponse> => {
  const response = await publicClient.post<ApiEnvelope<AuthSuccessResponse>>('/auth/login', payload);
  return unwrapApiData(response.data);
};

export const updateAuthPreferences = async (
  payload: UpdateAuthPreferencesRequest,
): Promise<UpdateAuthPreferencesResponse> => {
  const response = await client.patch<ApiEnvelope<UpdateAuthPreferencesResponse>>(
    '/auth/me/preferences',
    payload,
  );
  return unwrapApiData(response.data);
};
