import {
  unwrapApiData,
  type ApiEnvelope,
} from '@knowject/request';
import { publicClient } from './client';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  name: string;
}

export interface UserProfile {
  id: string;
  username: string;
  name: string;
}

export interface AuthSuccessResponse {
  token: string;
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
