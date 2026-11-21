import { OpenAPIHono } from '@hono/zod-openapi';
import type { AppEnv } from '../env';
import { AppError, problem } from './errors';

/** Every router needs this hook, or zod failures skip problem+json. */
export const createRouter = () =>
  new OpenAPIHono<AppEnv>({
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
