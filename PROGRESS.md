# Senzo — progress

Updated after every task. Status: ✅ done · 🟡 in progress · ⬜ not started · ⛔ blocked

Last updated: 22 Nov 2026

## Phases

| Phase | Weeks | Status |
| --- | --- | --- |
| 0 · Setup and decisions | 0–1 | 🟡 |
| 1 · Foundation (monorepo, schemas, API skeleton, DB, CI) | 1–3 | 🟡 |
| 2 · Core domain (quotes, booking state machine, ledger, Razorpay, timers) | 3–6 | 🟡 |
| 3 · One booking end to end (guest + chef happy path) | 5–10 | ⬜ |
| 4 · Breadth (chat, calls, menu requests, cancel, reports, notifications, earnings) | 10–13 | ⬜ |
| 5 · Web + admin | 11–14 | ⬜ |
| 6 · Beta hardening | 15–18 | ⬜ |

## Phase 0 · Setup and decisions

- ✅ Repo created at `D:\Project\senzo`, starter pack copied, `git init`
- ✅ First commit `9768640` (author `Maharshsoni7`, repo-local git config)
- ✅ Pushed to GitHub: https://github.com/Maharshsoni7/senzo (`main`)
- ✅ Cloudflare: `wrangler login` done; D1 `senzo-dev` (APAC) created, both migrations + demo seed applied; Worker `senzo-api` deployed with secrets → https://senzo-api.senzo-api.workers.dev (health, quotes, availability, OTP login checked live)
- ⬜ Expo sign-in (EAS)
- ⬜ Decide open questions Q1–Q7 (`docs/business-rules.md`) — Q2, Q3 needed before Phase 2
- ⬜ Decide payout model: Razorpay Route only vs RazorpayX Payouts (blocks ledger)
- ⬜ Paperwork: Razorpay Route approval, MSG91 DLT, KYC provider, Exotel, trademark, domains

## Phase 1 · Foundation

- ✅ Scaffold monorepo (pnpm 12 + Turborepo, hoisted node_modules): `apps/{api,guest,chef}`, `packages/{config,schemas,ui}`
- ✅ Guest (Senzo) and chef (Senzo Partner) Expo SDK 58 shells: Expo Router, brand icons, theme from `design/tokens.json`; Android bundle builds
- ✅ `packages/schemas`: money helpers (`percentOf`, `formatINR`), error codes + Problem schema, all enums (`enums.ts`)
- ✅ API skeleton: Hono + zod-openapi, problem+json errors, `/v1/health`, `/openapi.json` · redacting logger (`src/lib/log.ts`) · idempotency middleware (`src/middleware/idempotency.ts`)
- ✅ `packages/api-client`: OpenAPI exported from route code → orval typed fetch client (`requestOtp`, `verifyOtp`…) + `configureApiClient` / `ApiError` with stable codes; CI fails if it's stale
- ✅ API tests run in workerd via `@cloudflare/vitest-plugin` (renamed from vitest-pool-workers) with local D1 + migrations
- ✅ Drizzle schema for all 63 tables in `docs/data-model.md` (`apps/api/src/db/schema/`) + migration `0000_init`; enum CHECKs, `one_booking_per_slot` partial index, ledger non-zero check — tested
- ✅ Seed data from the mockups in `apps/api/seed/`: 8 live chefs (Ananya Mehta with 3 menus + full Gujarati Classic courses/options/add-ons), guests Rahul Desai & Krupa Shah, bookings SZ-1042 (paid out, ₹200 tip) and SZ-1048 (requested), FIRSTFEAST promo, platform ledger accounts. `pnpm --filter api db:seed:local`
- ⬜ `chef_search` FTS5 table (hand-written migration, with the search module)
- ✅ Auth (`apps/api/src/modules/auth`): `POST /v1/auth/otp/request|verify|refresh|logout`, Turnstile check, 30 s cooldown + 4 sends/hour per phone, 5 tries then lock, HMAC-hashed codes, 15-min JWT + 30-day rotating refresh, reuse ⇒ all sessions revoked, `requireAuth` middleware. Smoke-tested on `wrangler dev`
- ⬜ MSG91 sender (needs auth key + DLT templates); until then non-prod uses `DEV_FIXED_OTP`, prod refuses to send
- ⬜ Per-IP / per-device OTP limits (Durable Object rate limiter)
- ⬜ Consent + 18+ confirmation (`PATCH /v1/me`, E1)
- ✅ CI (GitHub Actions `.github/workflows/ci.yml`): typecheck, lint, test, migration drift, API-client drift — first run green
- ⬜ Bundle IDs / EAS project (needs domain decision)
- ⬜ `apps/web`, `apps/admin` (Phase 5)
- ✅ `CLAUDE.md` → Commands updated to real scripts

