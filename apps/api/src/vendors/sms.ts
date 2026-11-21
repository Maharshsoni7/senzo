import type { Bindings } from '../env';
import { AppError } from '../lib/errors';

export type OtpChannel = 'sms' | 'voice';

export interface OtpSender {
  /** Fixed code to use instead of a random one (dev and tests only). */
  fixedCode?: string;
  send(phoneE164: string, code: string, channel: OtpChannel): Promise<void>;
}

export function otpSender(env: Bindings): OtpSender {
  if (env.ENVIRONMENT !== 'production' && env.DEV_FIXED_OTP) {
    return { fixedCode: env.DEV_FIXED_OTP, send: async () => {} };
  }
  // MSG91 needs the auth key and DLT-registered templates (PROGRESS.md, Phase 0 paperwork).
  return {
    send: async () => {
      throw new AppError('INTERNAL', 503, 'SMS provider not configured');
    },
  };
}
