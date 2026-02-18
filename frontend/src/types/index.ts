export interface User {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  photo_url: string | null;
  phone: string | null;
  venmo_handle: string | null;
  is_admin: boolean;
  is_groom: boolean;
  trip_status: TripStatus;
  arrival_flight: string | null;
  arrival_datetime: string | null;
  departure_flight: string | null;
  departure_datetime: string | null;
}

export type TripStatus = 'invited' | 'confirmed' | 'declined' | 'maybe';

export interface Event {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  location_url: string | null;
  event_url: string | null;
  start_time: string;
  end_time: string | null;
  is_mandatory: boolean;
  total_cost: number;
  split_type: SplitType;
  exclude_groom: boolean;
  category: string | null;
  image_url: string | null;
  notes: string | null;
  user_rsvp?: RsvpStatus;
  attendees?: EventAttendeePreview[];
  attendee_count?: number;
}

export type SplitType = 'even' | 'custom' | 'fixed';

export type RsvpStatus = 'pending' | 'confirmed' | 'declined' | 'maybe';

export interface EventAttendeePreview {
  id: string;
  display_name: string;
  photo_url: string | null;
}

export interface Payment {
  id: string;
  user_id: string;
  event_id: string | null;
  amount: number;
  payment_method: PaymentMethod | null;
  payment_reference: string | null;
  status: PaymentStatus;
  notes: string | null;
  paid_at: string | null;
  event_title?: string;
}

export type PaymentMethod = 'venmo' | 'cash' | 'zelle' | 'paypal' | 'credit_card' | 'other';
export type PaymentStatus = 'pending' | 'confirmed' | 'rejected';

export interface PaymentSummary {
  total_owed: number;
  total_paid: number;
  balance_remaining: number;
}

export interface CostBreakdown {
  event_id: string;
  event_title: string;
  event_date: string;
  amount: number;
  notes: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  real_name: string;
  username: string;
  email: string;
  password: string;
  display_name: string;
}