## Phase 2 · Core domain

- ✅ Price engine `apps/api/src/modules/quotes/engine.ts` (bands, upgrades, add-ons, grocery saving, Jain auto-swap, no-oven alternative, induction, chef minimum, promo, fees) + `POST /v1/quotes`; fee constants in `apps/api/src/config/fees.ts`
- ✅ `bookings.platform_fee_gst_paise` (migration 0001) — Q2 default deducts 18% GST on the fee from the chef
- ✅ Cancellation policy `modules/bookings/policy.ts` (48 h / 24 h windows, Q3 fee rule, Q4 chef-cancel credit, promo never refunded as cash, card/wallet split, one free reschedule ≥ 48 h); rates in `src/config/policy.ts`; slot times in `src/lib/time.ts`
- ✅ Ledger `modules/ledger`: pure line builders (capture, cancellation, tip, payout) that must sum to zero + `ledgerTxn()` returning inserts for the caller's batch; tested across promo/wallet/window combinations. Partial-refund GST treatment → CA (Q6)
- ✅ Booking state machine: `modules/bookings/machine.ts` (pure transition table + guards: allergy ack, on-my-way ≤ 4 h, no-show after 30 min, done before finish) and `transition()` — booking update + booking_events + outbox + caller's ledger rows in one batch; a changes() guard rolls back racing writes (STATE_CONFLICT); slot clash → SLOT_TAKEN
- ✅ Checkout soft lock: `SlotLock` Durable Object per chef + date + slot (`src/durable/slot-lock.ts`), 10 min, holder can extend/release, alarm clears it
- ✅ Timers: `BookingTimers` Workflow per booking (`src/workflows/booking-timers.ts`), steps in `modules/bookings/timers.ts`: checkout expiry 10 min (+ lock release) → accept deadline 2 h → reminders 24 h / 2 h (outbox `booking.reminder`; skipped if > 15 min overdue) → possible no-show 30 min after arrival → auto-complete 2 h after "done" → payout release 24 h after completion. Every step re-reads the booking and no-ops if it moved on
- ⬜ Create booking + Razorpay order (test mode) + webhooks — **blocked on P1** (Route vs RazorpayX). Must call `startBookingTimers()` at checkout, `signalBooking(PAYMENT_CAPTURED)` on capture, `signalBooking(JOB_DONE)` from the "done" route
- ⬜ Late capture after checkout expiry → automatic refund (webhook handler)
- ✅ Availability (G08): `GET /v1/chefs/:chefId/availability?month=` — weekly `cooking_days` + one-off `availability` overrides + active bookings and in-progress checkouts; past slots and non-live chefs off. `POST /v1/quotes` with date+slot returns SLOT_TAKEN / SLOT_UNAVAILABLE. Seed: Ananya Thu–Sun (C10)

## Phase 3 · Guest app (API first)

- ✅ Discovery API: `GET /v1/chefs` (rail + search: area radius, text + synonyms, Jain/NOG, cuisine, group size, date+slot; ranked by distance, rating, acceptance, reply time), `/v1/chefs/:slug` (verified proofs only), `/:id/menus`, `/:id/reviews` (paged, "Rahul D.")
- ⬜ FTS5 search index, `addressId` filter, ChefFig look from the API
- ✅ Guest app slice 1–4: UI kit (`packages/ui`: theme + Archivo/Plex Mono, Text, Button, Chip, Card, states, icons, ChefFig), session in SecureStore with shared refresh, TanStack Query cache (MMKV; memory in Expo Go), i18n en (+ gu/hi copies listed in `_todo`), screens G01–G08 + G22 on the live API, booking draft shared G22 → G08; Android bundle builds; 14 jest-expo tests
- ✅ G11 + G12: `GET /v1/bookings?scope=upcoming|past` and `GET /v1/bookings/:id` (`modules/bookings/{routes,service,repo,otp}.ts`), guest-only; start/finish codes derived from `OTP_PEPPER` so they can be shown while `job_otps` keeps only a hash. App: My bookings (FlashList, coming up + past) and Live booking (progress, ETA, OTP, details, price), polling every 30 s while live. Seed: Rahul gets SZ-1051 (confirmed, 19 Dec) and SZ-1050 (declined, 13 Dec)
- ⬜ `/ws/bookings/:id` live socket (replaces polling)
- ✅ Chef job API (`modules/partner-bookings`, `requireChef`): requests / upcoming / past, detail with address unlock window, accept (allergy tick, live chef), decline, on my way, start (code + one location read, distance stored), done (finish code + Workflow signal), finish. Wrong codes count immediately, 5th locks. Start-code window provisional (1 h before arrival → 1 h after serving). Seed: SZ-1052 request from Krupa to Ananya (20 Dec lunch)
- ⬜ Chef app screens C11, C04, C05, C13, C06, C07, C08
- ⬜ Door log + no-show (C14), chef earnings summary on C04
- ⬜ Turnstile widget in the app (dev API accepts any token)
- ⬜ KitchenBg and DishArt illustrations; chef preview sheet (G04)
- ⬜ Gujarati and Hindi translations (`apps/guest/src/i18n/{gu,hi}.json` → `_todo`; run `node src/i18n/sync-locales.mjs` after adding English keys)

