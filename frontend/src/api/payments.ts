import { apiClient } from './client';
import type { Payment, PaymentSummary, CostBreakdown, PaymentMethod } from '../types';

interface PaymentsResponse {
  payments: Payment[];
}

interface SummaryResponse {
  summary: PaymentSummary;
  breakdown: CostBreakdown[];
}

export async function getPayments(): Promise<Payment[]> {
  const response = await apiClient.get<PaymentsResponse>('/payments');
  return response.data.payments;
}

export async function getPaymentSummary(): Promise<SummaryResponse> {
  const response = await apiClient.get<SummaryResponse>('/payments/summary');
  return response.data;
}

export async function reportPayment(data: {
  event_id?: string;
  amount: number;
  payment_method: PaymentMethod;
  payment_reference?: string;
  notes?: string;
}): Promise<Payment> {
  const response = await apiClient.post<{ payment: Payment }>('/payments', data);
  return response.data.payment;
}
