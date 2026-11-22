import { ApiError } from '@senzo/api-client';
import type { TFunction } from 'i18next';

const KNOWN = ['OTP_INVALID', 'OTP_LOCKED', 'RATE_LIMITED', 'TURNSTILE_FAILED'] as const;

export function authErrorMessage(err: unknown, t: TFunction) {
  if (err instanceof ApiError && err.code && (KNOWN as readonly string[]).includes(err.code)) {
    return t(`errors.${err.code}`, { detail: err.problem?.detail ?? '' }).trim();
  }
  if (err instanceof ApiError && err.problem?.detail) return err.problem.detail;
  return t('common.errorBody');
}
