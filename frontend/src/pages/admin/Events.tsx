import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { format, parseISO } from 'date-fns';
import { Plus, Edit2, Trash2, X, Calculator, DollarSign, Calendar } from 'lucide-react';
import { Card } from '../../components/shared/Card';
import { Badge } from '../../components/shared/Badge';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { getEvents } from '../../api/events';
import { getUsers } from '../../api/users';
import {
  createEvent,
  updateEvent,
  deleteEvent,
  calculateEvenSplit,
  setEventCosts,
  type EventInput,
  type CostSplit,
} from '../../api/admin';
import { getErrorMessage } from '../../api/client';
import type { Event } from '../../types';

interface EventFormData {
  title: string;
  description: string;
  location: string;
  location_url: string;
  event_url: string;
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  is_mandatory: boolean;
  total_cost: number;
  split_type: 'even' | 'custom' | 'fixed';
  exclude_groom: boolean;
  category: string;
  notes: string;
}

function EventForm({
  event,
  onClose,
  onSuccess,
}: {
  event?: Event;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const defaultValues: EventFormData = event
    ? {
        title: event.title,
        description: event.description || '',
        location: event.location || '',
        location_url: event.location_url || '',
        event_url: event.event_url || '',
        start_date: format(parseISO(event.start_time), 'yyyy-MM-dd'),
        start_time: format(parseISO(event.start_time), 'HH:mm'),
        end_date: event.end_time ? format(parseISO(event.end_time), 'yyyy-MM-dd') : '',
        end_time: event.end_time ? format(parseISO(event.end_time), 'HH:mm') : '',
        is_mandatory: event.is_mandatory,
        total_cost: event.total_cost,
        split_type: event.split_type,
        exclude_groom: event.exclude_groom ?? true,
        category: event.category || '',
        notes: event.notes || '',
      }
    : {
        title: '',
        description: '',
        location: '',
        location_url: '',
        event_url: '',
        start_date: '',
        start_time: '',
        end_date: '',
        end_time: '',
        is_mandatory: false,
        total_cost: 0,
        split_type: 'even' as const,
        exclude_groom: true,
        category: '',
        notes: '',
      };

  const { register, handleSubmit, watch, formState: { errors } } = useForm<EventFormData>({
    defaultValues,
  });

  const splitType = watch('split_type');

  const mutation = useMutation({
    mutationFn: async (data: EventFormData) => {
      const eventInput: EventInput = {
        title: data.title,
        description: data.description || undefined,
        location: data.location || undefined,
        location_url: data.location_url || undefined,
        event_url: data.event_url || undefined,
        start_time: new Date(`${data.start_date}T${data.start_time}`).toISOString(),
        end_time: data.end_date && data.end_time
          ? new Date(`${data.end_date}T${data.end_time}`).toISOString()
          : undefined,
        is_mandatory: data.is_mandatory,
        total_cost: Number(data.total_cost),
        split_type: data.split_type,
        exclude_groom: data.exclude_groom,
        category: data.category || undefined,
        notes: data.notes || undefined,
      };

      if (event) {
        return updateEvent(event.id, eventInput);
      }
      return createEvent(eventInput);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      onSuccess();
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const onSubmit = (data: EventFormData) => {
    setError(null);
    mutation.mutate(data);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <h2 className="text-lg font-semibold dark:text-white">
            {event ? 'Edit Event' : 'Create Event'}
          </h2>
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
              Title *
            </label>
            <input
              {...register('title', { required: 'Title is required' })}
              className="input"
              placeholder="e.g., Dinner at Gordon Ramsay Steak"
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              {...register('description')}
              className="input resize-none"
              rows={3}
              placeholder="What's this event about?"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Date *
              </label>
              <input
                {...register('start_date', { required: 'Start date is required' })}
                type="date"
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Time *
              </label>
              <input
                {...register('start_time', { required: 'Start time is required' })}
                type="time"
                className="input"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                End Date
              </label>
              <input {...register('end_date')} type="date" className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                End Time
              </label>
              <input {...register('end_time')} type="time" className="input" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Location
            </label>
            <input
              {...register('location')}
              className="input"
              placeholder="e.g., Paris Las Vegas"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Location URL (Google Maps)
            </label>
            <input
              {...register('location_url')}
              type="url"
              className="input"
              placeholder="https://maps.google.com/..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Event Link (Venue / Tickets)
            </label>
            <input
              {...register('event_url')}
              type="url"
              className="input"
              placeholder="https://venue-or-tickets.com/..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {splitType === 'fixed' ? 'Cost Per Person ($)' : splitType === 'custom' ? 'Total Cost ($)' : 'Total Group Cost ($)'}
              </label>
              <input
                {...register('total_cost', { valueAsNumber: true })}
                type="number"
                min="0"
                step="0.01"
                className="input"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Cost Split Type
              </label>
              <select {...register('split_type')} className="input">
                <option value="even">Group Total (split evenly)</option>
                <option value="fixed">Per Person (fixed rate)</option>
                <option value="custom">Custom Amounts</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              {...register('exclude_groom')}
              type="checkbox"
              id="exclude_groom"
              className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="exclude_groom" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Exclude groom from cost (split among other guests)
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Category
            </label>
            <select {...register('category')} className="input">
              <option value="">Select category...</option>
              <option value="dinner">Dinner</option>
              <option value="activity">Activity</option>
              <option value="nightlife">Nightlife</option>
              <option value="transport">Transport</option>
              <option value="accommodation">Accommodation</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              {...register('notes')}
              className="input resize-none"
              rows={2}
              placeholder="Any additional notes..."
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              {...register('is_mandatory')}
              type="checkbox"
              id="is_mandatory"
              className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="is_mandatory" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Mandatory event (everyone must attend)
            </label>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="btn-primary flex-1"
            >
              {mutation.isPending ? <LoadingSpinner size="sm" /> : event ? 'Update Event' : 'Create Event'}
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

function CostSplitModal({
  event,
  onClose,
}: {
  event: Event;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [costs, setCosts] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
  });

  const confirmedUsers = users?.filter((u) => u.trip_status === 'confirmed') || [];

  const calculateMutation = useMutation({
    mutationFn: () => calculateEvenSplit(event.id),
    onSuccess: (data) => {
      const newCosts: Record<string, number> = {};
      data.forEach((c) => {
        newCosts[c.user_id] = c.amount;
      });
      setCosts(newCosts);
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const costSplits: CostSplit[] = Object.entries(costs).map(([user_id, amount]) => ({
        user_id,
        amount,
      }));
      return setEventCosts(event.id, costSplits);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      onClose();
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const handleCostChange = (userId: string, value: string) => {
    setCosts((prev) => ({
      ...prev,
      [userId]: parseFloat(value) || 0,
    }));
  };

  const totalAssigned = Object.values(costs).reduce((sum, c) => sum + c, 0);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold dark:text-white">Set Cost Split</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{event.title}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{event.split_type === 'fixed' ? 'Per Person Rate' : 'Total Event Cost'}</div>
              <div className="text-xl font-bold">${Number(event.total_cost).toFixed(2)}</div>
            </div>
            <button
              onClick={() => calculateMutation.mutate()}
              disabled={calculateMutation.isPending}
              className="btn-secondary flex items-center gap-2"
            >
              <Calculator className="w-4 h-4" />
              Auto Split
            </button>
          </div>

          <div className="space-y-2">
            {confirmedUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-3 border dark:border-gray-700 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-medium text-sm">
                    {user.display_name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-medium">{user.display_name}</div>
                    {user.is_groom && (
                      <span className="text-xs text-yellow-600">Groom</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-gray-500 dark:text-gray-400">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={costs[user.id] || ''}
                    onChange={(e) => handleCostChange(user.id, e.target.value)}
                    className="w-24 px-2 py-1 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded text-right"
                    placeholder="0.00"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <span className="font-medium">Total Assigned</span>
            <span
              className={`text-lg font-bold ${
                Math.abs(totalAssigned - Number(event.total_cost)) < 0.01
                  ? 'text-green-600'
                  : 'text-orange-600'
              }`}
            >
              ${totalAssigned.toFixed(2)}
            </span>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="btn-primary flex-1"
            >
              {saveMutation.isPending ? <LoadingSpinner size="sm" /> : 'Save Costs'}
            </button>
            <button onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminEvents() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [costSplitEvent, setCostSplitEvent] = useState<Event | null>(null);

  const { data: events, isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: getEvents,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setShowForm(true);
  };

  const handleDelete = (event: Event) => {
    if (confirm(`Delete "${event.title}"? This cannot be undone.`)) {
      deleteMutation.mutate(event.id);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingEvent(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Events</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage the party schedule</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Event
        </button>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {events && events.length === 0 && (
        <Card className="text-center py-12">
          <Calendar className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
          <p className="text-gray-600 dark:text-gray-400">No events yet</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 text-primary-600 font-medium"
          >
            Create your first event
          </button>
        </Card>
      )}

      <div className="space-y-3">
        {events?.map((event) => (
          <Card key={event.id}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white">{event.title}</h3>
                  {event.is_mandatory && <Badge variant="error">Required</Badge>}
                  {event.category && <Badge>{event.category}</Badge>}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {format(parseISO(event.start_time), 'EEE, MMM d @ h:mm a')}
                </p>
                {event.location && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{event.location}</p>
                )}
                {Number(event.total_cost) > 0 && (
                  <p className="text-sm font-medium text-primary-600 mt-2">
                    {event.split_type === 'fixed'
                      ? `$${Number(event.total_cost).toFixed(0)}/person${event.exclude_groom ? ' (groom excluded)' : ''}`
                      : event.split_type === 'custom'
                      ? `$${Number(event.total_cost).toFixed(2)} total (custom split)`
                      : `$${Number(event.total_cost).toLocaleString()} total (split evenly${event.exclude_groom ? ', groom excluded' : ''})`}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1">
                {Number(event.total_cost) > 0 && (
                  <button
                    onClick={() => setCostSplitEvent(event)}
                    className="p-2 text-gray-500 dark:text-gray-400 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    title="Set cost split"
                  >
                    <DollarSign className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => handleEdit(event)}
                  className="p-2 text-gray-500 dark:text-gray-400 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  title="Edit"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(event)}
                  disabled={deleteMutation.isPending}
                  className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {showForm && (
        <EventForm
          event={editingEvent || undefined}
          onClose={handleFormClose}
          onSuccess={handleFormClose}
        />
      )}

      {costSplitEvent && (
        <CostSplitModal
          event={costSplitEvent}
          onClose={() => setCostSplitEvent(null)}
        />
      )}
    </div>
  );
}
