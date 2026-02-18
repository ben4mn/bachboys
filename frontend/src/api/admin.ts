import { apiClient } from './client';
import type { Event, User, Payment, PaymentStatus } from '../types';

// Dashboard
export interface DashboardStats {
  users: { total: number; confirmed: number };
  events: { total: number; upcoming: number };
  payments: { total_collected: number; pending_count: number; total_owed: number };
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const response = await apiClient.get<DashboardStats>('/admin/dashboard');
  return response.data;
}

// Events
export interface EventInput {
  title: string;
  description?: string;
  location?: string;
  location_url?: string;
  event_url?: string;
  start_time: string;
  end_time?: string;
  is_mandatory: boolean;
  total_cost: number;
  split_type: 'even' | 'custom' | 'fixed';
  exclude_groom?: boolean;
  category?: string;
  image_url?: string;
  notes?: string;
}

export async function createEvent(data: EventInput): Promise<Event> {
  const response = await apiClient.post<{ event: Event }>('/admin/events', data);
  return response.data.event;
}

export async function updateEvent(id: string, data: EventInput): Promise<Event> {
  const response = await apiClient.put<{ event: Event }>(`/admin/events/${id}`, data);
  return response.data.event;
}

export async function deleteEvent(id: string): Promise<void> {
  await apiClient.delete(`/admin/events/${id}`);
}

// Cost Splits
export interface CostSplit {
  user_id: string;
  amount: number;
  notes?: string;
}

export interface EventCost extends CostSplit {
  id: string;
  event_id: string;
  display_name?: string;
}

export async function setEventCosts(eventId: string, costs: CostSplit[]): Promise<EventCost[]> {
  const response = await apiClient.put<{ costs: EventCost[] }>(`/admin/events/${eventId}/costs`, { costs });
  return response.data.costs;
}

export async function calculateEvenSplit(eventId: string): Promise<EventCost[]> {
  const response = await apiClient.post<{ costs: EventCost[] }>(`/admin/events/${eventId}/costs/calculate`);
  return response.data.costs;
}

// Users
export interface CreateUserInput {
  username: string;
  email: string;
  password: string;
  display_name: string;
}

export async function createUser(data: CreateUserInput): Promise<User> {
  const response = await apiClient.post<{ user: User }>('/admin/users', data);
  return response.data.user;
}

export async function deleteUser(id: string): Promise<void> {
  await apiClient.delete(`/admin/users/${id}`);
}

export async function setUserAdmin(id: string, isAdmin: boolean): Promise<User> {
  const response = await apiClient.put<{ user: User }>(`/admin/users/${id}/admin`, { is_admin: isAdmin });
  return response.data.user;
}

export async function setUserGroom(id: string, isGroom: boolean): Promise<User> {
  const response = await apiClient.put<{ user: User }>(`/admin/users/${id}/groom`, { is_groom: isGroom });
  return response.data.user;
}

// Guest List
export interface UnclaimedGuest {
  id: string;
  full_name: string;
}

export async function getUnclaimedGuests(): Promise<UnclaimedGuest[]> {
  const response = await apiClient.get<{ unclaimed: UnclaimedGuest[] }>('/admin/guest-list/unclaimed');
  return response.data.unclaimed;
}

// Payments
export interface AdminPayment extends Payment {
  user_display_name: string;
  event_title?: string;
}

export async function getAllPayments(): Promise<AdminPayment[]> {
  const response = await apiClient.get<{ payments: AdminPayment[] }>('/admin/payments');
  return response.data.payments;
}

export interface UserBalance {
  user_id: string;
  display_name: string;
  total_owed: number;
  total_paid: number;
  balance_remaining: number;
}

export async function getAllBalances(): Promise<UserBalance[]> {
  const response = await apiClient.get<{ balances: UserBalance[] }>('/admin/balances');
  return response.data.balances;
}

export async function updatePaymentStatus(id: string, status: PaymentStatus): Promise<Payment> {
  const response = await apiClient.put<{ payment: Payment }>(`/admin/payments/${id}`, { status });
  return response.data.payment;
}
