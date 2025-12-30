import { apiClient } from './client';
import type { Event, RsvpStatus } from '../types';

interface EventsResponse {
  events: Event[];
}

interface EventDetailResponse {
  event: Event;
  attendees: { id: string; display_name: string; photo_url: string | null; status: string }[];
  user_cost: number;
  user_rsvp: RsvpStatus;
}

export async function getEvents(): Promise<Event[]> {
  const response = await apiClient.get<EventsResponse>('/events');
  return response.data.events;
}

export async function getEvent(id: string): Promise<EventDetailResponse> {
  const response = await apiClient.get<EventDetailResponse>(`/events/${id}`);
  return response.data;
}

export async function updateRsvp(eventId: string, status: RsvpStatus): Promise<void> {
  await apiClient.put(`/events/${eventId}/rsvp`, { status });
}
