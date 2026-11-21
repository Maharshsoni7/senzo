import type { AppKind, OtpRequest, OtpVerify, Role, TokenPair } from '@senzo/schemas';
import { and, desc, eq, gt, isNull } from 'drizzle-orm';
import { sign } from 'hono/jwt';
import type { Db } from '../../db';
import { devices, otpCodes, sessions, users } from '../../db/schema';
import type { Bindings } from '../../env';
import { hmacSha256, randomDigits, randomToken, safeEqual } from '../../lib/crypto';
import { AppError } from '../../lib/errors';
import { otpSender } from '../../vendors/sms';
import { verifyTurnstile } from '../../vendors/turnstile';

const MINUTE = 60_000;
export const OTP_TTL_MS = 5 * MINUTE;
export const OTP_RESEND_COOLDOWN_MS = 30_000;
// Business rules §8: first send + 3 resends per hour.
export const OTP_MAX_SENDS_PER_HOUR = 4;
export const OTP_MAX_ATTEMPTS = 5;
export const ACCESS_TTL_MS = 15 * MINUTE;
export const REFRESH_TTL_MS = 30 * 24 * 60 * MINUTE;

export type AccessClaims = { sub: string; sid: string; exp: number; iat: number };

export async function requestOtp(db: Db, env: Bindings, input: OtpRequest, ip?: string) {
  if (!(await verifyTurnstile(env.TURNSTILE_SECRET, input.turnstileToken, ip))) {
    throw new AppError('TURNSTILE_FAILED', 403, 'Verification failed; reload and try again');
  }

  const now = Date.now();
  const recent = await db
    .select({ createdAt: otpCodes.createdAt })
    .from(otpCodes)
    .where(and(eq(otpCodes.phoneE164, input.phone), gt(otpCodes.createdAt, now - 60 * MINUTE)))
    .orderBy(desc(otpCodes.createdAt));

  const last = recent[0]?.createdAt;
  if (last && now - last < OTP_RESEND_COOLDOWN_MS) {
    throw rateLimited(last + OTP_RESEND_COOLDOWN_MS - now);
  }
  if (recent.length >= OTP_MAX_SENDS_PER_HOUR) {
    throw rateLimited(recent.at(-1)!.createdAt + 60 * MINUTE - now);
  }

  const sender = otpSender(env);
  const code = sender.fixedCode ?? randomDigits(6);
  await db.insert(otpCodes).values({
    phoneE164: input.phone,
    purpose: 'login',
    codeHash: await hashOtp(env, input.phone, code),
    expiresAt: now + OTP_TTL_MS,
    createdAt: now,
  });
  await sender.send(input.phone, code, input.channel);

  return { retryAfterSec: OTP_RESEND_COOLDOWN_MS / 1000 };
}

export async function verifyOtp(db: Db, env: Bindings, input: OtpVerify) {
  const now = Date.now();
  const otp = await db
    .select()
    .from(otpCodes)
    .where(and(eq(otpCodes.phoneE164, input.phone), gt(otpCodes.expiresAt, now)))
    .orderBy(desc(otpCodes.createdAt))
    .get();

  if (!otp) throw new AppError('OTP_INVALID', 422, 'Code expired; request a new one');
  if (otp.attempts >= OTP_MAX_ATTEMPTS) throw new AppError('OTP_LOCKED', 423);

  if (!safeEqual(otp.codeHash, await hashOtp(env, input.phone, input.code))) {
    const attempts = otp.attempts + 1;
    await db.update(otpCodes).set({ attempts }).where(eq(otpCodes.id, otp.id));
    if (attempts >= OTP_MAX_ATTEMPTS) throw new AppError('OTP_LOCKED', 423);
    throw new AppError('OTP_INVALID', 422, `${OTP_MAX_ATTEMPTS - attempts} tries left`);
  }

  await db.delete(otpCodes).where(eq(otpCodes.phoneE164, input.phone));

  const { user, isNewUser } = await upsertUser(db, input.phone, input.device.app);
  const [device] = await db
    .insert(devices)
    .values({
      userId: user.id,
      platform: input.device.platform,
      app: input.device.app,
      pushToken: input.device.pushToken,
      lastSeenAt: now,
    })
    .returning({ id: devices.id });

  const tokens = await issueSession(db, env, user.id, device!.id);
  return { ...tokens, isNewUser, roles: user.roleFlags };
}

