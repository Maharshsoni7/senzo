import { log } from '../lib/log';

const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export async function verifyTurnstile(secret: string, token: string, ip?: string) {
  const body = new FormData();
  body.set('secret', secret);
  body.set('response', token);
  if (ip) body.set('remoteip', ip);
  try {
    const res = await fetch(SITEVERIFY, {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(5000),
    });
    const out = (await res.json()) as { success: boolean; 'error-codes'?: string[] };
    if (!out.success) log.warn('turnstile rejected', { errors: out['error-codes'] });
    return out.success;
  } catch (err) {
    log.error('turnstile unreachable', { err });
    return false;
  }
}
