import { NavLink, Outlet, Navigate } from 'react-router-dom';
import { LayoutDashboard, Calendar, Users, DollarSign, Bell, ArrowLeft } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuthStore } from '../../store/authStore';

const adminNavItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/events', icon: Calendar, label: 'Events' },
  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/admin/payments', icon: DollarSign, label: 'Payments' },
  { to: '/admin/notifications', icon: Bell, label: 'Notifications' },
];

export function AdminLayout() {
  const { user } = useAuthStore();

  // Redirect non-admins
  if (!user?.is_admin) {
    return <Navigate to="/schedule" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Top Navigation */}
      <nav className="bg-gray-900 text-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-4">
              <NavLink
                to="/schedule"
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm">Back to App</span>
              </NavLink>
              <div className="h-6 w-px bg-gray-700" />
              <span className="font-semibold">Admin Panel</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {adminNavItems.map(({ to, icon: Icon, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                    isActive
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300'
                  )
                }
              >
                <Icon className="w-4 h-4" />
                {label}
              </NavLink>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