## Screens (all 46 mockup screens + web)

API: ✅ ready · 🟡 partly · ⬜ not built. 💳 = needs payments (built last). Last column tracks the app UI.

### Guest app — Senzo (24)

| ID | Screen | Phase | API | UI |
| --- | --- | --- | --- | --- |
| G01 | Welcome | 3 | — | ✅ |
| G02 | Login (phone) | 3 | ✅ otp/request | ✅ |
| G03 | Verify OTP | 3 | ✅ otp/verify | ✅ |
| G04 | Home · chef rail | 3 | ✅ GET /chefs | ✅ |
| G05 | Search | 3 | ✅ GET /chefs?q= | ✅ |
| G06 | Filters | 3 | ✅ GET /chefs (rule, cuisine, guests, date+slot) | ✅ |
| G07 | Chef profile | 3 | ✅ /chefs/:slug, /menus, /reviews | ✅ |
| G22 | Menu detail · Jain, add-ons, groceries | 3 | ✅ POST /quotes | ✅ |
| G08 | Check availability | 3 | ✅ /availability, /quotes | 🟡 checkout waits for payments |
| G09 | Checkout & pay 💳 | last | ⬜ POST /bookings + Razorpay | ⬜ |
| G10 | Booked + start OTP 💳 | last | ⬜ | ⬜ |
| G11 | My bookings | 3 | ✅ GET /bookings | ✅ (chat, change, report, invoice links wait for those screens) |
| G12 | Live booking + finish OTP | 3 | ✅ GET /bookings/:id · WS ⬜ (polls 30 s) | ✅ (report, chat, call, rate & tip links wait) |
| G13 | Rate & tip (tip 💳) | 4 | ⬜ review, tip | ⬜ |
| G14 | Account + allergies | 4 | ⬜ /me, food-profile, wallet | 🟡 placeholder + sign out |
| G15 | Chat + proposed menu | 4 | ⬜ threads, WS | ⬜ |
| G16 | Cancel / reschedule (refund 💳) | 4 | 🟡 policy built; routes ⬜ | ⬜ |
| G17 | Chef declined · refunded | 4 | 🟡 timer built; routes ⬜ | ⬜ |
| G18 | Add address (no map) | 4 | ⬜ /places, /me/addresses | ⬜ |
| G19 | Report a problem + SOS | 4 | ⬜ reports, sos | ⬜ |
| G20 | Notifications | 4 | ⬜ /me/notifications | ⬜ |
| G21 | Invoice 💳 | last | ⬜ | ⬜ |
| G23 | Plan my event · get menus | 4 | ⬜ /menu-requests | ⬜ |
| G24 | Menus from 3 chefs | 4 | ⬜ /menu-requests/:id, proposals | ⬜ |

### Chef app — Senzo Partner (22)

