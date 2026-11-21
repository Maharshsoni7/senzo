# Senzo — data model (Cloudflare D1 / SQLite + Drizzle)

One D1 database per environment (dev, staging, prod), APAC location hint. Schema lives in `apps/api/src/db/schema/*.ts` (Drizzle); SQL migrations in `apps/api/migrations/`, applied with Wrangler. This file is the reference; the Drizzle schema is the truth once it exists — keep both in sync in the same PR. Enum values live once in `packages/schemas/src/enums.ts` and feed both the zod schemas and the CHECK constraints.

## Conventions

- Primary keys: `id TEXT` — ULID (sortable, safe to show). Public codes (`SZ-1042`, `REQ-208`, `SR-2041`) are separate `code` columns.
- Money: `INTEGER` paise. Never floats. Column names end in `_paise`.
- Time: `INTEGER` Unix epoch **milliseconds, UTC**, names end in `_at`. Dates of a booking: `date TEXT 'YYYY-MM-DD'` in IST + `slot`.
- Enums: `TEXT` with a CHECK constraint, mirrored by a zod enum in `packages/schemas`.
- Booleans: `INTEGER` 0/1. JSON: `TEXT` validated by zod on read and write.
- Every table: `created_at`, `updated_at`. Soft delete only where stated (`deleted_at`).
- Encrypted fields (`*_enc`): AES-GCM with a key from Workers secrets; never logged.
- Writes that must succeed together (booking + payment + ledger + outbox) go in one `db.batch()`.
- Migrations are expand → migrate → contract; never drop or rename a column in the same release that stops using it.

## Tables

### Identity

| Table | Key columns | Notes |
| --- | --- | --- |
| `users` | id, phone_e164 (unique), name, email, role_flags (`guest`,`chef`), age_confirmed_at, lang (`en`,`gu`,`hi`), status (`active`,`blocked`,`deleted`), deleted_at | One person can be guest and chef |
| `devices` | id, user_id, platform (`android`,`ios`,`web`), push_token, app (`guest`,`partner`), last_seen_at | Push targets |
| `sessions` | id, user_id, device_id, refresh_hash, expires_at, rotated_from, revoked_at | 30-day refresh, rotate on use; reuse ⇒ revoke all |
| `otp_codes` | id, phone_e164, purpose (`login`), code_hash, attempts, expires_at | 5-minute life; nightly clean-up |
| `consents` | id, user_id, kind (`terms`,`privacy`,`marketing`), version, granted_at, withdrawn_at | DPDP record |

### Guests

| Table | Key columns | Notes |
| --- | --- | --- |
| `addresses` | id, user_id, label (`home`,`work`,`other`), line1, area, city, pincode, lat, lng, flat_enc, gate_notes_enc, service_area_id, is_default | Flat + gate notes shown to the chef only after acceptance, until 24 h after the job |
| `food_profiles` | user_id (pk), allergies (JSON list), rules (JSON: jain count, no-onion-garlic, other), notes | Shown to every chef booked |
| `favourites` | user_id, chef_id | |
| `wallets` | user_id (pk), balance_paise | Derived from `wallet_entries`; never edited directly |
| `wallet_entries` | id, user_id, amount_paise (±), reason (`refund_credit`,`promo`,`goodwill`,`spent`), booking_id, expires_at | |

### Chefs

| Table | Key columns | Notes |
| --- | --- | --- |
| `chefs` | id, user_id (unique), slug (unique), display_name, headline, bio, years_cooking, base_lat, base_lng, service_radius_km, max_guests, has_helper, status (`draft`,`in_review`,`live`,`paused`,`suspended`), paused_until, rating_avg, rating_count, jobs_done, accept_rate, reply_minutes_p50, strikes | Status changes logged in `audit_logs` |
| `chef_cuisines` | chef_id, cuisine, level (`good`,`great`,`expert`) | C22 |
| `chef_food_rules` | chef_id, rule (`jain`,`no_onion_garlic`,`vegan`,`eggless`,`kids`) | C22 |
| `chef_occasions` | chef_id, occasion | Kitty party, birthday, live counters… |
| `chef_proofs` | id, chef_id, kind (`kitchen`,`training`,`certificate`), title, detail, file_key, status (`need`,`review`,`ok`,`rejected`), reviewed_by | Green ticks on G07 |
| `kyc_checks` | id, chef_id (or helper_id), kind (`aadhaar`,`pan`,`bank`,`background`,`liveness`), provider, provider_ref, status, aadhaar_last4, expires_at | Never store full Aadhaar |
| `helpers` | id, chef_id, name, phone_e164, status | Pass the same checks |
| `bank_accounts` | id, chef_id, holder_name, ifsc, account_last4, account_enc, razorpay_linked_account_id, penny_drop_status, payouts_paused_until | 24 h pause after change |
| `availability` | chef_id, date, slot (`lunch`,`dinner`,`late`), state (`open`,`off`) | Booked state comes from `bookings` |
| `cooking_days` | chef_id, weekday, slots (JSON) | Default weekly pattern |

