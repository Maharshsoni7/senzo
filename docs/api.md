# Senzo — API list (Hono on Cloudflare Workers)

All routes are under `/v1`, JSON, defined with zod via `@hono/zod-openapi`. The OpenAPI spec is generated from the code and the typed client (`packages/api-client`, orval) from the spec — **the code is the contract**; this file is the plan. Screen IDs show who calls each route.

## Conventions

- **Auth:** `Authorization: Bearer <access token>` (15 min). Refresh with the rotating refresh token. Partner routes need a user with a chef profile; admin routes sit behind Cloudflare Access and check the admin role.
- **Idempotency:** `Idempotency-Key: <uuid>` is required on every POST that creates money movement or a booking (`/bookings`, `/bookings/:id/cancel`, `/tips`, `/partner/payouts/withdraw`, admin refunds). Same key + same body ⇒ same response for 24 h.
- **Errors:** `application/problem+json` — `{ "type", "title", "status", "code", "detail", "fields"? }`. `code` is a stable string such as `SLOT_TAKEN`, `BELOW_CHEF_MINIMUM`, `OTP_INVALID`, `OTP_LOCKED`, `OUTSIDE_SERVICE_AREA`, `POLICY_WINDOW_CLOSED`.
- **Lists:** cursor pagination — `?cursor=&limit=` (max 50) → `{ items, nextCursor }`.
- **Money:** integers in paise; the client formats ₹. Times: ISO 8601 UTC strings.
- **Rate limits:** OTP routes per phone, device and IP; Turnstile token required on `/auth/otp/request`.
- **Never trust the app for prices:** clients send selections; the server computes every amount.

## Auth (G02, G03, C11)

| Method | Path | Body / query | Returns |
| --- | --- | --- | --- |
| POST | `/auth/otp/request` | phone, turnstileToken, channel (`sms`,`voice`) | `{ retryAfterSec }` |
| POST | `/auth/otp/verify` | phone, code, device {platform, app, pushToken?} | tokens + `{ isNewUser, roles }` |
| POST | `/auth/refresh` | refreshToken | new token pair (old one revoked) |
| POST | `/auth/logout` | — | 204 |

Built (`apps/api/src/modules/auth`). Errors: `TURNSTILE_FAILED` 403 · `RATE_LIMITED` 429 with `Retry-After` (30 s between sends, first send + 3 resends per rolling hour per phone) · `OTP_INVALID` 422 (wrong or expired; `detail` says tries left) · `OTP_LOCKED` 423 after 5 wrong tries · `SESSION_REVOKED` 401 when an already-rotated refresh token is used (every session of that user is revoked). Access token: HS256 JWT, 15 min, claims `sub` (user id) and `sid` (session id). A new partner-app user gets no role until chef onboarding. Per-IP and per-device limits wait for the Durable Object rate limiter.

## Me (G14, G18, G20)

| Method | Path | Notes |
| --- | --- | --- |
| GET / PATCH | `/me` | name, email, language, age confirmation |
| GET / PUT | `/me/food-profile` | allergies, Jain count, rules, notes |
| GET / POST / PATCH / DELETE | `/me/addresses[/:id]` | POST takes a Places `placeId` (or lat/lng) + flat + gate notes; returns `serviceArea` or `OUTSIDE_SERVICE_AREA` |
| GET | `/places/autocomplete?q=&session=` | Proxy to Google Places (key never in the app) |
| GET | `/places/:placeId?session=` | Coordinates + formatted address |
| GET | `/me/wallet` | balance + entries |
| GET / PUT | `/me/favourites` | |
| POST | `/me/devices` | push token |
| GET | `/me/notifications` · POST `/me/notifications/read` | G20 |
| POST | `/me/data-export` · DELETE `/me` | DPDP access and erasure |

## Discovery (G04, G07, G08, G22)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/chefs` | `lat,lng` or `addressId`, `date?`, `slot?`, `guests?`, `q?`, `rule?` (jain, nog), `cuisine?`, cursor → rail cards (name, cuisine, from-price, rating, distance, figure) |
| GET | `/chefs/:slug` | Profile, proofs (verified only), cuisines, occasions, capacity, reviews summary |
| GET | `/chefs/:id/menus` | Set menus with bands, courses, options, add-ons, flags |
| GET | `/chefs/:id/reviews` | cursor |
| GET | `/chefs/:id/availability?month=YYYY-MM` | per day: lunch/dinner/late = open/booked/off |

