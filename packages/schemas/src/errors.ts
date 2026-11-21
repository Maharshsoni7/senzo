import { z } from 'zod';

export const ErrorCode = z.enum([
  'VALIDATION_FAILED',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'RATE_LIMITED',
  'IDEMPOTENCY_KEY_REQUIRED',
  'IDEMPOTENCY_KEY_REUSED',
  'IDEMPOTENCY_IN_PROGRESS',
  'INTERNAL',
  'SLOT_TAKEN',
  'BELOW_CHEF_MINIMUM',
  'OTP_INVALID',
  'OTP_LOCKED',
  'OUTSIDE_SERVICE_AREA',
  'POLICY_WINDOW_CLOSED',
  'TURNSTILE_FAILED',
  'SESSION_REVOKED',
  'FOOD_RULE_UNAVAILABLE',
  'GUESTS_OUT_OF_RANGE',
  'PROMO_INVALID',
  'INVALID_TRANSITION',
  'STATE_CONFLICT',
]);
export type ErrorCode = z.infer<typeof ErrorCode>;

/** RFC 9457 body returned as application/problem+json. */
export const Problem = z
  .object({
    type: z.string(),
    title: z.string(),
    status: z.number().int(),
    code: ErrorCode,
    detail: z.string().optional(),
    fields: z.record(z.string(), z.array(z.string())).optional(),
    retryAfterSec: z.number().int().optional(),
  })
  .meta({ id: 'Problem' });
export type Problem = z.infer<typeof Problem>;
