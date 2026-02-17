import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { LogOut, Check, Edit2, Settings, Camera } from 'lucide-react';
import { Header } from '../components/shared/Header';
import { Card } from '../components/shared/Card';
import { Badge } from '../components/shared/Badge';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { NotificationSettings } from '../components/shared/NotificationSettings';
import { useAuthStore } from '../store/authStore';
import { updateProfile, updateTripStatus } from '../api/users';
import { getErrorMessage } from '../api/client';
import type { TripStatus } from '../types';

const tripStatusOptions: { value: TripStatus; label: string; description: string }[] = [
  { value: 'confirmed', label: 'I\'m In!', description: 'Count me in for the party' },
  { value: 'maybe', label: 'Maybe', description: 'Still figuring out my schedule' },
  { value: 'declined', label: 'Can\'t Make It', description: 'Unfortunately can\'t attend' },
];

interface ProfileForm {
  display_name: string;
  bio: string;
  phone: string;
  venmo_handle: string;
}

function resizeImage(file: File, maxSize: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width;
        let h = img.height;
        if (w > h) {
          if (w > maxSize) { h = (h * maxSize) / w; w = maxSize; }
        } else {
          if (h > maxSize) { w = (w * maxSize) / h; h = maxSize; }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Profile() {
  const { user, logout, setUser } = useAuthStore();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, reset } = useForm<ProfileForm>({
    defaultValues: {
      display_name: user?.display_name || '',
      bio: user?.bio || '',
      phone: user?.phone || '',
      venmo_handle: user?.venmo_handle || '',
    },
  });

  const profileMutation = useMutation({
    mutationFn: (data: Partial<ProfileForm & { photo_url: string }>) => updateProfile(user!.id, data),
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsEditing(false);
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const statusMutation = useMutation({
    mutationFn: (status: TripStatus) => updateTripStatus(user!.id, status),
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImage(file, 256);
      profileMutation.mutate({ photo_url: dataUrl });
    } catch {
      setError('Failed to process image');
    }
  };

  const onSubmit = (data: ProfileForm) => {
    setError(null);
    profileMutation.mutate(data);
  };

  const handleCancel = () => {
    reset();
    setIsEditing(false);
    setError(null);
  };

  if (!user) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <>
      <Header
        title="Profile"
        rightElement={
          <button
            onClick={logout}
            className="p-2 text-gray-600 hover:text-gray-900"
            title="Sign out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        }
      />

      <main className="px-4 py-4 max-w-lg mx-auto space-y-4">
        {/* Profile Header */}
        <Card>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative w-20 h-20 rounded-full overflow-hidden group flex-shrink-0"
            >
              {user.photo_url ? (
                <img src={user.photo_url} alt={user.display_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-3xl">
                  {user.display_name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity">
                <Camera className="w-6 h-6 text-white" />
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />
            <div>
              <h2 className="text-xl font-bold text-gray-900">{user.display_name}</h2>
              <p className="text-gray-600">@{user.username}</p>
              {user.is_groom && <Badge variant="warning" className="mt-1">The Groom</Badge>}
              {user.is_admin && <Badge variant="info" className="mt-1">Organizer</Badge>}
            </div>
          </div>
        </Card>

        {/* Admin Panel Link */}
        {user.is_admin && (
          <Link to="/admin" className="block">
            <Card className="bg-gray-900 text-white hover:bg-gray-800 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 rounded-lg">
                    <Settings className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold">Admin Panel</div>
                    <div className="text-sm text-gray-400">Manage events, users, and payments</div>
                  </div>
                </div>
                <div className="text-gray-400">&rarr;</div>
              </div>
            </Card>
          </Link>
        )}

        {/* Notifications */}
        <NotificationSettings />

        {/* Trip Status */}
        <Card>
          <h3 className="font-semibold text-gray-900 mb-3">Trip Status</h3>
          <div className="space-y-2">
            {tripStatusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => statusMutation.mutate(option.value)}
                disabled={statusMutation.isPending}
                className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-colors ${
                  user.trip_status === option.value
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-left">
                  <div className="font-medium">{option.label}</div>
                  <div className="text-sm text-gray-500">{option.description}</div>
                </div>
                {user.trip_status === option.value && (
                  <Check className="w-5 h-5 text-primary-600" />
                )}
              </button>
            ))}
          </div>
        </Card>

        {/* Profile Details */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Profile Details</h3>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1 text-primary-600 text-sm font-medium"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
            )}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {isEditing ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name
                </label>
                <input {...register('display_name')} className="input" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bio
                </label>
                <textarea
                  {...register('bio')}
                  rows={3}
                  className="input resize-none"
                  placeholder="Tell us about yourself..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  {...register('phone')}
                  type="tel"
                  className="input"
                  placeholder="(555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Venmo Handle
                </label>
                <input
                  {...register('venmo_handle')}
                  className="input"
                  placeholder="@yourvenmo"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={profileMutation.isPending}
                  className="btn-primary flex-1"
                >
                  {profileMutation.isPending ? <LoadingSpinner size="sm" /> : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              {user.bio && (
                <div>
                  <div className="text-sm text-gray-500">Bio</div>
                  <div className="text-gray-900">{user.bio}</div>
                </div>
              )}
              <div>
                <div className="text-sm text-gray-500">Phone</div>
                <div className="text-gray-900">{user.phone || 'Not set'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Venmo</div>
                <div className="text-gray-900">{user.venmo_handle || 'Not set'}</div>
              </div>
            </div>
          )}
        </Card>
      </main>
    </>
  );
}
