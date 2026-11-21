# Senzo

Senzo is a marketplace to book a verified private chef who cooks in the guest's own kitchen (Ahmedabad first). Two mobile apps — **Senzo** (guests) and **Senzo Partner** (chefs) — plus a public website and an admin panel, all talking to one API.

## Read before you build

| Task touches… | Read first |
| --- | --- |
| Anything with prices, fees, refunds, payouts, time limits | `docs/business-rules.md` |
| Booking status, timers, OTPs | `docs/booking-states.md` |
| Tables or migrations | `docs/data-model.md` |
| Routes, errors, auth | `docs/api.md` |
| A screen | `docs/screens.md` + the matching file in `design/mockups/` |
| Scope, user stories, acceptance checks | `docs/prd.md` |

Decisions that must not be reversed without asking:

@docs/decisions.md

## Repo layout (pnpm + Turborepo)

```text
apps/
  guest/        Expo app for guests (Expo Router)
  chef/         Expo app for chefs — "Senzo Partner"
  web/          Next.js via Vinext on Workers: public site + chef signup
  admin/        Next.js via Vinext: admin panel (behind Cloudflare Access)
  api/          Hono API on Workers + Durable Objects + Workflows + D1 migrations
packages/
  ui/           Shared RN kit: ChefFig, DishArt, KitchenBg, buttons, tokens
  schemas/      zod schemas shared by apps and API (single source of validation)
  api-client/   Typed client generated from OpenAPI (orval) — never hand-edit
  config/       tsconfig, ESLint, Prettier
infra/terraform Cloudflare DNS, WAF, Access, D1, R2
design/         tokens.json, logo files, mockup sources (reference only)
docs/           product and technical docs (see table above)
```

## Progress

`PROGRESS.md` tracks phases, tasks, open decisions and a dated log. Update it at the end of every task.

## Commands

Update this list when scripts change. Node ≥ 22, pnpm via Corepack.

```bash
pnpm install
pnpm --filter api dev            # wrangler dev on :8787 (GET /v1/health, /openapi.json)
pnpm --filter guest dev          # expo start (Razorpay needs a dev build, not Expo Go)
pnpm --filter chef dev
pnpm test                        # Vitest; api tests run in workerd with a local D1 + all migrations
pnpm typecheck && pnpm lint
pnpm --filter api db:generate --name <what>   # drizzle-kit generate SQL migration
pnpm --filter api db:migrate:local   # wrangler d1 migrations apply senzo-dev --local
```

Not set up yet: `api-client generate` (orval task). `wrangler.jsonc` has a placeholder D1 `database_id` until Cloudflare is connected.

Before saying a task is done: `pnpm typecheck && pnpm lint && pnpm test` pass for the packages you touched.

Expo routes live in `apps/<app>/src/app/` (SDK 58 default); route paths in `docs/screens.md` are relative to that folder. Add Expo packages with `npx expo install` from the app folder.

## Stack (fixed)

- TypeScript strict everywhere. Expo SDK 58 / React Native 0.88, Expo Router, TanStack Query (persisted to MMKV), Zustand, react-hook-form + zod, Reanimated, FlashList, expo-image, react-native-svg, @gorhom/bottom-sheet, i18next (en, gu, hi).
- API: Hono + `@hono/zod-openapi` on Cloudflare Workers; Drizzle ORM on **D1 (SQLite)**; Durable Objects for sockets, locks, OTP counters; Queues + Workflows for jobs and timers; R2 + Cloudflare Images for files.
- Payments: **Razorpay only** (Payments, Route with transfers on hold, Refunds). SMS/OTP: MSG91 (DLT). Calls: Exotel masked numbers. Push: FCM/APNs. Email: Amazon SES. KYC: provider (DigiLocker, PAN, liveness). Address: Google Places autocomplete via our API.
- Observability: Sentry, PostHog, Workers Logs + Logpush.

## Hard rules

- **Never add:** maps or live location tracking, WhatsApp, RevenueCat or store in-app purchases, FSSAI steps, Redis/BullMQ/Socket.IO, NestJS, containers, a second database. If a task seems to need one, stop and ask.
- **Money:** integer paise only; amounts are computed on the server from the booking's price snapshot; the app never sends a price. Every money movement writes balanced `ledger_entries` (sum to zero).
- **Booking state** changes only through `bookings.transition()`; each change writes `booking_events` + an `outbox_events` row in the same `db.batch()`.
- **Payments:** a booking is paid only after signature check **and** the verified `payment.captured` webhook. Webhooks are idempotent (`webhook_events.event_id` unique).
- **Idempotency-Key** required on routes that create bookings or move money.
- **Time:** store UTC epoch ms; show IST. Booking `date` is the IST calendar date.
- **Workers free plan = 10 ms CPU per request:** no bcrypt (use HMAC via Web Crypto), no heavy loops in handlers — send work to a Queue. No Node-only APIs unless `nodejs_compat` covers them.
- **D1:** one query at a time per database; group related reads/writes with `batch()`; stay under 50 queries per request.
- **Migrations:** expand → migrate → contract; never drop or rename a column in the release that stops using it (old app versions live for months).
- **Validation:** request/response schemas live in `packages/schemas` and are reused by apps and API.
- **Generated code** (`packages/api-client`, migration SQL) is regenerated, not edited by hand.

## Privacy and security

- Never log phone numbers, addresses, OTPs, tokens, bank or KYC data. Use the redacting logger.
- Store Aadhaar only as provider reference + last 4 digits. Flat number, gate notes, bank account: field-encrypted (`*_enc`).
- Chef sees the full address only after accepting and until 24 h after the job.
- Secrets live in Workers secrets / EAS secrets — never in code, `.env` commits, or test fixtures. Don't read or print `.env` / `.dev.vars` files.
- Every admin action writes `audit_logs` (who, what, before, after).

## Code style

- Feature folders: `apps/api/src/modules/<module>/{routes,service,repo,events}.ts`; modules talk only through their service functions and events.
- Errors: `application/problem+json` with a stable `code` (see `docs/api.md`).
- Mobile screens: one file per route under `app/`; logic in hooks (`useBooking`, `useQuote`); every data screen handles loading, empty, error and offline.
- Copy: all user-facing strings through i18next keys; English first, Gujarati and Hindi files kept in sync.
- Tests next to code (`*.test.ts`). Money and state-machine changes need tests for every rule touched.
- Small PRs; conventional commits (`feat(bookings): …`).

## Design

- Brand: logo files in `design/logo/`; colours and fonts in `design/tokens.json`. App UI font Archivo + IBM Plex Mono (numbers, codes); logo font is outlined, don't recreate it with text.
- Mockups in `design/mockups/` are reference for layout, copy and behaviour. Follow the fixes in `docs/screens.md` → "Known gaps" instead of copying those parts.
