# Senzo — product spec (v1, Ahmedabad launch)

**One line:** Senzo lets families in Ahmedabad book a verified private chef who cooks a fresh meal in their own kitchen — for a dinner, a party or weekly meal prep. Chefs use the Senzo Partner app to get bookings and get paid.

Related: `docs/business-rules.md` (all numbers), `docs/booking-states.md`, `docs/screens.md`, `docs/api.md`, `docs/data-model.md`, `docs/decisions.md`. Architecture: https://claude.ai/artifact/KTLxG5pPhDruhmwQhifusu

## Goals for launch

Targets marked *(proposed)* are starting points for the founder to confirm.

| Goal | Measure |
| --- | --- |
| Guests can find and book a chef in a few minutes | Rail → paid booking in ≤ 5 min median *(proposed)* |
| Chefs answer fast | 80% of requests answered in ≤ 30 min; auto-decline rate < 10% *(proposed)* |
| Money is always right | 0 unreconciled ledger differences; payment-to-confirmation < 30 min for 90% of bookings |
| Trust | 100% of live chefs verified; < 2% of jobs end in a dispute *(proposed)* |
| Beta | 20 chefs and 100 guests in Ahmedabad before public launch |

## Users

- **Guest** — books and pays; 18+; usually hosting family or friends; often has food rules (Jain, no onion-garlic) or allergies.
- **Chef (Partner)** — independent home or hotel-trained cook; sets menus and prices; needs predictable payouts.
- **Helper** — comes with a chef for 20+ guests; verified like the chef.
- **Ops team** — Support, Operations, Finance, Admin roles in the admin panel.

## In scope (v1)

Guest app, Partner app, public web (chef pages, booking, chef signup), admin panel, all on the stack in `docs/decisions.md`.

## Not in scope (v1)

Maps or live tracking · WhatsApp · in-app purchases / RevenueCat · food delivery or tiffins · cities other than Ahmedabad · non-veg filters beyond chef food types · subscriptions billed by the stores.

## Epics and user stories

Each story is done when its checks pass and the screen matches the mockup (with the fixes listed in `docs/screens.md`).

### E1 — Sign in (G01–G03, C11)
- As a guest or chef, I sign in with my phone number and a 6-digit SMS code.
  - Code arrives by SMS (voice call fallback); Android auto-reads it; 5-minute expiry; 3 resends an hour; Turnstile before sending.
  - New users confirm they are 18+ and accept Terms & Privacy (consent saved with version).
  - Session lasts 30 days with rotating refresh; reuse of an old refresh token logs out all devices.

### E2 — Find a chef (G04, G07)
- As a guest, I swipe through chefs near my address and search by dish, cuisine or rule ("Jain", "undhiyu").
  - Rail shows only live chefs who serve my area; ranking by distance, rating, acceptance, reply time and availability.
  - Empty search offers "Ask chefs to make it" → E6.
- As a guest, I open a chef's profile and see verified experience, cuisines, occasions, set menus, real guest photos and reviews.
  - Only verified proofs show a green tick; unverified items are hidden.

### E3 — Build my menu (G22)
- As a guest, I pick guests, food rule, one dish per course, add-ons, who buys groceries and what my kitchen has.
  - Price per guest and total update from `POST /quotes` (server price, never computed only in the app).
  - Jain mode swaps dishes marked "not Jain" automatically and explains it.
  - Below the chef's minimum → "Pick date" disabled with the minimum shown.
  - No gas → induction offer; no oven → alternative serving explained.

### E4 — Book and pay (G08, G09, G10)
- As a guest, I choose a free date and slot, my address and notes, then pay by UPI, card or netbanking.
  - Booked/off slots can't be chosen; a slot taken during checkout shows `SLOT_TAKEN` and suggests other slots.
  - Booking becomes "requested" only after the server confirms payment (signature + webhook).
  - Confirmation shows the start OTP and the timeline; "free cancellation until …" date is shown.

### E5 — Chef accepts (C04, C05, G17)
- As a chef, I get a request with guests, menu, area, earnings and allergies, and accept or decline within 2 hours.
  - Accept requires ticking the allergy acknowledgement.
  - No answer in 2 h → auto-decline, full refund, guest sees 3 similar free chefs (G17).
  - After accept: full address, chat and masked calls unlock.

