import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { createApp } from './app';

const app = createApp();
const get = (path: string) => app.request(path, {}, env);

describe('api skeleton', () => {
  it('answers the health check', async () => {
    const res = await get('/v1/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('returns problem+json for unknown routes', async () => {
    const res = await get('/v1/nope');
    expect(res.status).toBe(404);
    expect(res.headers.get('content-type')).toContain('application/problem+json');
    expect(await res.json()).toMatchObject({ code: 'NOT_FOUND', status: 404 });
  });

  it('serves the OpenAPI document', async () => {
    const res = await get('/openapi.json');
    const doc = (await res.json()) as { paths: Record<string, unknown> };
    expect(Object.keys(doc.paths)).toContain('/v1/health');
  });
});
