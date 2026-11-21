---
name: new-endpoint
description: Add or change a Senzo API route in apps/api (Hono + zod-openapi + Drizzle on D1), with schemas, service, tests and the regenerated client. Use when a screen needs an API that doesn't exist yet.
argument-hint: "[METHOD /v1/path]"
---

# Add endpoint $ARGUMENTS

1. Find the route in `docs/api.md` (request, response, module, who calls it). If it isn't there, propose the shape and add it to `docs/api.md` in the same change.
2. Schemas: add/extend zod schemas in `packages/schemas` (request, response, error codes). Money in paise, times as ISO UTC strings.
3. Route: `apps/api/src/modules/<module>/routes.ts` with `createRoute` (tags, auth, Idempotency-Key header if it creates bookings or moves money).
4. Service: business logic in `service.ts`; SQL in `repo.ts` with Drizzle; related writes in one `db.batch()`; booking state changes only through `bookings.transition()`; money changes write ledger entries; emit outbox events listed in `docs/api.md`.
5. Rules: check `docs/business-rules.md` and `docs/booking-states.md`; keep CPU light (Queue anything slow); errors via `AppError` with a stable code.
6. Tests: Vitest unit tests for the rules; an integration test with the Workers pool (local D1) covering success, validation error, auth error and the main business errors.
7. Regenerate the client: `pnpm --filter api-client generate`; fix type errors in apps.
8. Run `pnpm typecheck && pnpm lint && pnpm test --filter api`.