All five are **built** (`modules/discovery`, `modules/availability`). Not yet: `addressId` (needs saved addresses), the `figure` look for ChefFig, and the FTS5 search index — search is a substring match over name, headline, cuisines and approved dish names plus `search_synonyms`, fine at beta scale. `rule` takes `jain` or `no_onion_garlic`. Ranking weights live in `src/config/ranking.ts`.
| POST | `/quotes` | `{ menuId, guests, foodRule, options[], addons[], groceriesBy, kitchen{gas,oven,…}, date, slot, promo? }` → full price breakdown, warnings (no oven, below minimum) — used by G22, G08, G09. **Built**: public; `bookable: false` below the chef minimum (still 200); warnings `JAIN_SWAPPED`, `NO_OVEN_ALTERNATIVE`, `INDUCTION_ADDED`, `BELOW_CHEF_MINIMUM`; errors `GUESTS_OUT_OF_RANGE`, `FOOD_RULE_UNAVAILABLE`, `PROMO_INVALID`. Chef earnings aren't returned. Availability (date/slot) isn't checked yet |

## Bookings — guest (G09–G13, G16, G17, G19, G21)

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/bookings` | quote input + addressId + notes; **Idempotency-Key**; takes the soft lock; creates Razorpay order → `{ bookingId, code, razorpayOrderId, amountPaise, keyId }` |
| POST | `/bookings/:id/payment/verify` | Razorpay `payment_id`, `order_id`, `signature` from the SDK; final state still waits for the webhook |
| GET | `/bookings?scope=upcoming\|past` | G11 |
| GET | `/bookings/:id` | Full booking incl. start/finish OTP for the guest when due |
| GET | `/bookings/:id/cancellation-quote` | Refund amount by policy for "now" |
| POST | `/bookings/:id/cancel` | reason; **Idempotency-Key** |
| POST | `/bookings/:id/reschedule` | new date + slot (once, ≥ 48 h before) |
| POST | `/bookings/:id/reports` | category, details, photo upload keys → `SR-` ticket; freezes payout |
| POST | `/bookings/:id/sos` | lat, lng |
| POST | `/bookings/:id/review` | stars, text, tags |
| POST | `/bookings/:id/tip` | amount → Razorpay order for the tip; **Idempotency-Key** |
| GET | `/bookings/:id/invoices` | signed links (G21) |
| POST | `/uploads` | → presigned R2 URL for photos (report, chat) |

## Menu requests (G23, G24)

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/menu-requests` | occasion, guests or visits/week, date, slot, cuisines, rule, budget tier, must-haves, groceries, addressId → `{ code, matchedChefs }` |
| GET | `/menu-requests/:id` | request + proposals (max 3) with hold times |
| POST | `/proposals/:id/book` | Turns a proposal into a booking (same flow as `POST /bookings`) |

## Chat and calls (G15, G12)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/threads/:id/messages` | cursor |
| POST | `/threads/:id/messages` | text / photo key; server scans for phone, UPI, "cash" |
| POST | `/threads/:id/menu-cards/:msgId/accept` | Guest accepts a proposed menu → locks it on the booking |
| WS | `/ws/threads/:id` · `/ws/bookings/:id` | Durable Object sockets (chat; live booking status, ETA) |
| POST | `/bookings/:id/calls` | Starts an Exotel masked call (24 h before → 24 h after) |

## Partner app — chefs (`/partner`, C01–C22)

