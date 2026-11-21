import { and, eq } from 'drizzle-orm';
import { createMiddleware } from 'hono/factory';
import { idempotencyKeys } from '../db/schema';
import type { AppEnv } from '../env';
import { AppError } from '../lib/errors';

export const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;
const KEY_FORMAT = /^[A-Za-z0-9-]{8,128}$/;

async function sha256(text: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Same key + same body replays the stored response for 24 h. 5xx responses aren't stored,
 * so the client can retry with the same key.
 */
export const idempotency = createMiddleware<AppEnv>(async (c, next) => {
  const key = c.req.header('Idempotency-Key');
  if (!key || !KEY_FORMAT.test(key)) {
    throw new AppError(
      'IDEMPOTENCY_KEY_REQUIRED',
      400,
      'Send a UUID in the Idempotency-Key header',
    );
  }

  const db = c.get('db');
  const userId = c.get('userId') ?? '';
  const route = `${c.req.method} ${c.req.routePath}`;
  const requestHash = await sha256(`${c.req.method} ${c.req.path}\n${await c.req.text()}`);
  const where = and(eq(idempotencyKeys.userId, userId), eq(idempotencyKeys.key, key));

  const claim = async () =>
    (
      await db
        .insert(idempotencyKeys)
        .values({ key, userId, route, requestHash })
        .onConflictDoNothing()
        .returning({ key: idempotencyKeys.key })
    ).length === 1;

  let claimed = await claim();
  if (!claimed) {
    const stale = await db.select().from(idempotencyKeys).where(where).get();
    if (stale && stale.createdAt < Date.now() - IDEMPOTENCY_TTL_MS) {
      await db.delete(idempotencyKeys).where(where);
      claimed = await claim();
    }
  }

  if (!claimed) {
    const existing = await db.select().from(idempotencyKeys).where(where).get();
    if (!existing || existing.statusCode === null) {
      throw new AppError('IDEMPOTENCY_IN_PROGRESS', 409);
    }
    if (existing.requestHash !== requestHash) {
      throw new AppError('IDEMPOTENCY_KEY_REUSED', 422, 'Key was used with a different request');
    }

    return new Response(existing.response, {
      status: existing.statusCode,
      headers: {
        'Content-Type': existing.contentType ?? 'application/json',
        'Idempotent-Replayed': 'true',
      },
    });
  }

  try {
    await next();
  } catch (err) {
    await db.delete(idempotencyKeys).where(where);
    throw err;
  }

  if (c.res.status >= 500) {
    await db.delete(idempotencyKeys).where(where);
    return;
  }
  await db
    .update(idempotencyKeys)
    .set({
      statusCode: c.res.status,
      contentType: c.res.headers.get('Content-Type'),
      response: await c.res.clone().text(),
    })
    .where(where);
});
