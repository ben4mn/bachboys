import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus, Trash2, Shield, ShieldOff, Crown, X, UserX } from 'lucide-react';
import { Card } from '../../components/shared/Card';
import { Badge } from '../../components/shared/Badge';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { getUsers } from '../../api/users';
import {
  createUser,
  deleteUser,
  setUserAdmin,
  setUserGroom,
  getUnclaimedGuests,
  type CreateUserInput,
} from '../../api/admin';
import { getErrorMessage } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import type { User, TripStatus } from '../../types';

function getTripStatusBadge(status: TripStatus) {
  switch (status) {
    case 'confirmed':
      return <Badge variant="success">Confirmed</Badge>;
    case 'declined':
      return <Badge variant="error">Declined</Badge>;
    case 'maybe':
      return <Badge variant="warning">Maybe</Badge>;
    default:
      return <Badge variant="default">Invited</Badge>;
  }
}

function AddUserModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<CreateUserInput & { confirmPassword: string }>({
    defaultValues: {
      username: '',
      email: '',
      display_name: '',
      password: '',
    },
  });

  const mutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const onSubmit = (data: CreateUserInput) => {
    setError(null);
    mutation.mutate(data);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <h2 className="text-lg font-semibold dark:text-white">Add Attendee</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Display Name *
            </label>
            <input
              {...register('display_name', { required: 'Name is required' })}
              className="input"
              placeholder="Their name"
            />
            {errors.display_name && (
              <p className="mt-1 text-sm text-red-600">{errors.display_name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Username *
            </label>
            <input
              {...register('username', { required: 'Username is required' })}
              className="input"
              placeholder="username"
            />
            {errors.username && (
              <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email *
            </label>
            <input
              {...register('email', { required: 'Email is required' })}
              type="email"
              className="input"
              placeholder="their@email.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Temporary Password *
            </label>
            <input
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 6, message: 'At least 6 characters' },
              })}
              type="text"
              className="input"
              placeholder="They can change this later"
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="btn-primary flex-1"
            >
              {mutation.isPending ? <LoadingSpinner size="sm" /> : 'Add Attendee'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminUsers() {
  const { user: currentUser } = useAuthStore();
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
  });

  const { data: unclaimedGuests } = useQuery({
    queryKey: ['unclaimed-guests'],
    queryFn: getUnclaimedGuests,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const adminMutation = useMutation({
    mutationFn: ({ id, isAdmin }: { id: string; isAdmin: boolean }) =>
      setUserAdmin(id, isAdmin),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const groomMutation = useMutation({
    mutationFn: ({ id, isGroom }: { id: string; isGroom: boolean }) =>
      setUserGroom(id, isGroom),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const handleDelete = (user: User) => {
    if (user.id === currentUser?.id) {
      alert("You can't delete yourself!");
      return;
    }
    if (confirm(`Remove "${user.display_name}" from the party? This cannot be undone.`)) {
      deleteMutation.mutate(user.id);
    }
  };

  const toggleAdmin = (user: User) => {
    if (user.id === currentUser?.id) {
      alert("You can't remove your own admin status!");
      return;
    }
    adminMutation.mutate({ id: user.id, isAdmin: !user.is_admin });
  };

  const toggleGroom = (user: User) => {
    if (user.is_groom) {
      groomMutation.mutate({ id: user.id, isGroom: false });
    } else {
      if (confirm(`Set ${user.display_name} as the groom? This will remove groom status from anyone else.`)) {
        groomMutation.mutate({ id: user.id, isGroom: true });
      }
    }
  };

  // Sort: groom first, then admins, then by name
  const sortedUsers = users?.slice().sort((a, b) => {
    if (a.is_groom) return -1;
    if (b.is_groom) return 1;
    if (a.is_admin && !b.is_admin) return -1;
    if (b.is_admin && !a.is_admin) return 1;
    return a.display_name.localeCompare(b.display_name);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Users</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage party attendees</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Attendee
        </button>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {/* User Stats */}
      {users && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {users.length + (unclaimedGuests?.length || 0)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Invited</div>
          </Card>
          <Card className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {users.filter((u) => u.trip_status === 'confirmed').length}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Confirmed</div>
          </Card>
          <Card className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {users.filter((u) => u.trip_status === 'maybe' || u.trip_status === 'invited').length + (unclaimedGuests?.length || 0)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Pending</div>
          </Card>
        </div>
      )}

      {/* User List */}
      <div className="space-y-3">
        {sortedUsers?.map((user) => (
          <Card key={user.id}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-lg">
                    {user.display_name.charAt(0).toUpperCase()}
                  </div>
                  {user.is_groom && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center">
                      <Crown className="w-3 h-3 text-yellow-800" />
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{user.display_name}</h3>
                    {user.is_admin && <Badge variant="info">Admin</Badge>}
                    {user.is_groom && <Badge variant="warning">Groom</Badge>}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">@{user.username}</p>
                  <div className="mt-1">{getTripStatusBadge(user.trip_status)}</div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => toggleGroom(user)}
                  className={`p-2 rounded transition-colors ${
                    user.is_groom
                      ? 'text-yellow-600 bg-yellow-50 hover:bg-yellow-100'
                      : 'text-gray-400 hover:text-yellow-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  title={user.is_groom ? 'Remove groom status' : 'Set as groom'}
                >
                  <Crown className="w-4 h-4" />
                </button>

                <button
                  onClick={() => toggleAdmin(user)}
                  disabled={user.id === currentUser?.id}
                  className={`p-2 rounded transition-colors ${
                    user.is_admin
                      ? 'text-primary-600 bg-primary-50 hover:bg-primary-100'
                      : 'text-gray-400 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                  } ${user.id === currentUser?.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title={user.is_admin ? 'Remove admin' : 'Make admin'}
                >
                  {user.is_admin ? (
                    <Shield className="w-4 h-4" />
                  ) : (
                    <ShieldOff className="w-4 h-4" />
                  )}
                </button>

                <button
                  onClick={() => handleDelete(user)}
                  disabled={deleteMutation.isPending || user.id === currentUser?.id}
                  className={`p-2 text-gray-400 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded ${
                    user.id === currentUser?.id ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  title="Remove from party"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Contact Info */}
            {(user.phone || user.venmo_handle) && (
              <div className="mt-3 pt-3 border-t dark:border-gray-700 flex gap-4 text-sm text-gray-600 dark:text-gray-400">
                {user.phone && <span>Phone: {user.phone}</span>}
                {user.venmo_handle && <span>Venmo: @{user.venmo_handle}</span>}
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Unclaimed Guests */}
      {unclaimedGuests && unclaimedGuests.length > 0 && (
        <>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mt-2">
            <UserX className="w-5 h-5 text-yellow-600" />
            Not Yet Registered ({unclaimedGuests.length})
          </h2>
          <div className="space-y-3">
            {unclaimedGuests.map((guest) => (
              <Card key={guest.id}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 dark:text-gray-500 font-bold text-lg">
                    {guest.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{guest.full_name}</h3>
                    <div className="mt-1">
                      <Badge variant="default">Not Registered</Badge>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {showAddModal && <AddUserModal onClose={() => setShowAddModal(false)} />}
    </div>
  );
}
