import { createRoute, z } from '@hono/zod-openapi';
import {
  ChefList,
  ChefListQuery,
  ChefMenus,
  ChefProfile,
  ChefReviews,
  Problem,
} from '@senzo/schemas';
import { createRouter } from '../../lib/router';
import { chefMenus, chefProfile, chefReviews, listChefs } from './service';

const json = <T>(description: string, schema: T) => ({
  description,
  content: { 'application/json': { schema } },
});
const notFound = {
  description: 'Chef not found or not live',
  content: { 'application/problem+json': { schema: Problem } },
};

export const discoveryRoutes = createRouter()
  .openapi(
    createRoute({
      method: 'get',
      path: '/',
      operationId: 'listChefs',
      tags: ['discovery'],
      summary: 'Home rail and search (G04, G05): live chefs, ranked',
      request: { query: ChefListQuery },
      responses: { 200: json('Ranked chef cards', ChefList) },
    }),
    async (c) => c.json(await listChefs(c.get('db'), c.req.valid('query')), 200),
  )
  .openapi(
    createRoute({
      method: 'get',
      path: '/{slug}',
      operationId: 'getChefProfile',
      tags: ['discovery'],
      summary: 'Chef profile with verified proofs only (G07)',
      request: { params: z.object({ slug: z.string().min(1) }) },
      responses: { 200: json('Profile', ChefProfile), 404: notFound },
    }),
    async (c) => c.json(await chefProfile(c.get('db'), c.req.valid('param').slug), 200),
  )
  .openapi(
    createRoute({
      method: 'get',
      path: '/{chefId}/menus',
      operationId: 'getChefMenus',
      tags: ['discovery'],
      summary: 'Live set menus with bands, courses, options and add-ons (G07, G22)',
      request: { params: z.object({ chefId: z.string().min(1) }) },
      responses: { 200: json('Menus', ChefMenus), 404: notFound },
    }),
    async (c) => c.json(await chefMenus(c.get('db'), c.req.valid('param').chefId), 200),
  )
  .openapi(
    createRoute({
      method: 'get',
      path: '/{chefId}/reviews',
      operationId: 'getChefReviews',
      tags: ['discovery'],
      summary: 'Public guest reviews, newest first (G07)',
      request: {
        params: z.object({ chefId: z.string().min(1) }),
        query: z.object({
          cursor: z.string().optional(),
          limit: z.coerce.number().int().min(1).max(50).default(20),
        }),
      },
      responses: { 200: json('Reviews', ChefReviews), 404: notFound },
    }),
    async (c) => {
      const { limit, cursor } = c.req.valid('query');
      return c.json(
        await chefReviews(c.get('db'), c.req.valid('param').chefId, limit, cursor),
        200,
      );
    },
  );
