import { apiClient } from './client';
import type { User, TripStatus } from '../types';

interface UsersResponse {
  users: User[];
}

export async function getUsers(): Promise<User[]> {
  const response = await apiClient.get<UsersResponse>('/users');
  return response.data.users;
}

export async function getUser(id: string): Promise<User> {
  const response = await apiClient.get<{ user: User }>(`/users/${id}`);
  return response.data.user;
}

export async function updateProfile(
  id: string,
  data: Partial<Pick<User, 'display_name' | 'bio' | 'phone' | 'venmo_handle'>>
): Promise<User> {
  const response = await apiClient.put<{ user: User }>(`/users/${id}`, data);
  return response.data.user;
}

export async function updateTripStatus(id: string, status: TripStatus): Promise<User> {
  const response = await apiClient.put<{ user: User }>(`/users/${id}/trip-status`, { status });
  return response.data.user;
}
