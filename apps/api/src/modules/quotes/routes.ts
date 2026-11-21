import { createRoute } from '@hono/zod-openapi';
import { Problem, Quote, QuoteRequest } from '@senzo/schemas';
import { createRouter } from '../../lib/router';
import { quote } from './service';

export const quoteRoutes = createRouter().openapi(
  createRoute({
    method: 'post',
    path: '/',
    operationId: 'createQuote',
    tags: ['menus'],
    summary: 'Price a menu choice on the server (G22, G08, G09)',
    request: {
      body: { required: true, content: { 'application/json': { schema: QuoteRequest } } },
    },
    responses: {
      200: { description: 'Price breakdown', content: { 'application/json': { schema: Quote } } },
      404: {
        description: 'Menu not found or not live',
        content: { 'application/problem+json': { schema: Problem } },
      },
      422: {
        description: 'Guests out of range, food rule not offered or promo invalid',
        content: { 'application/problem+json': { schema: Problem } },
      },
    },
  }),
  async (c) => {
    const { chef, ...guestView } = await quote(c.get('db'), c.req.valid('json'));
    return c.json(guestView, 200);
  },
);
