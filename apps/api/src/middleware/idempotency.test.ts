import { env } from 'cloudflare:workers';
import { Hono } from 'hono';
import { beforeEach, describe, expect, it } from 'vitest';
import { createDb } from '../db';
import { idempotencyKeys } from '../db/schema';
import type { AppEnv } from '../env';
import { AppError, problem } from '../lib/errors';
import { IDEMPOTENCY_TTL_MS, idempotency } from './idempotency';

let calls = 0;
let failNext = false;

const app = new Hono<AppEnv>()
  .use('*', async (c, next) => {
    c.set('db', createDb(c.env.DB));
    c.set('userId', 'user-1');
    await next();
  })
  .onError((err, c) => (err instanceof AppError ? problem(c, err) : c.json({ boom: true }, 500)))
  .post('/charge', idempotency, async (c) => {
    calls++;
    if (failNext) {
      failNext = false;
      throw new Error('vendor down');
    }
    return c.json({ charge: calls }, 201);
  });

const post = (key: string | null, body: unknown) =>
  app.request(
    '/charge',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(key && { 'Idempotency-Key': key }) },
      body: JSON.stringify(body),
    },
    env,
  );

const KEY = '7c1d3b0e-4f5a-4b6c-8d9e-0a1b2c3d4e5f';

beforeEach(async () => {
  calls = 0;
  failNext = false;
  await createDb(env.DB).delete(idempotencyKeys);
});

describe('idempotency', () => {
  it('requires the header', async () => {
    const res = await post(null, { a: 1 });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: 'IDEMPOTENCY_KEY_REQUIRED' });
  });

  it('replays the first response for the same key and body', async () => {
    const first = await post(KEY, { a: 1 });
    const second = await post(KEY, { a: 1 });
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(await second.json()).toEqual(await first.json());
    expect(second.headers.get('Idempotent-Replayed')).toBe('true');
    expect(calls).toBe(1);
  });

  it('rejects the same key with a different body', async () => {
    await post(KEY, { a: 1 });
    const res = await post(KEY, { a: 2 });
    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ code: 'IDEMPOTENCY_KEY_REUSED' });
  });

  it('lets the client retry after a 5xx', async () => {
    failNext = true;
    expect((await post(KEY, { a: 1 })).status).toBe(500);
    expect((await post(KEY, { a: 1 })).status).toBe(201);
    expect(calls).toBe(2);
  });

  it('answers 409 while the first request is still running', async () => {
    await createDb(env.DB)
      .insert(idempotencyKeys)
      .values({ key: KEY, userId: 'user-1', route: 'POST /charge', requestHash: 'x' });
    const res = await post(KEY, { a: 1 });
    expect(res.status).toBe(409);
  });

  it('treats keys older than 24 h as new', async () => {
    await createDb(env.DB)
      .insert(idempotencyKeys)
      .values({
        key: KEY,
        userId: 'user-1',
        route: 'POST /charge',
        requestHash: 'old',
        statusCode: 201,
        response: '{"charge":99}',
        createdAt: Date.now() - IDEMPOTENCY_TTL_MS - 1,
      });
    const res = await post(KEY, { a: 1 });
    expect(await res.json()).toEqual({ charge: 1 });
  });
});
