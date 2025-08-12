import { z } from 'zod';

// Common form validation schemas
export const nameSchema = z.string().min(2, 'Name must be at least 2 characters');

export const emailSchema = z.string().email('Please enter a valid email address');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const phoneSchema = z
  .string()
  .regex(/^\+?[0-9]{10,15}$/, 'Please enter a valid phone number');

// Status validation
export const statusSchema = z.enum(['active', 'inactive']);

// Generic validation error handling
export function getZodErrors<T>(
  schema: z.ZodType<T>,
  data: unknown
): Record<string, string> {
  try {
    schema.parse(data);
    return {};
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.errors.forEach((err) => {
        if (err.path.length > 0) {
          const path = err.path.join('.');
          errors[path] = err.message;
        }
      });
      return errors;
    }
    return {};
  }
}