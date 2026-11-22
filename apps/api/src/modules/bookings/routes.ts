import { createRoute, z } from '@hono/zod-openapi';
import { BookingDetail, BookingList, BookingListQuery, Problem } from '@senzo/schemas';
import { requireAuth } from '../../middleware/auth';
import { createRouter } from '../../lib/router';
import { getGuestBooking, listGuestBookings } from './service';

const json = <T>(description: string, schema: T) => ({
  description,
  content: { 'application/json': { schema } },
});
const problem = (description: string) => ({
  description,
  content: { 'application/problem+json': { schema: Problem } },
});

export const bookingRoutes = createRouter()
  .openapi(
    createRoute({
      method: 'get',
      path: '/',
      operationId: 'listMyBookings',
      tags: ['bookings'],
      summary: "The guest's bookings, coming up or past (G11)",
      security: [{ bearer: [] }],
      middleware: [requireAuth] as const,
      request: { query: BookingListQuery },
      responses: { 200: json('Bookings', BookingList), 401: problem('Not signed in') },
    }),
    async (c) =>
      c.json(
        await listGuestBookings(
          c.get('db'),
          c.env.OTP_PEPPER,
          c.get('userId')!,
          c.req.valid('query'),
        ),
        200,
      ),
  )
  .openapi(
    createRoute({
      method: 'get',
      path: '/{bookingId}',
      operationId: 'getMyBooking',
      tags: ['bookings'],
      summary: 'One booking with its live status and the start/finish code when due (G12)',
      security: [{ bearer: [] }],
      middleware: [requireAuth] as const,
      request: { params: z.object({ bookingId: z.string().min(1) }) },
      responses: {
        200: json('Booking', BookingDetail),
        401: problem('Not signed in'),
        404: problem("No such booking, or it isn't this guest's"),
      },
    }),
    async (c) =>
      c.json(
        await getGuestBooking(
          c.get('db'),
          c.env.OTP_PEPPER,
          c.get('userId')!,
          c.req.valid('param').bookingId,
        ),
        200,
      ),
  );
