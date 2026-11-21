import { createMiddleware } from 'hono/factory';
import { verify } from 'hono/jwt';
import type { AppEnv } from '../env';
import { AppError } from '../lib/errors';
import type { AccessClaims } from '../modules/auth/service';

/**
 * Trusts the 15-minute access token without a session lookup, so a logout or
 * revocation takes effect when the token expires.
 */
export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const header = c.req.header('Authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  if (!token) throw new AppError('UNAUTHORIZED', 401);

  let claims: AccessClaims;
  try {
    claims = (await verify(token, c.env.JWT_SECRET, 'HS256')) as AccessClaims;
  } catch {
    throw new AppError('UNAUTHORIZED', 401, 'Access token invalid or expired');
  }
  c.set('userId', claims.sub);
  c.set('sessionId', claims.sid);
  await next();
});
