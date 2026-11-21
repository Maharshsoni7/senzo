import type { ErrorCode, Problem } from '@senzo/schemas';
import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly status: ContentfulStatusCode,
    readonly detail?: string,
    readonly fields?: Record<string, string[]>,
    readonly retryAfterSec?: number,
  ) {
    super(detail ?? code);
  }
}

const titles: Partial<Record<ErrorCode, string>> = {
  VALIDATION_FAILED: 'Request is not valid',
  NOT_FOUND: 'Not found',
  INTERNAL: 'Something went wrong',
};

export function problem(c: Context, err: AppError) {
  const body: Problem = {
    type: `https://senzo.app/problems/${err.code.toLowerCase().replaceAll('_', '-')}`,
    title: titles[err.code] ?? err.code,
    status: err.status,
    code: err.code,
    ...(err.detail && { detail: err.detail }),
    ...(err.fields && { fields: err.fields }),
    ...(err.retryAfterSec !== undefined && { retryAfterSec: err.retryAfterSec }),
  };
  const headers: Record<string, string> = { 'Content-Type': 'application/problem+json' };
  if (err.retryAfterSec !== undefined) headers['Retry-After'] = String(err.retryAfterSec);
  return c.json(body, err.status, headers);
}