export async function refresh(db: Db, env: Bindings, refreshToken: string) {
  const now = Date.now();
  const session = await db
    .select()
    .from(sessions)
    .where(eq(sessions.refreshHash, await hmacSha256(env.OTP_PEPPER, refreshToken)))
    .get();
  if (!session) throw new AppError('UNAUTHORIZED', 401);

  // Conditional update so two concurrent refreshes can't both rotate the same token.
  const rotated = session.revokedAt
    ? []
    : await db
        .update(sessions)
        .set({ revokedAt: now })
        .where(and(eq(sessions.id, session.id), isNull(sessions.revokedAt)))
        .returning({ id: sessions.id });

  if (rotated.length === 0) {
    await db
      .update(sessions)
      .set({ revokedAt: now })
      .where(and(eq(sessions.userId, session.userId), isNull(sessions.revokedAt)));
    throw new AppError('SESSION_REVOKED', 401, 'Signed out on all devices; sign in again');
  }
  if (session.expiresAt <= now) throw new AppError('UNAUTHORIZED', 401, 'Session expired');

  return issueSession(db, env, session.userId, session.deviceId, session.id);
}

export async function logout(db: Db, sessionId: string) {
  await db
    .update(sessions)
    .set({ revokedAt: Date.now() })
    .where(and(eq(sessions.id, sessionId), isNull(sessions.revokedAt)));
}

async function upsertUser(db: Db, phoneE164: string, app: AppKind) {
  const role: Role | null = app === 'guest' ? 'guest' : null;
  const existing = await db.select().from(users).where(eq(users.phoneE164, phoneE164)).get();

  if (!existing) {
    const [user] = await db
      .insert(users)
      .values({ phoneE164, roleFlags: role ? [role] : [] })
      .returning();
    return { user: user!, isNewUser: true };
  }
  if (existing.status !== 'active') throw new AppError('FORBIDDEN', 403, 'Account not active');
  if (role && !existing.roleFlags.includes(role)) {
    const roleFlags = [...existing.roleFlags, role];
    await db.update(users).set({ roleFlags }).where(eq(users.id, existing.id));
    return { user: { ...existing, roleFlags }, isNewUser: false };
  }
  return { user: existing, isNewUser: false };
}

async function issueSession(
  db: Db,
  env: Bindings,
  userId: string,
  deviceId: string | null,
  rotatedFrom?: string,
): Promise<TokenPair> {
  const now = Date.now();
  const refreshToken = randomToken();
  const refreshExpiresAt = now + REFRESH_TTL_MS;
  const [session] = await db
    .insert(sessions)
    .values({
      userId,
      deviceId,
      refreshHash: await hmacSha256(env.OTP_PEPPER, refreshToken),
      expiresAt: refreshExpiresAt,
      rotatedFrom,
    })
    .returning({ id: sessions.id });

  const accessExpiresAt = now + ACCESS_TTL_MS;
  const claims: AccessClaims = {
    sub: userId,
    sid: session!.id,
    iat: Math.floor(now / 1000),
    exp: Math.floor(accessExpiresAt / 1000),
  };
  return {
    accessToken: await sign(claims, env.JWT_SECRET, 'HS256'),
    accessExpiresAt: new Date(accessExpiresAt).toISOString(),
    refreshToken,
    refreshExpiresAt: new Date(refreshExpiresAt).toISOString(),
  };
}

const hashOtp = (env: Bindings, phone: string, code: string) =>
  hmacSha256(env.OTP_PEPPER, `otp:${phone}:${code}`);

function rateLimited(waitMs: number) {
  const sec = Math.ceil(waitMs / 1000);
  return new AppError('RATE_LIMITED', 429, `Try again in ${sec} s`, undefined, sec);
}
