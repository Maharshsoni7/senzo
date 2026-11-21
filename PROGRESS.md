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
- ⬜ First commit
- ⬜ `/mcp` sign-in: Expo, Cloudflare
- ⬜ Decide open questions Q1–Q7 (`docs/business-rules.md`) — Q2, Q3 needed before Phase 2
- ⬜ Decide payout model: Razorpay Route only vs RazorpayX Payouts (blocks ledger)
- ⬜ Paperwork: Razorpay Route approval, MSG91 DLT, KYC provider, Exotel, trademark, domains

## Phase 1 · Foundation

- ✅ Scaffold monorepo (pnpm 12 + Turborepo, hoisted node_modules): `apps/{api,guest,chef}`, `packages/{config,schemas,ui}`
- ✅ Guest (Senzo) and chef (Senzo Partner) Expo SDK 58 shells: Expo Router, brand icons, theme from `design/tokens.json`; Android bundle builds
- 🟡 `packages/schemas`: ✅ money helpers (`percentOf`, `formatINR`), ✅ error codes + Problem schema · ⬜ enums
- 🟡 API skeleton: ✅ Hono + zod-openapi, problem+json errors, `/v1/health`, `/openapi.json` · ⬜ redacting logger · ⬜ idempotency middleware · ⬜ orval `packages/api-client`
- ⬜ Switch API tests to `@cloudflare/vitest-pool-workers` (with the Drizzle task)
- ⬜ Bundle IDs / EAS project (needs domain decision)
- ⬜ `apps/web`, `apps/admin` (Phase 5)
- ⬜ Auth: phone OTP, rotating refresh tokens
- ⬜ Drizzle schema from `docs/data-model.md` + first migration + seed data
- ⬜ CI: typecheck, lint, test
- ✅ `CLAUDE.md` → Commands updated to real scripts

## Open decisions

| # | Question | Status |
| --- | --- | --- |
| Q1–Q7 | See `docs/business-rules.md` | ⬜ open |
| P1 | Payouts: Route settlement vs RazorpayX ("Withdraw now", 11 AM daily) | ⬜ open |
| P2 | Workers Paid plan ($5/mo) from staging on (10 ms CPU limit on free) | ⬜ open |
| P3 | Admin panel design (no mockup) | ⬜ open |

## Log

- **21 Nov 2026** — Read starter pack; plan agreed; repo created at `D:\Project\senzo`; progress file added.
- **21 Nov 2026** — Monorepo scaffolded. Versions: Expo 58.0.26, RN 0.88.1, React 19.3, TypeScript 6.0 (Expo's pin, used repo-wide), Hono 4.13, zod 4.6, Vitest 4.1 (pool-workers needs ^4.1), Wrangler 4.166. Checks: typecheck, lint, 10 tests pass; `wrangler dev` serves `/v1/health`; guest Android bundle exports.
