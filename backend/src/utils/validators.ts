import { z } from 'zod';

export const registerSchema = z.object({
  real_name: z.string().min(1).max(100),
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z.string().email(),
  password: z.string().min(6).max(100),
  display_name: z.string().min(1).max(100),
});

export const verifyNameSchema = z.object({
  real_name: z.string().min(1).max(100),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(6).max(100),
});

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const updateProfileSchema = z.object({
  display_name: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional(),
  phone: z.string().max(20).optional(),
  venmo_handle: z.string().max(100).optional(),
  photo_url: z.string().max(500000).optional(),
});

export const tripStatusSchema = z.object({
  status: z.enum(['invited', 'confirmed', 'declined', 'maybe']),
});

export const eventSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  location: z.string().optional(),
  location_url: z.string().url().optional(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime().optional(),
  is_mandatory: z.boolean().default(false),
  total_cost: z.number().min(0).default(0),
  split_type: z.enum(['even', 'custom', 'fixed']).default('even'),
  exclude_groom: z.boolean().default(true),
  category: z.string().optional(),
  image_url: z.string().url().optional(),
  notes: z.string().optional(),
});

export const rsvpSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'declined', 'maybe']),
});

export const paymentSchema = z.object({
  event_id: z.string().uuid().optional(),
  amount: z.number().positive(),
  payment_method: z.enum(['venmo', 'cash', 'zelle', 'paypal', 'credit_card', 'other']),
  payment_reference: z.string().optional(),
  notes: z.string().optional(),
});

export const costSplitSchema = z.object({
  costs: z.array(z.object({
    user_id: z.string().uuid(),
    amount: z.number().min(0),
    notes: z.string().optional(),
  })),
});

export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}
