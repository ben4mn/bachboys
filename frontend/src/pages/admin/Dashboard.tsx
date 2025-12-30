import { useQuery } from '@tanstack/react-query';
import { Users, Calendar, DollarSign, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { Card } from '../../components/shared/Card';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { getDashboardStats } from '../../api/admin';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount);
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: typeof Users;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

function StatCard({ title, value, subtitle, icon: Icon, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
  };

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </Card>
  );
}

export default function AdminDashboard() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: getDashboardStats,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-4 bg-red-50 rounded-lg text-red-700 text-center">
        Failed to load dashboard stats
      </div>
    );
  }

  const collectionRate = stats.payments.total_owed > 0
    ? Math.round((stats.payments.total_collected / stats.payments.total_owed) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Overview of the bachelor party</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Attendees"
          value={stats.users.confirmed}
          subtitle={`${stats.users.total} invited`}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Events"
          value={stats.events.total}
          subtitle={`${stats.events.upcoming} upcoming`}
          icon={Calendar}
          color="purple"
        />
        <StatCard
          title="Collected"
          value={formatCurrency(stats.payments.total_collected)}
          subtitle={`of ${formatCurrency(stats.payments.total_owed)} total`}
          icon={DollarSign}
          color="green"
        />
        <StatCard
          title="Collection Rate"
          value={`${collectionRate}%`}
          subtitle={`${stats.payments.pending_count} pending`}
          icon={TrendingUp}
          color="orange"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <h2 className="font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <a
              href="/admin/events"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="font-medium">Add Event</div>
                <div className="text-sm text-gray-500">Create a new activity</div>
              </div>
            </a>
            <a
              href="/admin/users"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="font-medium">Invite Attendee</div>
                <div className="text-sm text-gray-500">Add someone to the party</div>
              </div>
            </a>
            <a
              href="/admin/payments"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="font-medium">Confirm Payments</div>
                <div className="text-sm text-gray-500">
                  {stats.payments.pending_count} awaiting confirmation
                </div>
              </div>
            </a>
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold text-gray-900 mb-4">Payment Progress</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Collected</span>
                <span className="font-medium">{collectionRate}%</span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${collectionRate}%` }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <div className="text-sm text-gray-500">Outstanding</div>
                <div className="text-lg font-semibold text-gray-900">
                  {formatCurrency(stats.payments.total_owed - stats.payments.total_collected)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Pending Review</div>
                <div className="text-lg font-semibold text-gray-900">
                  {stats.payments.pending_count} payments
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