| ID | Screen | Phase | API | UI |
| --- | --- | --- | --- | --- |
| C11 | Chef login | 3 | ✅ otp/* | ⬜ |
| C01 | Onboarding · profile | 3 | ⬜ /partner/profile, uploads | ⬜ |
| C02 | KYC & bank (bank 💳) | 3 | ⬜ /partner/kyc, bank | ⬜ |
| C03 | Specialties & price | 3 | ⬜ /partner/dishes, go-live | ⬜ |
| C04 | Chef home | 3 | ✅ /partner/bookings?scope= (earnings summary ⬜) | ⬜ |
| C05 | Booking request + allergy check | 3 | ✅ /partner/bookings/:id, accept, decline | ⬜ |
| C13 | I'm on my way (no map) | 3 | ✅ on-my-way | ⬜ |
| C06 | Arrive · start OTP | 3 | ✅ start (code + one location read) | ⬜ |
| C07 | Cooking in progress | 3 | ✅ done | ⬜ |
| C08 | Finish OTP · payout | 3 | ✅ finish (payout release: timers) | ⬜ |
| C09 | Earnings & withdraw 💳 | last | 🟡 ledger built | ⬜ |
| C10 | Availability calendar | 4 | 🟡 read built; PUT /partner/availability ⬜ | ⬜ |
| C12 | Edit profile + bank (bank 💳) | 4 | ⬜ | ⬜ |
| C14 | Guest not responding | 4 | 🟡 state machine built; routes ⬜ | ⬜ |
| C15 | Rate the guest | 4 | ⬜ | ⬜ |
| C16 | Past jobs | 4 | ✅ /partner/bookings?scope=past | ⬜ |
| C17 | Payout failed 💳 | last | ⬜ | ⬜ |
| C18 | Tax statements 💳 | last | ⬜ | ⬜ |
| C19 | Pause / delete account | 4 | ⬜ | ⬜ |
| C20 | Set menus | 4 | ⬜ /partner/menus | ⬜ |
| C21 | Reply to menu request | 4 | ⬜ | ⬜ |
| C22 | Experience & proof | 4 | ⬜ | ⬜ |

### Web and admin (Phase 5)

| Screen | API | UI |
| --- | --- | --- |
| Main · browse & book chefs (web) | ✅ discovery; booking 💳 | ⬜ |
| ChefSignup (web) | ⬜ uploads | ⬜ |
| Admin panel (no mockup yet) | ⬜ | ⬜ |

## Open decisions

| # | Question | Status |
| --- | --- | --- |
| Q1–Q7 | See `docs/business-rules.md` | 🟡 defaults in use (D21), final answers pending; Q2/Q6 need a CA |
| Q8 | GST on ₹149 fee: ₹27 (mockups, rounded) vs ₹26.82 (exact) | 🟡 default: round to rupee, as mockups; confirm with CA |
| P1 | Payouts: Route settlement vs RazorpayX ("Withdraw now", 11 AM daily) | ⏸ deferred: founder chose to build all payment work last (22 Nov 2026) |
| P2 | Workers Paid plan ($5/mo) from staging on (10 ms CPU limit on free) | ⬜ open |
| P3 | Admin panel design (no mockup) | ⬜ open |

## Log

- **21 Nov 2026** — Read starter pack; plan agreed; repo created at `D:\Project\senzo`; progress file added.
- **21 Nov 2026** — Monorepo scaffolded. Versions: Expo 58.0.26, RN 0.88.1, React 19.3, TypeScript 6.0 (Expo's pin, used repo-wide), Hono 4.13, zod 4.6, Vitest 4.1 (pool-workers needs ^4.1), Wrangler 4.166. Checks: typecheck, lint, 10 tests pass; `wrangler dev` serves `/v1/health`; guest Android bundle exports.
- **21 Nov 2026** — Q1–Q7 defaults adopted provisionally (D21). Database schema (63 tables, migration `0000_init`, applied locally), redacting logger, Idempotency-Key middleware. Vitest moved to 5.1 now that `@cloudflare/vitest-plugin` supports it. Schema changes vs `docs/data-model.md` recorded there: `idempotency_keys` gained request_hash/status_code/content_type; `ledger_accounts.owner_id` is `''` for platform accounts. 25 tests pass.
- **21 Nov 2026** — Seed data from mockups (GST rounding logged as Q8). Phone OTP auth with rotating refresh tokens; `.dev.vars.example` added. 59 tests pass.
- **21 Nov 2026** — CI on GitHub Actions (green). Typed API client generated from OpenAPI with orval. 61 tests pass. Phase 1 foundation done except the items still open above.
- **22 Nov 2026** — Payments deferred to the end (founder). Checkout soft lock (Durable Object) + per-booking timer Workflow; G08 availability. Cloudflare connected: cloud D1 `senzo-dev` migrated and seeded, API live on workers.dev.
- **22 Nov 2026** — G11 My bookings + G12 Live booking: guest bookings list/detail API with derived job OTPs (documented in `docs/api.md`), two screens, demo bookings for Rahul in the seed. The mockup's "arrived" step is folded into "on the way" (no server signal); copy for the finish code says the chef is paid 24 h later (G13 gap).
- **22 Nov 2026** — Chef job API (C04–C08, C13, C16 data). Workflow signal helpers moved to `modules/bookings/signals.ts` so routes don't import `cloudflare:workers`. 363 API tests pass.
