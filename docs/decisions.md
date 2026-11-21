# Senzo — decision log

Decisions already made. **Do not reverse or work around these without a new entry here approved by the tech lead (Maharsh).** If a task seems to need something on the "No" list, stop and ask.

| # | Date | Decision | Why | Rejected |
| --- | --- | --- | --- | --- |
| D1 | 21 Nov 2026 | App name **Senzo** (guests) and **Senzo Partner** (chefs); booking IDs `SZ-` | Short, unusual, no conflicting app/brand found; from 専属シェフ "your own chef" | Chef's Pass (old working name), Shucho, Kasé, Maharaj-based names |
| D2 | 21 Nov 2026 | Logo: "senz" + bowl-and-flame "o", M PLUS Rounded 1c ExtraBold, ink #1B1A17 / paper #F6F1E7 / flame #C8372D | Chosen by the founder ("08 flame") | Plate & dot, seal, chef-hat versions |
| D3 | Nov 2026 | **TypeScript everywhere**, one pnpm + Turborepo monorepo | Small team, shared types and zod schemas | Separate repos, mixed languages |
| D4 | Nov 2026 | **Two Expo apps** (guest, partner), Expo SDK 58 / RN 0.88, Expo Router | Different needs; better store listings | One app with a role switch |
| D5 | Nov 2026 | **Hono API on Cloudflare Workers** | ₹0 to start, no servers, direct D1 access | NestJS, containers, Firebase |
| D6 | 21 Nov 2026 | **Cloudflare D1 (SQLite)** + Drizzle as the only database | Founder's choice; free tier fits beta (~100 guests + 100 chefs); 7/30-day Time Travel | Supabase/Postgres (revisit only for the ledger at the national stage, via Hyperdrive), MongoDB/Realm (Device Sync EOL Sep 2025) |
| D7 | Nov 2026 | **Durable Objects** for real-time, locks and OTP counters; **Queues + Workflows** for jobs and timers | Native to Workers | Redis, BullMQ, Socket.IO servers |
| D8 | 21 Nov 2026 | **Razorpay only** (Payments + Route + Refunds) | UPI-first; holds chef money until the job is done | **RevenueCat** — Apple 3.1.3(e) and Google Play forbid store billing for physical services; its web billing doesn't serve India; can't split or hold marketplace money |
| D9 | Nov 2026 | Money in **integer paise**, times in **UTC**, double-entry **ledger** | No rounding bugs; auditable | Floats, local times |
| D10 | Nov 2026 | **No WhatsApp** | Founder's choice | WhatsApp Business API for messages |
| D11 | Nov 2026 | **No map on any screen**; no live tracking; "on my way" = status + ETA; location read once at start OTP | Founder's choice; privacy; no background location permission | Maps SDK, live chef tracking |
| D12 | Nov 2026 | **FSSAI not required** from chefs (home cooking in the guest's kitchen) | Founder's decision — confirm with lawyer before launch | FSSAI registration step |
| D13 | Nov 2026 | Own chat (Durable Objects + D1); Exotel masked calls; FCM/APNs push; MSG91 SMS with DLT; Amazon SES email | Chat needs booking context and menu cards | Third-party chat SDK |
| D14 | Nov 2026 | Web = Next.js via **Vinext** on Workers (OpenNext fallback); admin behind **Cloudflare Access** | Public chef pages for Google; chef signup; ops panel | Separate hosting |
| D15 | Nov 2026 | KYC via a provider (DigiLocker Aadhaar, PAN, liveness) + penny-drop + background check; store only provider refs + Aadhaar last 4 | DPDP; trust | Storing ID numbers ourselves |
| D16 | Nov 2026 | Start and finish **OTP** for every job; payout released 24 h after finish | Protects both sides | Photo proof only |
| D17 | Nov 2026 | Outbox pattern for events; idempotency keys on money routes | No lost notifications, no double charges | Fire-and-forget calls |
| D18 | Nov 2026 | Languages: English, Gujarati, Hindi via i18next | Ahmedabad first | English only |
| D19 | Nov 2026 | Launch Ahmedabad first; scale by measured gates (5 cities → D1 per city; national → ledger to Postgres via Hyperdrive) | Avoid premature microservices | Multi-city from day one |

| D20 | 21 Nov 2026 | If the guest never shares the finish OTP, the job auto-completes **2 h after the chef taps "done"** (mockup C08) | Chefs can't be held hostage; clearer than a slot-end rule | "2 h after the slot ends" (earlier wording in the architecture doc) |

## Template for a new decision

```
| D21 | <date> | <decision> | <why> | <what we rejected and why> |
```
