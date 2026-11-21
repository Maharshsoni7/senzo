import { z } from 'zod';
import { AppKind, Platform, Role } from './enums';

/** Accepts +91XXXXXXXXXX, 91XXXXXXXXXX or a bare 10-digit mobile; outputs E.164. */
export const PhoneIN = z
  .string()
  .transform((s) => s.replace(/[\s-]/g, ''))
  .pipe(z.string().regex(/^(?:\+?91)?[6-9]\d{9}$/, 'Enter a 10-digit Indian mobile number'))
  .transform((s) => `+91${s.slice(-10)}`);

export const OtpRequest = z.object({
  phone: PhoneIN,
  turnstileToken: z.string().min(1),
  channel: z.enum(['sms', 'voice']).default('sms'),
});
export type OtpRequest = z.infer<typeof OtpRequest>;

export const OtpRequestResult = z.object({ retryAfterSec: z.number().int() });

export const OtpVerify = z.object({
  phone: PhoneIN,
  code: z.string().regex(/^\d{6}$/),
  device: z.object({
    platform: Platform,
    app: AppKind,
    pushToken: z.string().optional(),
  }),
});
export type OtpVerify = z.infer<typeof OtpVerify>;

export const TokenPair = z.object({
  accessToken: z.string(),
  accessExpiresAt: z.iso.datetime(),
  refreshToken: z.string(),
  refreshExpiresAt: z.iso.datetime(),
});
export type TokenPair = z.infer<typeof TokenPair>;

export const AuthResult = TokenPair.extend({
  isNewUser: z.boolean(),
  roles: z.array(Role),
});

export const RefreshRequest = z.object({ refreshToken: z.string().min(1) });
