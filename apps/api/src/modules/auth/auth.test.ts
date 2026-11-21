import { env } from 'cloudflare:workers';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../app';
import { createDb } from '../../db';
import { otpCodes, sessions } from '../../db/schema';
import { OTP_TTL_MS } from './service';

const app = createApp();
const PHONE = '+919876543210';

const call = (path: string, body?: unknown, headers: Record<string, string> = {}) =>
  app.request(
    `/v1/auth${path}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    },
    env,
  );

const requestOtp = (phone = PHONE) => call('/otp/request', { phone, turnstileToken: 'tok' });
const verify = (code = '123456', phone = PHONE, appKind: 'guest' | 'partner' = 'guest') =>
  call('/otp/verify', { phone, code, device: { platform: 'android', app: appKind } });

type Signed = { accessToken: string; refreshToken: string; isNewUser: boolean; roles: string[] };

async function signIn() {
  await requestOtp();
  return (await (await verify()).json()) as Signed;
}

let turnstileOk = true;

beforeEach(async () => {
  turnstileOk = true;
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
    Response.json({ success: turnstileOk }),
  );
  const db = createDb(env.DB);
  await db.delete(otpCodes);
  await db.delete(sessions);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('POST /otp/request', () => {
  it('sends a code and asks the app to wait 30 s', async () => {
    const res = await requestOtp();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ retryAfterSec: 30 });
  });

  it('rejects a failed Turnstile check', async () => {
    turnstileOk = false;
    const res = await requestOtp();
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ code: 'TURNSTILE_FAILED' });
  });

  it('enforces the 30 s resend cooldown', async () => {
    await requestOtp();
    const res = await requestOtp();
    expect(res.status).toBe(429);
    expect(Number(res.headers.get('Retry-After'))).toBeGreaterThan(0);
  });

  it('allows the first send plus 3 resends per hour', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const start = Date.now();
    for (let i = 0; i < 4; i++) {
      vi.setSystemTime(start + i * 31_000);
      expect((await requestOtp()).status).toBe(200);
    }
    vi.setSystemTime(start + 5 * 31_000);
    const res = await requestOtp();
    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ code: 'RATE_LIMITED' });
  });

  it('returns field errors for a bad phone number', async () => {
    const res = await requestOtp('12345');
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({
      code: 'VALIDATION_FAILED',
      fields: { phone: [expect.any(String)] },
    });
  });
});

describe('POST /otp/verify', () => {
  it('signs in a new guest', async () => {
    const out = await signIn();
    expect(out).toMatchObject({ isNewUser: true, roles: ['guest'] });
    expect(out.accessToken.split('.')).toHaveLength(3);
  });

  it('recognises a returning user', async () => {
    await signIn();
    expect(await signIn()).toMatchObject({ isNewUser: false });
  });

  it('accepts the number in any common format', async () => {
    await requestOtp('98765 43210');
    expect((await verify('123456', '+91 98765-43210')).status).toBe(200);
  });

  it('gives a new partner-app user no role until onboarding', async () => {
    await requestOtp('+919876500001');
    const res = await verify('123456', '+919876500001', 'partner');
    expect(await res.json()).toMatchObject({ isNewUser: true, roles: [] });
  });

  it('counts down tries and locks after 5 wrong codes', async () => {
    await requestOtp();
    const first = await verify('000000');
    expect(first.status).toBe(422);
    expect(await first.json()).toMatchObject({ code: 'OTP_INVALID', detail: '4 tries left' });
    for (let i = 0; i < 3; i++) await verify('000000');
    expect((await verify('000000')).status).toBe(423);
    expect((await verify('123456')).status).toBe(423);
  });

  it('rejects an expired code', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    await requestOtp();
    vi.setSystemTime(Date.now() + OTP_TTL_MS + 1);
    expect((await verify()).status).toBe(422);
  });

  it('cannot reuse a code', async () => {
    await requestOtp();
    expect((await verify()).status).toBe(200);
    expect((await verify()).status).toBe(422);
  });
});

describe('sessions', () => {
  it('rotates the refresh token', async () => {
    const { refreshToken } = await signIn();
    const res = await call('/refresh', { refreshToken });
    expect(res.status).toBe(200);
    const next = (await res.json()) as Signed;
    expect(next.refreshToken).not.toBe(refreshToken);
  });

  it('signs out every device when an old refresh token is reused', async () => {
    const phone = await signIn();
    const laptop = await signIn();
    const rotated = (await (
      await call('/refresh', { refreshToken: phone.refreshToken })
    ).json()) as Signed;

    const reuse = await call('/refresh', { refreshToken: phone.refreshToken });
    expect(reuse.status).toBe(401);
    expect(await reuse.json()).toMatchObject({ code: 'SESSION_REVOKED' });

    expect((await call('/refresh', { refreshToken: rotated.refreshToken })).status).toBe(401);
    expect((await call('/refresh', { refreshToken: laptop.refreshToken })).status).toBe(401);
  });

  it('logs out the current session', async () => {
    const { accessToken, refreshToken } = await signIn();
    expect((await call('/logout')).status).toBe(401);
    const res = await call('/logout', undefined, { Authorization: `Bearer ${accessToken}` });
    expect(res.status).toBe(204);
    expect((await call('/refresh', { refreshToken })).status).toBe(401);
  });

  it('rejects an unknown refresh token', async () => {
    expect((await call('/refresh', { refreshToken: 'nope' })).status).toBe(401);
  });
});

it('documents the auth routes', async () => {
  const res = await app.request('/openapi.json', {}, env);
  const doc = (await res.json()) as { paths: Record<string, unknown> };
  expect(Object.keys(doc.paths)).toEqual(
    expect.arrayContaining([
      '/v1/auth/otp/request',
      '/v1/auth/otp/verify',
      '/v1/auth/refresh',
      '/v1/auth/logout',
    ]),
  );
});
