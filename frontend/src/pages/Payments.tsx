import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { DollarSign, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { Header } from '../components/shared/Header';
import { Card } from '../components/shared/Card';
import { Badge } from '../components/shared/Badge';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { getPaymentSummary, getPayments } from '../api/payments';
import type { Payment, PaymentStatus } from '../types';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  switch (status) {
    case 'confirmed':
      return <Badge variant="success">Confirmed</Badge>;
    case 'pending':
      return <Badge variant="warning">Pending</Badge>;
    case 'rejected':
      return <Badge variant="error">Rejected</Badge>;
    default:
      return null;
  }
}

function PaymentItem({ payment }: { payment: Payment }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="flex-1">
        <div className="font-medium text-gray-900">
          {payment.event_title || 'General Payment'}
        </div>
        <div className="text-sm text-gray-500 flex items-center gap-2">
          <span className="capitalize">{payment.payment_method}</span>
          {payment.paid_at && (
            <>
              <span>-</span>
              <span>{format(parseISO(payment.paid_at), 'MMM d')}</span>
            </>
          )}
        </div>
      </div>
      <div className="text-right">
        <div className="font-semibold text-gray-900">{formatCurrency(payment.amount)}</div>
        <PaymentStatusBadge status={payment.status} />
      </div>
    </div>
  );
}

export default function Payments() {
  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['payment-summary'],
    queryFn: getPaymentSummary,
  });

  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: getPayments,
  });

  const isLoading = summaryLoading || paymentsLoading;
  const summary = summaryData?.summary;
  const breakdown = summaryData?.breakdown || [];

  return (
    <>
      <Header title="Payments" />

      <main className="px-4 py-4 max-w-lg mx-auto space-y-4">
        {isLoading && (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {!isLoading && summary && (
          <>
            {/* Balance Card */}
            <Card className="bg-gradient-to-br from-primary-600 to-primary-700 text-white">
              <div className="text-center">
                <p className="text-primary-100 text-sm font-medium">Balance Remaining</p>
                <p className="text-4xl font-bold mt-1">
                  {formatCurrency(summary.balance_remaining)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="bg-white/10 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-primary-100 text-sm">
                    <TrendingUp className="w-4 h-4" />
                    Total Owed
                  </div>
                  <p className="text-xl font-semibold mt-1">{formatCurrency(summary.total_owed)}</p>
                </div>
                <div className="bg-white/10 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-primary-100 text-sm">
                    <TrendingDown className="w-4 h-4" />
                    Total Paid
                  </div>
                  <p className="text-xl font-semibold mt-1">{formatCurrency(summary.total_paid)}</p>
                </div>
              </div>
            </Card>

            {/* Cost Breakdown */}
            {breakdown.length > 0 && (
              <Card>
                <h2 className="font-semibold text-gray-900 mb-3">Cost Breakdown</h2>
                <div className="space-y-3">
                  {breakdown.map((item) => (
                    <div key={item.event_id} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">{item.event_title}</div>
                        <div className="text-sm text-gray-500">
                          {item.notes || format(parseISO(item.event_date), 'MMM d')}
                        </div>
                      </div>
                      <div className="font-semibold">{formatCurrency(item.amount)}</div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Payment History */}
            <Card>
              <h2 className="font-semibold text-gray-900 mb-3">Payment History</h2>
              {payments && payments.length > 0 ? (
                <div>
                  {payments.map((payment) => (
                    <PaymentItem key={payment.id} payment={payment} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <DollarSign className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p>No payments recorded yet</p>
                </div>
              )}
            </Card>

            {/* Payment Instructions */}
            <Card className="bg-blue-50 border-blue-100">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-blue-900">How to Pay</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    Send payments via Venmo, Zelle, or cash to the organizer.
                    Payments will be confirmed once received.
                  </p>
                </div>
              </div>
            </Card>
          </>
        )}
      </main>
    </>
  );
}
