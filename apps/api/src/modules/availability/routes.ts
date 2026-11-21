import { createRoute, z } from '@hono/zod-openapi';
import { ChefMonthAvailability, Problem } from '@senzo/schemas';
import { createRouter } from '../../lib/router';
import { chefMonth } from './service';

export const availabilityRoutes = createRouter().openapi(
  createRoute({
    method: 'get',
    path: '/{chefId}/availability',
    operationId: 'getChefAvailability',
    tags: ['discovery'],
    summary: 'Open, booked and off slots for one month (G08)',
    request: {
      params: z.object({ chefId: z.string().min(1) }),
      query: z.object({ month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use YYYY-MM') }),
    },
    responses: {
      200: {
        description: 'One entry per day',
        content: { 'application/json': { schema: ChefMonthAvailability } },
      },
      404: {
        description: 'Chef not found',
        content: { 'application/problem+json': { schema: Problem } },
      },
    },
  }),
  async (c) => {
    const { chefId } = c.req.valid('param');
    const { month } = c.req.valid('query');
    return c.json(await chefMonth(c.get('db'), chefId, month), 200);
  },
);
