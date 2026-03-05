import { client } from './client';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface UserProfile {
  id: string;
  username: string;
  name: string;
}

export interface LoginResponse {
  token: string;
  user: UserProfile;
}

export const login = async (payload: LoginRequest): Promise<LoginResponse> => {
  const response = await client.post<LoginResponse>('/auth/login', payload);
  return response.data;
};