| Method | Path | Notes |
| --- | --- | --- |
| GET / PUT | `/partner/profile` | C01, C12: name, photo key, bio, cuisines, languages, base location, radius, capacity |
| POST | `/partner/kyc/:kind` | `aadhaar` → provider session URL (DigiLocker), `pan`, `liveness`, `background` (C02) |
| POST | `/partner/bank` | holder, IFSC, account → penny-drop; pauses payouts 24 h on change (C12) |
| GET / POST / PATCH / DELETE | `/partner/dishes[/:id]` | C03 |
| GET / POST / PATCH | `/partner/menus[/:id]` | bands, courses, options, add-ons, minimum, grocery saving, Jain toggle, live (C20) |
| PUT | `/partner/experience` | years, kitchens, certificates, rules, occasions, max guests, helper (C22) |
| POST | `/partner/proofs` | upload proof → review |
| GET / PUT | `/partner/availability?month=` | C10 |
| POST | `/partner/go-live` | Checks onboarding is complete |
| POST | `/partner/pause` | `1w` / `2w` / `until_resumed` (C19) |
| GET | `/partner/bookings?scope=requests\|upcoming\|past` | C04, C16 |
| GET | `/partner/bookings/:id` | Address unlocked only after accept |
| POST | `/partner/bookings/:id/accept` | `{ allergiesAck: true }` (C05) |
| POST | `/partner/bookings/:id/decline` | reason |
| POST | `/partner/bookings/:id/on-my-way` | `{ etaMinutes: 15\|30\|45 }` (C13) |
| POST | `/partner/bookings/:id/start` | `{ otp, lat, lng }` (C06) |
| POST | `/partner/bookings/:id/done` | creates the finish OTP (C07) |
| POST | `/partner/bookings/:id/finish` | `{ otp }` (C08) |
| POST | `/partner/bookings/:id/door-log` | arrival, rang, called (C14) |
| POST | `/partner/bookings/:id/no-show` | after 30 min (C14) |
| POST | `/partner/bookings/:id/rate-guest` | stars, tags, note, doNotMatch (C15) |
| GET | `/partner/menu-requests` · GET `/partner/menu-requests/:id` | C21 |
| POST | `/partner/menu-requests/:id/proposals` | menu snapshot, price per guest, helper, note |
| GET | `/partner/earnings?month=` | balance, released, on hold, history (C09) |
| POST | `/partner/payouts/withdraw` | **Idempotency-Key** |
| GET | `/partner/payouts/:id` | failure reason, retry (C17) |
| GET | `/partner/tax-documents?fy=` | C18 |
| DELETE | `/partner/account` | only with no upcoming jobs or pending payout (C19) |

## Webhooks (`/webhooks`, no auth, signature-checked)

| Path | Source | Handled |
| --- | --- | --- |
| `/webhooks/razorpay` | payment.captured, payment.failed, refund.processed, transfer.*, payout.* | Saved raw → Queue → processed once (`webhook_events.event_id` unique) |
| `/webhooks/msg91` | SMS delivery reports | Delivery stats |
| `/webhooks/exotel` | Call status | `call_sessions` |
| `/webhooks/kyc` | Verification results | `kyc_checks`, chef status |

## Admin (`/admin`, Cloudflare Access + role)

| Method | Path | Role |
| --- | --- | --- |
| GET | `/admin/chefs?status=in_review` · POST `/admin/chefs/:id/approve\|reject\|suspend` | Operations |
| POST | `/admin/proofs/:id/review` · `/admin/dishes/:id/review` | Operations |
| GET | `/admin/bookings?q=` · GET `/admin/bookings/:id` (with events, chat, calls) | Support |
| POST | `/admin/bookings/:id/refund` (amount, reason) | Support (small refunds, limit to be set) / Finance |
| GET / POST | `/admin/reports[/:id/resolve]` | Support |
| POST | `/admin/payouts/:id/hold\|release\|retry` | Finance |
| CRUD | `/admin/promo-codes` · `/admin/service-areas` | Operations |
| GET | `/admin/audit-logs` | Admin |
| GET | `/admin/reconciliation?date=` | Finance — ledger vs Razorpay settlement |

## Events on the queue (outbox → Queues)

`booking.requested`, `booking.confirmed`, `booking.declined`, `booking.cancelled`, `booking.on_the_way`, `booking.started`, `booking.done`, `booking.completed`, `booking.paid_out`, `booking.disputed`, `booking.no_show`, `request.created`, `proposal.sent`, `proposal.expired`, `payout.sent`, `payout.failed`, `chef.approved`, `chef.paused`, `message.created`, `review.created`.
