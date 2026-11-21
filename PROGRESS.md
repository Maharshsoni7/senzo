# Senzo — progress

Updated after every task. Status: ✅ done · 🟡 in progress · ⬜ not started · ⛔ blocked

Last updated: 21 Nov 2026

## Phases

| Phase | Weeks | Status |
| --- | --- | --- |
| 0 · Setup and decisions | 0–1 | 🟡 |
| 1 · Foundation (monorepo, schemas, API skeleton, DB, CI) | 1–3 | 🟡 |
| 2 · Core domain (quotes, booking state machine, ledger, Razorpay, timers) | 3–6 | ⬜ |
| 3 · One booking end to end (guest + chef happy path) | 5–10 | ⬜ |
| 4 · Breadth (chat, calls, menu requests, cancel, reports, notifications, earnings) | 10–13 | ⬜ |
| 5 · Web + admin | 11–14 | ⬜ |
| 6 · Beta hardening | 15–18 | ⬜ |

## Phase 0 · Setup and decisions

- ✅ Repo created at `D:\Project\senzo`, starter pack copied, `git init`
- ✅ First commit `9768640` (author `Maharshsoni7`, repo-local git config)
- ✅ Pushed to GitHub: https://github.com/Maharshsoni7/senzo (`main`)
- ⬜ `/mcp` sign-in: Expo, Cloudflare
- ⬜ Decide open questions Q1–Q7 (`docs/business-rules.md`) — Q2, Q3 needed before Phase 2
- ⬜ Decide payout model: Razorpay Route only vs RazorpayX Payouts (blocks ledger)
- ⬜ Paperwork: Razorpay Route approval, MSG91 DLT, KYC provider, Exotel, trademark, domains

## Phase 1 · Foundation

- ✅ Scaffold monorepo (pnpm 12 + Turborepo, hoisted node_modules): `apps/{api,guest,chef}`, `packages/{config,schemas,ui}`
- ✅ Guest (Senzo) and chef (Senzo Partner) Expo SDK 58 shells: Expo Router, brand icons, theme from `design/tokens.json`; Android bundle builds
- ✅ `packages/schemas`: money helpers (`percentOf`, `formatINR`), error codes + Problem schema, all enums (`enums.ts`)
- 🟡 API skeleton: ✅ Hono + zod-openapi, problem+json errors, `/v1/health`, `/openapi.json` · ✅ redacting logger (`src/lib/log.ts`) · ✅ idempotency middleware (`src/middleware/idempotency.ts`) · ⬜ orval `packages/api-client`
- ✅ API tests run in workerd via `@cloudflare/vitest-plugin` (renamed from vitest-pool-workers) with local D1 + migrations
- ✅ Drizzle schema for all 63 tables in `docs/data-model.md` (`apps/api/src/db/schema/`) + migration `0000_init`; enum CHECKs, `one_booking_per_slot` partial index, ledger non-zero check — tested
- ✅ Seed data from the mockups in `apps/api/seed/`: 8 live chefs (Ananya Mehta with 3 menus + full Gujarati Classic courses/options/add-ons), guests Rahul Desai & Krupa Shah, bookings SZ-1042 (paid out, ₹200 tip) and SZ-1048 (requested), FIRSTFEAST promo, platform ledger accounts. `pnpm --filter api db:seed:local`
- ⬜ `chef_search` FTS5 table (hand-written migration, with the search module)
- ✅ Auth (`apps/api/src/modules/auth`): `POST /v1/auth/otp/request|verify|refresh|logout`, Turnstile check, 30 s cooldown + 4 sends/hour per phone, 5 tries then lock, HMAC-hashed codes, 15-min JWT + 30-day rotating refresh, reuse ⇒ all sessions revoked, `requireAuth` middleware. Smoke-tested on `wrangler dev`
- ⬜ MSG91 sender (needs auth key + DLT templates); until then non-prod uses `DEV_FIXED_OTP`, prod refuses to send
- ⬜ Per-IP / per-device OTP limits (Durable Object rate limiter)
- ⬜ Consent + 18+ confirmation (`PATCH /v1/me`, E1)
- ⬜ CI: typecheck, lint, test (GitHub Actions)
- ⬜ Bundle IDs / EAS project (needs domain decision)
- ⬜ `apps/web`, `apps/admin` (Phase 5)
- ✅ `CLAUDE.md` → Commands updated to real scripts

## Open decisions

| # | Question | Status |
| --- | --- | --- |
| Q1–Q7 | See `docs/business-rules.md` | 🟡 defaults in use (D21), final answers pending; Q2/Q6 need a CA |
| Q8 | GST on ₹149 fee: ₹27 (mockups, rounded) vs ₹26.82 (exact) | 🟡 default: round to rupee, as mockups; confirm with CA |
| P1 | Payouts: Route settlement vs RazorpayX ("Withdraw now", 11 AM daily) | ⬜ open |
| P2 | Workers Paid plan ($5/mo) from staging on (10 ms CPU limit on free) | ⬜ open |
| P3 | Admin panel design (no mockup) | ⬜ open |

## Log

- **21 Nov 2026** — Read starter pack; plan agreed; repo created at `D:\Project\senzo`; progress file added.
- **21 Nov 2026** — Monorepo scaffolded. Versions: Expo 58.0.26, RN 0.88.1, React 19.3, TypeScript 6.0 (Expo's pin, used repo-wide), Hono 4.13, zod 4.6, Vitest 4.1 (pool-workers needs ^4.1), Wrangler 4.166. Checks: typecheck, lint, 10 tests pass; `wrangler dev` serves `/v1/health`; guest Android bundle exports.
- **21 Nov 2026** — Q1–Q7 defaults adopted provisionally (D21). Database schema (63 tables, migration `0000_init`, applied locally), redacting logger, Idempotency-Key middleware. Vitest moved to 5.1 now that `@cloudflare/vitest-plugin` supports it. Schema changes vs `docs/data-model.md` recorded there: `idempotency_keys` gained request_hash/status_code/content_type; `ledger_accounts.owner_id` is `''` for platform accounts. 25 tests pass.
- **21 Nov 2026** — Seed data from mockups (GST rounding logged as Q8). Phone OTP auth with rotating refresh tokens; `.dev.vars.example` added. 59 tests pass.