### E6 — Get menus from chefs (G23, G24, C21)
- As a guest unsure what to order, I describe the occasion, guests, date, food, budget and must-haves, and get up to 3 menus.
  - Only matching verified chefs see it; my address and number stay hidden.
  - Each proposal holds its price for 24 h; I can chat with a chef or book one in one tap.
  - Weekly meal prep is an occasion type with visits per week.
- As a chef, I reply with a menu from my specialties, a price per guest (with a budget indicator), helper option and a note.

### E7 — Chat and calls (G15, G12)
- Chat per booking with text, photos and proposed-menu cards; accepting a card locks the menu.
- Phone numbers never shown; masked calls from 24 h before to 24 h after; chat warns on phone numbers, UPI IDs and "pay cash".

### E8 — The job (C13, C06, C07, C08, G12, C14)
- Chef taps "I'm on my way" with an ETA; guest sees status + ETA (no map).
- At the door, chef enters the guest's start OTP; job starts; location checked once.
- Chef taps done → guest gets the finish OTP → chef enters it → job complete.
- Guest not responding → chef waits 30 min with door log → marks no-show → no-show fee per rules.
- Everything on these screens works offline from cache; OTP checks need the server.

### E9 — After the meal (G13, C15, G21)
- Guest rates the chef and can tip (100% to the chef); chef rates the guest privately.
- Invoices (chef service bill + Senzo commission invoice) are available as PDF.

### E10 — Changes and problems (G16, G19)
- Guest cancels or reschedules once with the refund shown before confirming (policy in business rules).
- Guest reports a problem or presses SOS; payout freezes; support calls back within 15 minutes.

### E11 — Chef onboarding and profile (C01–C03, C12, C20, C22, C10, C19)
- Three-step onboarding: profile → verification & bank → specialties & price; go live when complete.
- Set menus with group price bands, minimum, grocery saving, add-ons, Jain toggle; availability calendar; experience & proof uploads; pause or delete account.
- Bank change pauses payouts 24 h and needs OTP + penny-drop.

### E12 — Earnings (C09, C17, C18)
- Chef sees released, on-hold and paid amounts; daily payout at 11 AM or "Withdraw now"; failed payouts explained with a fix path; monthly statements and TDS certificates.

### E13 — Account and privacy (G14, G18, G20, C19)
- Saved addresses (Places autocomplete, no map; outside service area shows "not in <area> yet"), allergies and food rules, wallet, favourites, notifications.
- Download my data, delete my account (DPDP), marketing opt-in separate.

### E14 — Admin (no mockup yet)
- Operations approves chefs and proofs; Support searches bookings, sees timeline/chat/calls, refunds, resolves reports; Finance holds/releases/retries payouts and reconciles; Admin manages roles, promo codes, service areas. Every action is in the audit log.

### E15 — Web (Main, ChefSignup)
- Public chef pages indexed by Google; booking and payment on web; chef signup on web ending with "download Senzo Partner"; app links open the app when installed.

## Notifications (summary)

| Event | Guest | Chef |
| --- | --- | --- |
| Booking requested | — | Push + SMS if unopened (critical) |
| Accepted / declined | Push (+ SMS for declined) | — |
| Reminder 24 h / 2 h | Push | Push |
| On my way | Push with ETA | — |
| Finish OTP ready | Push | — |
| Payout sent / failed | — | Push (+ SMS for failed) |
| Menu proposal received | Push | — |
| New menu request | — | Push |

Critical pushes fall back to SMS after 10 minutes unopened; marketing only with opt-in, never 10 PM–8 AM. SMS templates must be DLT-registered before launch.

## Release plan

1. **Internal** (weeks 1–14): build on dev/staging with Razorpay test mode and seeded mock data from the design.
2. **Beta** (weeks 15–18): Play internal testing + TestFlight; 20 chefs, 100 guests in Ahmedabad.
3. **Launch** (week ~20): public stores and web; Razorpay live; KYC provider live.

Week 1 paperwork: Razorpay Route approval, KYC/background provider contracts, MSG91 DLT registration, Exotel account, trademark filing for SENZO, domains.

## Open questions

See `docs/business-rules.md` → Open questions (Q1–Q7). Also: final admin panel design; Gujarati/Hindi copy; legal texts (Terms, Privacy, chef agreement, refund policy).
