import { createRoute, z } from '@hono/zod-openapi';
import {
  AcceptBookingBody,
  DeclineBookingBody,
  FinishJobBody,
  OnMyWayBody,
  PartnerBookingDetail,
  PartnerBookingList,
  PartnerBookingListQuery,
  Problem,
  StartJobBody,
} from '@senzo/schemas';
import { createRouter } from '../../lib/router';
import { requireChef } from '../../middleware/chef';
import { requireAuth } from '../../middleware/auth';
import * as partner from './service';

const json = <T>(description: string, schema: T) => ({
  description,
  content: { 'application/json': { schema } },
});
const problem = (description: string) => ({
  description,
  content: { 'application/problem+json': { schema: Problem } },
});
const body = <T>(schema: T) => ({
  body: { required: true, content: { 'application/json': { schema } } },
});

const guarded = {
  tags: ['partner'],
  security: [{ bearer: [] }],
  middleware: [requireAuth, requireChef],
};
const params = z.object({ bookingId: z.string().min(1) });
const common = {
  401: problem('Not signed in'),
  403: problem('Not a chef account'),
  404: problem("No such booking, or it isn't this chef's"),
};
const action = {
  200: json('The booking after the change', PartnerBookingDetail),
  ...common,
  409: problem('Not allowed in the booking’s current state (INVALID_TRANSITION, STATE_CONFLICT)'),
};
const withCode = {
  ...action,
  422: problem('Wrong, early or expired code (OTP_INVALID); detail says tries left'),
  423: problem('Locked after 5 wrong codes (OTP_LOCKED)'),
};

export const partnerBookingRoutes = createRouter()
  .openapi(
    createRoute({
      method: 'get',
      path: '/',
      operationId: 'listPartnerBookings',
      summary: "The chef's requests, upcoming jobs or past jobs (C04, C16)",
      ...guarded,
      request: { query: PartnerBookingListQuery },
      responses: { 200: json('Bookings', PartnerBookingList), 401: common[401], 403: common[403] },
    }),
    async (c) =>
      c.json(
        await partner.listChefBookings(c.get('db'), c.get('chefId')!, c.req.valid('query')),
        200,
      ),
  )
  .openapi(
    createRoute({
      method: 'get',
      path: '/{bookingId}',
      operationId: 'getPartnerBooking',
      summary: 'One booking; the street address unlocks after accepting (C05)',
      ...guarded,
      request: { params },
      responses: { 200: json('Booking', PartnerBookingDetail), ...common },
    }),
    async (c) =>
      c.json(
        await partner.getChefBooking(c.get('db'), c.get('chefId')!, c.req.valid('param').bookingId),
        200,
      ),
  )
  .openapi(
    createRoute({
      method: 'post',
      path: '/{bookingId}/accept',
      operationId: 'acceptBooking',
      summary: 'Accept a request after reading the allergies (C05)',
      ...guarded,
      request: { params, ...body(AcceptBookingBody) },
      responses: action,
    }),
    async (c) =>
      c.json(
        await partner.acceptBooking(
          c.get('db'),
          c.env,
          c.get('chefId')!,
          c.req.valid('param').bookingId,
        ),
        200,
      ),
  )
  .openapi(
    createRoute({
      method: 'post',
      path: '/{bookingId}/decline',
      operationId: 'declineBooking',
      summary: 'Decline a request; the guest is refunded in full (C05)',
      ...guarded,
      request: { params, ...body(DeclineBookingBody) },
      responses: action,
    }),
    async (c) =>
      c.json(
        await partner.declineBooking(
          c.get('db'),
          c.get('chefId')!,
          c.req.valid('param').bookingId,
          c.req.valid('json').reason,
        ),
        200,
      ),
  )
  .openapi(
    createRoute({
      method: 'post',
      path: '/{bookingId}/on-my-way',
      operationId: 'markOnMyWay',
      summary: 'Tell the guest you are travelling, with an ETA (C13)',
      ...guarded,
      request: { params, ...body(OnMyWayBody) },
      responses: action,
    }),
    async (c) =>
      c.json(
        await partner.onMyWay(
          c.get('db'),
          c.get('chefId')!,
          c.req.valid('param').bookingId,
          c.req.valid('json').etaMinutes,
        ),
        200,
      ),
  )
  .openapi(
    createRoute({
      method: 'post',
      path: '/{bookingId}/start',
      operationId: 'startJob',
      summary: "Enter the guest's start code at the door; location is read once (C06)",
      ...guarded,
      request: { params, ...body(StartJobBody) },
      responses: withCode,
    }),
    async (c) =>
      c.json(
        await partner.startJob(
          c.get('db'),
          c.env,
          c.get('chefId')!,
          c.req.valid('param').bookingId,
          c.req.valid('json'),
        ),
        200,
      ),
  )
  .openapi(
    createRoute({
      method: 'post',
      path: '/{bookingId}/done',
      operationId: 'markJobDone',
      summary: 'Cooking is done; creates the finish code for the guest (C07)',
      ...guarded,
      request: { params },
      responses: action,
    }),
    async (c) =>
      c.json(
        await partner.markDone(
          c.get('db'),
          c.env,
          c.get('chefId')!,
          c.req.valid('param').bookingId,
        ),
        200,
      ),
  )
  .openapi(
    createRoute({
      method: 'post',
      path: '/{bookingId}/finish',
      operationId: 'finishJob',
      summary: "Enter the guest's finish code; payout is released 24 h later (C08)",
      ...guarded,
      request: { params, ...body(FinishJobBody) },
      responses: withCode,
    }),
    async (c) =>
      c.json(
        await partner.finishJob(
          c.get('db'),
          c.env,
          c.get('chefId')!,
          c.req.valid('param').bookingId,
          c.req.valid('json').otp,
        ),
        200,
      ),
  );
