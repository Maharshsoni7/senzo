import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { createDb } from './db';
import type { AppEnv } from './env';
import { AppError, problem } from './lib/errors';
import { log } from './lib/log';

export function createApp() {
  const app = new OpenAPIHono<AppEnv>({
    defaultHook: (result, c) => {
      if (!result.success) {
        const fields: Record<string, string[]> = {};
        for (const issue of result.error.issues) {
          (fields[issue.path.join('.') || '_'] ??= []).push(issue.message);
        }
        return problem(c, new AppError('VALIDATION_FAILED', 400, undefined, fields));
      }
    },
  });

  app.use('*', async (c, next) => {
    c.set('db', createDb(c.env.DB));
    await next();
  });

  app.onError((err, c) => {
    if (err instanceof AppError) return problem(c, err);
    log.error('unhandled', { err, route: c.req.routePath });
    return problem(c, new AppError('INTERNAL', 500));
  });
  app.notFound((c) => problem(c, new AppError('NOT_FOUND', 404)));

  app.openapi(
    createRoute({
      method: 'get',
      path: '/v1/health',
      tags: ['system'],
      responses: {
        200: {
          description: 'API is up',
          content: { 'application/json': { schema: z.object({ ok: z.literal(true) }) } },
        },
      },
    }),
    (c) => c.json({ ok: true as const }, 200),
  );

  app.doc31('/openapi.json', {
    openapi: '3.1.0',
    info: { title: 'Senzo API', version: '1' },
  });

  return app;
}
