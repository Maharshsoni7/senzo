import { createRoute } from '@hono/zod-openapi';
import {
  AuthResult,
  OtpRequest,
  OtpRequestResult,
  OtpVerify,
  Problem,
  RefreshRequest,
  TokenPair,
} from '@senzo/schemas';
import { createRouter } from '../../lib/router';
import { requireAuth } from '../../middleware/auth';
import * as auth from './service';

const json = <T>(schema: T) => ({ content: { 'application/json': { schema } } });
const problem = (description: string) => ({
  description,
  content: { 'application/problem+json': { schema: Problem } },
});

export const authRoutes = createRouter()
  .openapi(
    createRoute({
      method: 'post',
      path: '/otp/request',
      operationId: 'requestOtp',
      tags: ['auth'],
      summary: 'Send a login code by SMS or voice call',
      request: { body: { required: true, ...json(OtpRequest) } },
      responses: {
        200: { description: 'Code sent', ...json(OtpRequestResult) },
        403: problem('Turnstile check failed'),
        429: problem('Too many codes for this number'),
      },
    }),
    async (c) => {
      const out = await auth.requestOtp(
        c.get('db'),
        c.env,
        c.req.valid('json'),
        c.req.header('CF-Connecting-IP'),
      );
      return c.json(out, 200);
    },
  )
  .openapi(
    createRoute({
      method: 'post',
      path: '/otp/verify',
      operationId: 'verifyOtp',
      tags: ['auth'],
      summary: 'Check the code and start a session',
      request: { body: { required: true, ...json(OtpVerify) } },
      responses: {
        200: { description: 'Signed in', ...json(AuthResult) },
        422: problem('Wrong or expired code'),
        423: problem('Too many wrong tries'),
      },
    }),
    async (c) => c.json(await auth.verifyOtp(c.get('db'), c.env, c.req.valid('json')), 200),
  )
  .openapi(
    createRoute({
      method: 'post',
      path: '/refresh',
      operationId: 'refreshSession',
      tags: ['auth'],
      summary: 'Swap a refresh token for a new pair; the old one stops working',
      request: { body: { required: true, ...json(RefreshRequest) } },
      responses: {
        200: { description: 'New tokens', ...json(TokenPair) },
        401: problem('Unknown, expired or reused refresh token'),
      },
    }),
    async (c) =>
      c.json(await auth.refresh(c.get('db'), c.env, c.req.valid('json').refreshToken), 200),
  )
  .openapi(
    createRoute({
      method: 'post',
      path: '/logout',
      operationId: 'logout',
      tags: ['auth'],
      security: [{ bearer: [] }],
      middleware: [requireAuth] as const,
      responses: { 204: { description: 'Signed out' }, 401: problem('Not signed in') },
    }),
    async (c) => {
      await auth.logout(c.get('db'), c.get('sessionId')!);
      return c.body(null, 204);
    },
  );
