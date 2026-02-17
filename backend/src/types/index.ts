export interface User {
  id: string;
  username: string;
  password_hash: string;
  email: string;
  display_name: string;
  bio: string | null;
  photo_url: string | null;
  phone: string | null;
  venmo_handle: string | null;
  is_admin: boolean;
  is_groom: boolean;
  trip_status: TripStatus;
  push_subscription: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
}

export type TripStatus = 'invited' | 'confirmed' | 'declined' | 'maybe';

export interface Event {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  location_url: string | null;
  start_time: Date;
  end_time: Date | null;
  is_mandatory: boolean;
  total_cost: number;
  split_type: SplitType;
  category: string | null;
  image_url: string | null;
  exclude_groom: boolean;
  notes: string | null;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export type SplitType = 'even' | 'custom' | 'fixed';

export interface Rsvp {
  id: string;
  user_id: string;
  event_id: string;
  status: RsvpStatus;
  responded_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export type RsvpStatus = 'pending' | 'confirmed' | 'declined' | 'maybe';

export interface EventCost {
  id: string;
  event_id: string;
  user_id: string;
  amount: number;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Payment {
  id: string;
  user_id: string;
  event_id: string | null;
  amount: number;
  payment_method: PaymentMethod | null;
  payment_reference: string | null;
  status: PaymentStatus;
  paid_to: string | null;
  notes: string | null;
  paid_at: Date | null;
  confirmed_by: string | null;
  confirmed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export type PaymentMethod = 'venmo' | 'cash' | 'zelle' | 'paypal' | 'credit_card' | 'other';
export type PaymentStatus = 'pending' | 'confirmed' | 'rejected';

export interface RefreshToken {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  created_at: Date;
  revoked_at: Date | null;
}

export interface UserBalance {
  user_id: string;
  display_name: string;
  total_owed: number;
  total_paid: number;
  balance_remaining: number;
}

// API Types
export interface PublicUser {
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
}

export interface JwtPayload {
  userId: string;
  username: string;
  isAdmin: boolean;
}
