---
paths:
  - "apps/api/**"
  - "packages/schemas/**"
---

# API rules (Hono on Cloudflare Workers + D1)

- Define every route with `@hono/zod-openapi` (`createRoute`) using schemas from `packages/schemas`; the OpenAPI spec and `packages/api-client` are generated from these — after changing a route, run `pnpm --filter api-client generate`.
- Route files stay thin: parse → call the module service → map the result. Business logic lives in `modules/<name>/service.ts`; SQL in `repo.ts`.
- Use the Drizzle client from `c.get('db')`; group related statements in `db.batch([...])` (one transaction in D1). Max 50 queries per request on the free plan.
- Keep CPU low (10 ms per request on the free plan): HMAC-SHA256 via `crypto.subtle` for OTP/refresh hashes, no bcrypt/argon, no big JSON transforms; push slow work to a Queue.
- Errors: throw `AppError(code, status, detail)`; the error middleware returns `application/problem+json`. Add new codes to `packages/schemas/src/errors.ts`.
- Auth middleware sets `c.var.user`; partner routes also require `c.var.chef`; admin routes require the Cloudflare Access JWT + role.
- Routes that create bookings or move money require `Idempotency-Key` (middleware stores the response 24 h in `idempotency_keys`).
- Cursor pagination only (`?cursor=&limit=`, max 50).
- Outgoing calls to vendors (Razorpay, MSG91, Exotel, Places, KYC) go through `src/vendors/<vendor>.ts` with timeouts and retries; never call them from a route directly when a Queue can do it.
- Webhooks: verify signature first, save raw to `webhook_events` (unique `event_id`), enqueue, return 200 fast; the consumer must be idempotent.
- Timers use Cloudflare Workflows (one per booking); never `setTimeout` or cron loops for per-booking deadlines.
- Migrations: `drizzle-kit generate`, review the SQL, apply with `wrangler d1 migrations apply`. Expand → migrate → contract.
- Logs: use `log.info/warn/error` from `src/lib/log.ts` (redacts phone, address, OTP, tokens, bank, KYC).
