import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Schedule from './pages/Schedule';
import EventDetail from './pages/EventDetail';
import Payments from './pages/Payments';
import Attendees from './pages/Attendees';
import Profile from './pages/Profile';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminEvents from './pages/admin/Events';
import AdminUsers from './pages/admin/Users';
import AdminPayments from './pages/admin/Payments';

// Admin Pages
import AdminNotifications from './pages/admin/Notifications';

// Components
import { BottomNav } from './components/shared/BottomNav';
import { LoadingSpinner } from './components/shared/LoadingSpinner';
import { AdminLayout } from './components/admin/AdminLayout';
import { InstallPrompt } from './components/shared/InstallPrompt';
import { OfflineIndicator } from './components/shared/OfflineIndicator';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AuthLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to="/schedule" replace />;
  }

  return <>{children}</>;
}

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {children}
      <BottomNav />
      <InstallPrompt />
    </div>
  );
}

export default function App() {
  const { checkAuth, isLoading } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <>
      <OfflineIndicator />
      <Routes>
      {/* Auth routes */}
      <Route
        path="/login"
        element={
          <AuthLayout>
            <Login />
          </AuthLayout>
        }
      />
      <Route
        path="/register"
        element={
          <AuthLayout>
            <Register />
          </AuthLayout>
        }
      />

      {/* Protected routes */}
      <Route
        path="/schedule"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Schedule />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/events/:id"
        element={
          <ProtectedRoute>
            <AppLayout>
              <EventDetail />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/payments"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Payments />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/attendees"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Attendees />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Profile />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Admin routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="events" element={<AdminEvents />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="payments" element={<AdminPayments />} />
        <Route path="notifications" element={<AdminNotifications />} />
      </Route>

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/schedule" replace />} />
      <Route path="*" element={<Navigate to="/schedule" replace />} />
    </Routes>
    </>
  );
}
