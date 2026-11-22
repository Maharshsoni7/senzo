import { createRoute, z } from '@hono/zod-openapi';
import { cors } from 'hono/cors';
import { createDb } from './db';
import { AppError, problem } from './lib/errors';
import { log } from './lib/log';
import { createRouter } from './lib/router';
import { authRoutes } from './modules/auth/routes';
import { availabilityRoutes } from './modules/availability/routes';
import { bookingRoutes } from './modules/bookings/routes';
import { partnerBookingRoutes } from './modules/partner-bookings/routes';
import { discoveryRoutes } from './modules/discovery/routes';
import { quoteRoutes } from './modules/quotes/routes';

export const OPENAPI_CONFIG = {
  openapi: '3.1.0',
  info: { title: 'Senzo API', version: '1' },
};

const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

export function createApp() {
  const app = createRouter();

  // Only the local Expo web preview, and only in development; the public site gets its own entry.
  app.use(
    '*',
    cors({
      origin: (origin, c) =>
        c.env.ENVIRONMENT === 'development' && LOCAL_ORIGIN.test(origin) ? origin : null,
      allowHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
      exposeHeaders: ['Retry-After', 'Idempotent-Replayed'],
      maxAge: 600,
    }),
  );

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
      operationId: 'getHealth',
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

  app.route('/v1/auth', authRoutes);
  app.route('/v1/quotes', quoteRoutes);
  app.route('/v1/bookings', bookingRoutes);
  app.route('/v1/partner/bookings', partnerBookingRoutes);
  app.route('/v1/chefs', availabilityRoutes);
  app.route('/v1/chefs', discoveryRoutes);

  app.openAPIRegistry.registerComponent('securitySchemes', 'bearer', {
    type: 'http',
    scheme: 'bearer',
  });
  app.doc31('/openapi.json', OPENAPI_CONFIG);

  return app;
}
