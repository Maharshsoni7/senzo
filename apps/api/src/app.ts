import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { AppError, problem } from './lib/errors';

export function createApp() {
  const app = new OpenAPIHono({
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

  app.onError((err, c) => {
    if (err instanceof AppError) return problem(c, err);
    console.error(err);
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