### Menus

| Table | Key columns | Notes |
| --- | --- | --- |
| `dishes` | id, chef_id, name, course, food_type (`veg`,`jain`,`vegan`,`egg`,`non_veg`), description (≤ 90), photo_key, is_signature, review_status | Specialties (C03) |
| `set_menus` | id, chef_id, name, summary, min_booking_paise, grocery_saving_paise, offers_jain, offers_nog, is_live, sort, kind (`event`,`meal_prep`) | C20 |
| `menu_bands` | menu_id, min_guests, max_guests, price_per_guest_paise | Non-increasing by size |
| `menu_courses` | id, menu_id, name, position | "Starter 1", "Main 1"… |
| `menu_options` | id, course_id, dish_id, extra_paise, jain_flag (`ok`,`jain_version`,`not_jain`), needs_oven, oven_alt_text, position | First option = default |
| `menu_addons` | id, menu_id, name, price_per_guest_paise, note | |
| `meal_prep_plans` | menu_id, visits_per_week, price_per_visit_paise | G07, G23 |

### Discovery and requests

| Table | Key columns | Notes |
| --- | --- | --- |
| `service_areas` | id, city, name, polygon (GeoJSON), is_live | "Not in Sanand yet" |
| `chef_search` (FTS5 virtual table) | chef_id, name, cuisines, dishes, tags | Kept in sync by queue consumer. Not created yet: hand-written SQL migration with the search module (Drizzle can't declare FTS5) |
| `search_synonyms` | term, synonym | dhokla ↔ dhokra ↔ ઢોકળા |
| `menu_requests` | id, code (`REQ-`), guest_id, occasion, guests, visits_per_week, date, slot, cuisines (JSON), food_rule, budget_tier, must_haves, groceries (`chef`,`guest`), address_id, status (`open`,`closed`,`booked`,`expired`), reply_deadline_at | G23 |
| `request_invites` | request_id, chef_id, invited_at, seen_at | Who was asked |
| `proposals` | id, request_id, chef_id, menu (JSON snapshot), price_per_guest_paise, brings_helper, note, held_until, status (`sent`,`chosen`,`expired`,`withdrawn`) | Max 3 per request; held 24 h |

### Bookings and jobs

| Table | Key columns | Notes |
| --- | --- | --- |
| `bookings` | id, code (`SZ-`), guest_id, chef_id, menu_id, proposal_id, address_id, date, slot, guests, food_rule, groceries_by, state, sub_status (`on_the_way`,`awaiting_finish`,`possible_no_show`), eta_minutes, price_snapshot (JSON), menu_total_paise, convenience_fee_paise, fee_gst_paise, promo_code, promo_paise, wallet_paise, total_paise, platform_fee_paise, platform_fee_gst_paise, chef_share_paise (= menu_total − platform fee − its GST), allergies_ack_at, accepted_at, started_at, done_at, completed_at, paid_out_at, cancelled_by, cancel_reason, rescheduled_from | Unique partial index below |
| `booking_items` | booking_id, course, dish_name, extra_paise, is_addon, per_guest | Exact dishes the guest chose |
| `booking_events` | id, booking_id, from_state, to_state, actor (`guest`,`chef`,`system`,`admin`), actor_id, reason, at | Append-only |
| `job_otps` | booking_id, kind (`start`,`finish`), code_hash, attempts, valid_from, valid_to, used_at | 5 tries |
| `job_checks` | booking_id, kind (`arrival`,`door_wait`,`call`), lat, lng, distance_m, at | Arrival > 300 m flagged |
| `kitchen_checks` | booking_id, gas, oven, mixer, fridge | From G22 |

```sql
CREATE UNIQUE INDEX one_booking_per_slot
  ON bookings (chef_id, date, slot)
  WHERE state IN ('requested', 'confirmed', 'in_progress');
```

### Money

| Table | Key columns | Notes |
| --- | --- | --- |
| `payments` | id, booking_id, razorpay_order_id, razorpay_payment_id, method, amount_paise, status, captured_at | Updated only from verified webhooks |
| `transfers` | id, booking_id, razorpay_transfer_id, chef_id, amount_paise, on_hold, released_at, reversed_at | Route |
| `refunds` | id, booking_id, razorpay_refund_id, amount_paise, reason, status | |
| `ledger_accounts` | id, kind (`guest_cash`,`chef_payable`,`platform_revenue`,`gateway_fee`,`gst_payable`,`tds_payable`,`wallet_liability`,`promo_expense`), owner_id | Unique (kind, owner_id); owner_id is `''` for platform-wide accounts |
| `ledger_entries` | id, txn_id, account_id, amount_paise (±), booking_id, memo, at | Σ per `txn_id` = 0; Σ per booking = 0 at the end |
| `payouts` | id, chef_id, amount_paise, razorpay_payout_ref, status (`queued`,`sent`,`failed`,`paid`), failure_reason, attempted_at | C09, C17 |
| `tips` | id, booking_id, amount_paise, payment_id | 100% to the chef |
| `promo_codes` | code, kind, amount_paise / percent, max_uses, per_device_limit, valid_from, valid_to | |
| `promo_redemptions` | code, user_id, device_id, booking_id | One first-booking promo per device |
| `invoices` | id, number (`INV-`), booking_id, kind (`chef_service`,`platform_commission`), pdf_key, issued_at | G21 |
| `tax_statements` | id, chef_id, period, kind (`monthly`,`form16a`,`annual`), pdf_key | C18 |

### Communication, reviews, safety

| Table | Key columns | Notes |
| --- | --- | --- |
| `threads` | id, booking_id or request_id, guest_id, chef_id | One per booking/proposal |
| `messages` | id, thread_id, sender_id, kind (`text`,`photo`,`menu_card`,`system`), body, menu_card (JSON), flags (JSON: phone/UPI/cash detected), read_at | Kept 1 year after the booking |
| `call_sessions` | id, booking_id, exotel_ref, from_side, started_at, duration_s | Masked calls |
| `notifications` | id, user_id, event, title, body, deep_link, channel, sent_at, read_at | G20 |
| `notification_prefs` | user_id, marketing_opt_in, quiet_hours | |
| `reviews` | id, booking_id, author_side (`guest`,`chef`), stars, tags (JSON), text, is_private, do_not_match | Chef→guest reviews are private |
| `reports` | id, code (`SR-`), booking_id, reporter_id, category, details, photo_keys, status (`open`,`investigating`,`resolved`), outcome (`none`,`partial_refund`,`full_refund`), resolved_by | G19 |
| `sos_events` | id, booking_id, user_id, lat, lng, at, handled_by | |

### Platform

| Table | Key columns | Notes |
| --- | --- | --- |
| `outbox_events` | id, type (`booking.confirmed`…), payload (JSON), created_at, published_at | Written in the same batch as the change |
| `webhook_events` | id, provider, event_id (unique per provider), signature_ok, payload, processed_at | Idempotency for webhooks |
| `idempotency_keys` | key, user_id, route, request_hash, status_code, content_type, response, created_at | PK (user_id, key). Kept 24 h. `status_code` null = first request still running (409); different body = 422; 5xx not stored |
| `audit_logs` | id, admin_id, action, entity, entity_id, before (JSON), after (JSON), at | Append-only |
| `admin_users` | id, email, role (`support`,`operations`,`finance`,`admin`) | Sign-in via Cloudflare Access |
| `feature_flags` | key, value | Or PostHog flags |

## Not in D1

- Photos and documents → R2 (`public-media`, `private-kyc`, `documents` buckets); tables store only object keys.
- Live connections, soft locks, OTP attempt counters → Durable Objects.
- Logs → Workers Logs + Logpush to R2 (180 days).
