import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { LogOut, Check, Edit2, Settings, Camera, Sun, Moon, Monitor, Plane, ChevronDown, AlertTriangle } from 'lucide-react';
import { Header } from '../components/shared/Header';
import { Card } from '../components/shared/Card';
import { Badge } from '../components/shared/Badge';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { NotificationSettings } from '../components/shared/NotificationSettings';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
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

const themeOptions = [
  { value: 'light' as const, label: 'Light', icon: Sun },
  { value: 'dark' as const, label: 'Dark', icon: Moon },
  { value: 'system' as const, label: 'System', icon: Monitor },
];

function TravelDetails() {
  const { user, setUser } = useAuthStore();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [arrivalFlight, setArrivalFlight] = useState(user?.arrival_flight || '');
  const [arrivalDatetime, setArrivalDatetime] = useState(
    user?.arrival_datetime ? user.arrival_datetime.slice(0, 16) : ''
  );
  const [departureFlight, setDepartureFlight] = useState(user?.departure_flight || '');
  const [departureDatetime, setDepartureDatetime] = useState(
    user?.departure_datetime ? user.departure_datetime.slice(0, 16) : ''
  );

  const mutation = useMutation({
    mutationFn: (data: Record<string, string | null>) => updateProfile(user!.id, data),
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsEditing(false);
    },
  });

  const handleSave = () => {
    mutation.mutate({
      arrival_flight: arrivalFlight || null,
      arrival_datetime: arrivalDatetime ? new Date(arrivalDatetime).toISOString() : null,
      departure_flight: departureFlight || null,
      departure_datetime: departureDatetime ? new Date(departureDatetime).toISOString() : null,
    });
  };

  const handleCancel = () => {
    setArrivalFlight(user?.arrival_flight || '');
    setArrivalDatetime(user?.arrival_datetime ? user.arrival_datetime.slice(0, 16) : '');
    setDepartureFlight(user?.departure_flight || '');
    setDepartureDatetime(user?.departure_datetime ? user.departure_datetime.slice(0, 16) : '');
    setIsEditing(false);
  };

  const hasFlightInfo = !!(user?.arrival_flight || user?.departure_flight);

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Plane className="w-5 h-5 text-primary-600" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Travel Details</h3>
        </div>
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

      {isEditing ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Arrival Flight
            </label>
            <input
              type="text"
              value={arrivalFlight}
              onChange={(e) => setArrivalFlight(e.target.value)}
              className="input"
              placeholder="e.g., DL1234"
              maxLength={20}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Arrival Date/Time
            </label>
            <input
              type="datetime-local"
              value={arrivalDatetime}
              onChange={(e) => setArrivalDatetime(e.target.value)}
              className="input w-full min-w-0 max-w-full text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Departure Flight
            </label>
            <input
              type="text"
              value={departureFlight}
              onChange={(e) => setDepartureFlight(e.target.value)}
              className="input"
              placeholder="e.g., WN5678"
              maxLength={20}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Departure Date/Time
            </label>
            <input
              type="datetime-local"
              value={departureDatetime}
              onChange={(e) => setDepartureDatetime(e.target.value)}
              className="input w-full min-w-0 max-w-full text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={mutation.isPending}
              className="btn-primary flex-1"
            >
              {mutation.isPending ? <LoadingSpinner size="sm" /> : 'Save'}
            </button>
            <button onClick={handleCancel} className="btn-secondary flex-1">
              Cancel
            </button>
          </div>
        </div>
      ) : hasFlightInfo ? (
        <div className="space-y-2 text-sm">
          {user?.arrival_flight && (
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400">Arriving</span>
              <span className="font-medium dark:text-white">{user.arrival_flight}</span>
            </div>
          )}
          {user?.arrival_datetime && (
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400" />
              <span className="text-gray-600 dark:text-gray-400 text-xs">
                {new Date(user.arrival_datetime).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </span>
            </div>
          )}
          {user?.departure_flight && (
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400">Departing</span>
              <span className="font-medium dark:text-white">{user.departure_flight}</span>
            </div>
          )}
          {user?.departure_datetime && (
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400" />
              <span className="text-gray-600 dark:text-gray-400 text-xs">
                {new Date(user.departure_datetime).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </span>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">No flight info added yet</p>
      )}
    </Card>
  );
}

function ThemeSection({ theme, setTheme }: { theme: string; setTheme: (t: 'light' | 'dark' | 'system') => void }) {
  const [open, setOpen] = useState(false);
  const currentLabel = themeOptions.find(t => t.value === theme)?.label || 'System';
  const CurrentIcon = themeOptions.find(t => t.value === theme)?.icon || Monitor;

  return (
    <Card>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <CurrentIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </div>
          <div className="text-left">
            <div className="font-medium text-gray-900 dark:text-white">Theme</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{currentLabel}</div>
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="flex gap-2 mt-4">
          {themeOptions.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => { setTheme(value); setOpen(false); }}
              className={`flex-1 flex flex-col items-center gap-2 py-3 rounded-lg border-2 transition-colors ${
                theme === value
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                  : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}

function TripStatusSection({ user, statusMutation }: { user: { trip_status: TripStatus }; statusMutation: ReturnType<typeof useMutation<any, any, TripStatus>> }) {
  const [open, setOpen] = useState(false);
  const [confirmingStatus, setConfirmingStatus] = useState<TripStatus | null>(null);
  const currentOption = tripStatusOptions.find(o => o.value === user.trip_status);
  const isConfirmed = user.trip_status === 'confirmed';

  const handleSelect = (value: TripStatus) => {
    if (value === user.trip_status) return;
    if (isConfirmed && value !== 'confirmed') {
      setConfirmingStatus(value);
    } else {
      statusMutation.mutate(value);
      setOpen(false);
    }
  };

  const confirmChange = () => {
    if (confirmingStatus) {
      statusMutation.mutate(confirmingStatus);
      setConfirmingStatus(null);
      setOpen(false);
    }
  };

  return (
    <Card>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between"
      >
        <div className="text-left">
          <div className="font-medium text-gray-900 dark:text-white">Change Trip Status</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Currently: {currentOption?.label || user.trip_status}
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="space-y-2 mt-4">
          {confirmingStatus && (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800/30 rounded-lg mb-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                    You're currently confirmed for the trip.
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                    Changing your status may affect cost splits for everyone. Are you sure?
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={confirmChange}
                      disabled={statusMutation.isPending}
                      className="px-3 py-1.5 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700"
                    >
                      {statusMutation.isPending ? <LoadingSpinner size="sm" /> : 'Yes, Change'}
                    </button>
                    <button
                      onClick={() => setConfirmingStatus(null)}
                      className="px-3 py-1.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {tripStatusOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              disabled={statusMutation.isPending}
              className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-colors ${
                user.trip_status === option.value
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
              }`}
            >
              <div className="text-left">
                <div className="font-medium dark:text-white">{option.label}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{option.description}</div>
              </div>
              {user.trip_status === option.value && (
                <Check className="w-5 h-5 text-primary-600" />
              )}
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function Profile() {
  const { user, logout, setUser } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
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
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
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
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{user.display_name}</h2>
              <p className="text-gray-600 dark:text-gray-400">@{user.username}</p>
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

        {/* Theme */}
        <ThemeSection theme={theme} setTheme={setTheme} />

        {/* Notifications */}
        <NotificationSettings collapsible />

        {/* Travel Details */}
        <TravelDetails />

        {/* Trip Status */}
        <TripStatusSection user={user} statusMutation={statusMutation} />

        {/* Profile Details */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Profile Details</h3>
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
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800/30 rounded-lg text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {isEditing ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Display Name
                </label>
                <input {...register('display_name')} className="input" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                  <div className="text-sm text-gray-500 dark:text-gray-400">Bio</div>
                  <div className="text-gray-900 dark:text-white">{user.bio}</div>
                </div>
              )}
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Phone</div>
                <div className="text-gray-900 dark:text-white">{user.phone || 'Not set'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Venmo</div>
                <div className="text-gray-900 dark:text-white">{user.venmo_handle || 'Not set'}</div>
              </div>
            </div>
          )}
        </Card>
      </main>
    </>
  );
}
