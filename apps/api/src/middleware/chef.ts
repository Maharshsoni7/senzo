import { eq } from 'drizzle-orm';
import { createMiddleware } from 'hono/factory';
import { chefs } from '../db/schema';
import type { AppEnv } from '../env';
import { AppError } from '../lib/errors';

/** Runs after requireAuth. Any chef status passes: paused chefs still finish accepted jobs. */
export const requireChef = createMiddleware<AppEnv>(async (c, next) => {
  const chef = await c
    .get('db')
    .select({ id: chefs.id })
    .from(chefs)
    .where(eq(chefs.userId, c.get('userId')!))
    .get();
  if (!chef) throw new AppError('FORBIDDEN', 403, 'Not a Senzo Partner account');
  c.set('chefId', chef.id);
  await next();
});
