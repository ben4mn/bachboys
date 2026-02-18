import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { Check, X, Clock, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { Card } from '../../components/shared/Card';
import { Badge } from '../../components/shared/Badge';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import {
  getAllPayments,
  getAllBalances,
  updatePaymentStatus,
  type AdminPayment,
  type UserBalance,
} from '../../api/admin';
import type { PaymentStatus } from '../../types';

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
  }
}

function PaymentRow({
  payment,
  onConfirm,
  onReject,
  isPending,
}: {
  payment: AdminPayment;
  onConfirm: () => void;
  onReject: () => void;
  isPending: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 last:border-0">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium dark:text-white">{payment.user_display_name}</span>
          <PaymentStatusBadge status={payment.status} />
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {payment.event_title || 'General Payment'}
          {payment.payment_method && (
            <span className="text-gray-400 dark:text-gray-500 ml-2">via {payment.payment_method}</span>
          )}
        </div>
        {payment.paid_at && (
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {format(parseISO(payment.paid_at), 'MMM d, yyyy @ h:mm a')}
          </div>
        )}
        {payment.notes && (
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 italic">{payment.notes}</div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="font-semibold text-lg">{formatCurrency(payment.amount)}</div>
        </div>

        {payment.status === 'pending' && (
          <div className="flex gap-1">
            <button
              onClick={onConfirm}
              disabled={isPending}
              className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
              title="Confirm payment"
            >
              <Check className="w-5 h-5" />
            </button>
            <button
              onClick={onReject}
              disabled={isPending}
              className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
              title="Reject payment"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function BalanceCard({ balance }: { balance: UserBalance }) {
  const isOwed = balance.balance_remaining > 0;
  const isPaid = balance.balance_remaining <= 0 && balance.total_owed > 0;

  return (
    <div className="flex items-center justify-between p-3 border dark:border-gray-700 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-medium">
          {balance.display_name.charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="font-medium dark:text-white">{balance.display_name}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Paid: {formatCurrency(balance.total_paid)} / {formatCurrency(balance.total_owed)}
          </div>
        </div>
      </div>

      <div className="text-right">
        {isPaid ? (
          <Badge variant="success">Paid in Full</Badge>
        ) : isOwed ? (
          <div className="text-red-600 font-semibold">
            {formatCurrency(balance.balance_remaining)}
            <div className="text-xs font-normal">remaining</div>
          </div>
        ) : (
          <Badge variant="default">No charges</Badge>
        )}
      </div>
    </div>
  );
}

export default function AdminPayments() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'payments' | 'balances'>('payments');

  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['admin', 'payments'],
    queryFn: getAllPayments,
  });

  const { data: balances, isLoading: balancesLoading } = useQuery({
    queryKey: ['admin', 'balances'],
    queryFn: getAllBalances,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: PaymentStatus }) =>
      updatePaymentStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'payments'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'balances'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
  });

  const isLoading = paymentsLoading || balancesLoading;

  const pendingPayments = payments?.filter((p) => p.status === 'pending') || [];
  const confirmedPayments = payments?.filter((p) => p.status === 'confirmed') || [];
  const rejectedPayments = payments?.filter((p) => p.status === 'rejected') || [];

  // Summary stats
  const totalCollected = confirmedPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalPending = pendingPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalOwed = balances?.reduce((sum, b) => sum + b.total_owed, 0) || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payments</h1>
        <p className="text-gray-600 dark:text-gray-400">Track and confirm payments</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Collected</div>
              <div className="text-xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(totalCollected)}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Pending Review</div>
              <div className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
                {formatCurrency(totalPending)}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Outstanding</div>
              <div className="text-xl font-bold text-red-600 dark:text-red-400">
                {formatCurrency(totalOwed - totalCollected)}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b dark:border-gray-700">
        <button
          onClick={() => setTab('payments')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            tab === 'payments'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Payments
          {pendingPayments.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs rounded-full">
              {pendingPayments.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('balances')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            tab === 'balances'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Balances
        </button>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {!isLoading && tab === 'payments' && (
        <div className="space-y-6">
          {/* Pending Payments */}
          {pendingPayments.length > 0 && (
            <Card>
              <h2 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                Pending Confirmation ({pendingPayments.length})
              </h2>
              <div className="-mx-4">
                {pendingPayments.map((payment) => (
                  <PaymentRow
                    key={payment.id}
                    payment={payment}
                    onConfirm={() =>
                      statusMutation.mutate({ id: payment.id, status: 'confirmed' })
                    }
                    onReject={() =>
                      statusMutation.mutate({ id: payment.id, status: 'rejected' })
                    }
                    isPending={statusMutation.isPending}
                  />
                ))}
              </div>
            </Card>
          )}

          {pendingPayments.length === 0 && (
            <Card className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Check className="w-12 h-12 mx-auto text-green-500 mb-2" />
              No payments pending review
            </Card>
          )}

          {/* Confirmed Payments */}
          {confirmedPayments.length > 0 && (
            <Card>
              <h2 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                Confirmed ({confirmedPayments.length})
              </h2>
              <div className="-mx-4">
                {confirmedPayments.map((payment) => (
                  <PaymentRow
                    key={payment.id}
                    payment={payment}
                    onConfirm={() => {}}
                    onReject={() => {}}
                    isPending={false}
                  />
                ))}
              </div>
            </Card>
          )}

          {/* Rejected Payments */}
          {rejectedPayments.length > 0 && (
            <Card>
              <h2 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <X className="w-5 h-5 text-red-600 dark:text-red-400" />
                Rejected ({rejectedPayments.length})
              </h2>
              <div className="-mx-4">
                {rejectedPayments.map((payment) => (
                  <PaymentRow
                    key={payment.id}
                    payment={payment}
                    onConfirm={() =>
                      statusMutation.mutate({ id: payment.id, status: 'confirmed' })
                    }
                    onReject={() => {}}
                    isPending={statusMutation.isPending}
                  />
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {!isLoading && tab === 'balances' && (
        <Card>
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">User Balances</h2>
          <div className="space-y-2">
            {balances?.map((balance) => (
              <BalanceCard key={balance.user_id} balance={balance} />
            ))}
          </div>

          {balances?.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <DollarSign className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-2" />
              No cost assignments yet
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
