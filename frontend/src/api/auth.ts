import { apiClient } from './client';
import type { User, LoginCredentials, RegisterData, AuthTokens } from '../types';

interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
  return response.data;
}

export async function register(data: RegisterData): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>('/auth/register', data);
  return response.data;
}

export async function logout(refreshToken: string): Promise<void> {
  await apiClient.post('/auth/logout', { refreshToken });
}

export async function refreshTokens(refreshToken: string): Promise<AuthTokens> {
  const response = await apiClient.post<AuthTokens>('/auth/refresh', { refreshToken });
  return response.data;
}

export async function getCurrentUser(): Promise<User> {
  const response = await apiClient.get<{ user: User }>('/auth/me');
  return response.data.user;
}

export async function verifyGuestName(realName: string): Promise<{ matched: boolean; guest_name?: string }> {
  const response = await apiClient.post<{ matched: boolean; guest_name?: string }>('/auth/verify-name', { real_name: realName });
  return response.data;
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  const response = await apiClient.post<{ message: string }>('/auth/forgot-password', { email });
  return response.data;
}

export async function resetPassword(token: string, password: string): Promise<{ message: string }> {
  const response = await apiClient.post<{ message: string }>('/auth/reset-password', { token, password });
  return response.data;
}
