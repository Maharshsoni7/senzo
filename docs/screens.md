# Senzo — screen map

Every screen in the approved mockup, where it lives in the code, and what it calls. Mockup source for each screen is in `design/mockups/m/<ID>-*.dc.html` (web pages in `design/mockups/`). Live mockup: https://claude.ai/artifact/YG47do5uVVJyJuMRXHG9H1

Every data screen needs four states: **loading** (skeleton), **empty**, **error** (retry + support link) and **offline** (cached data with a banner). Chef job screens (C05–C08, C13, C14) must open from cache without network.

## Guest app — `apps/guest` (Expo Router)

| ID | Screen | Route | Main API calls | Module |
| --- | --- | --- | --- | --- |
| G01 | Welcome | `app/(auth)/welcome.tsx` | — | Auth |
| G02 | Login (phone) | `app/(auth)/login.tsx` | `POST /auth/otp/request` | Auth |
| G03 | Verify OTP | `app/(auth)/verify.tsx` | `POST /auth/otp/verify` | Auth |
| G04 | Home · chef rail + search | `app/(tabs)/index.tsx` | `GET /chefs` | Discovery |
| G05 | Search results | `app/search.tsx` | `GET /chefs?q=` | Discovery |
| G06 | Filters | `app/search/filters.tsx` (sheet) | `GET /chefs?rule=&cuisine=&guests=&date=&slot=` | Discovery |
| G07 | Chef profile + experience | `app/chef/[slug]/index.tsx` | `GET /chefs/:slug`, `/menus`, `/reviews` | Discovery |
| G22 | Set menu · Jain, add dishes, groceries | `app/chef/[slug]/menu/[menuId].tsx` | `POST /quotes` | Menus |
| G08 | Check availability | `app/book/when.tsx` | `GET /chefs/:id/availability`, `POST /quotes` | Bookings |
| G09 | Checkout & pay | `app/book/checkout.tsx` | `POST /bookings`, Razorpay SDK, `POST /bookings/:id/payment/verify` | Payments |
| G10 | Booked + start OTP | `app/booking/[id]/confirmed.tsx` | `GET /bookings/:id` | Bookings |
| G11 | My bookings | `app/(tabs)/bookings.tsx` | `GET /bookings` | Bookings |
| G12 | Live booking + finish OTP | `app/booking/[id]/index.tsx` | `GET /bookings/:id`, WS `/ws/bookings/:id`, `POST /bookings/:id/calls` | Job check |
| G13 | Rate & tip | `app/booking/[id]/rate.tsx` | `POST /bookings/:id/review`, `/tip` | Reviews |
| G14 | Account + allergies | `app/(tabs)/account.tsx` | `GET /me`, `/me/food-profile`, `/me/wallet` | Users |
| G15 | Chat + proposed menu | `app/chat/[threadId].tsx` | `/threads/:id/messages`, WS, menu-card accept | Chat |
| G16 | Cancel / reschedule | `app/booking/[id]/change.tsx` | `GET /cancellation-quote`, `POST /cancel`, `POST /reschedule` | Bookings |
| G17 | Chef declined · refunded | `app/booking/[id]/declined.tsx` | `GET /bookings/:id`, `GET /chefs?date=&slot=` | Bookings |
| G18 | Add address | `app/addresses/new.tsx` | `/places/autocomplete`, `/places/:id`, `POST /me/addresses` | Users |
| G19 | Report a problem (+ SOS) | `app/booking/[id]/report.tsx` | `POST /reports`, `POST /sos`, `POST /uploads` | Trust & safety |
| G20 | Notifications | `app/notifications.tsx` | `GET /me/notifications` | Notifications |
| G21 | Invoice | `app/booking/[id]/invoice.tsx` | `GET /bookings/:id/invoices` | Invoices |
| G23 | Plan my event · get menus | `app/plan/index.tsx` | `POST /menu-requests` | Requests |
| G24 | Menus from 3 chefs | `app/plan/[requestId].tsx` | `GET /menu-requests/:id`, `POST /proposals/:id/book` | Requests |

Guest flow: G01 → G02 → G03 → G04 → G07 → G22 → G08 → G09 → G10 → G12 → G13. Alternative: G04 "Not sure?" → G23 → G24 → G09.

## Partner app (chefs) — `apps/chef`

| ID | Screen | Route | Main API calls | Module |
| --- | --- | --- | --- | --- |
| C11 | Chef login | `app/(auth)/login.tsx` | `/auth/otp/*` | Auth |
| C01 | Onboarding · profile | `app/onboarding/profile.tsx` | `PUT /partner/profile`, `POST /uploads` | Chefs |
| C02 | KYC & bank | `app/onboarding/verify.tsx` | `POST /partner/kyc/:kind`, `POST /partner/bank` | Chefs |
| C03 | Specialties & price | `app/onboarding/specialties.tsx` | `/partner/dishes`, `POST /partner/go-live` | Chefs |
| C04 | Chef home | `app/(tabs)/index.tsx` | `GET /partner/bookings?scope=requests\|upcoming`, earnings summary | Bookings |
| C05 | Booking request + allergy check | `app/request/[id].tsx` | `GET /partner/bookings/:id`, `/accept`, `/decline` | Bookings |
| C13 | I'm on my way | `app/job/[id]/on-my-way.tsx` | `POST /on-my-way` | Job check |
| C06 | Arrive · start OTP | `app/job/[id]/start.tsx` | `POST /start` | Job check |
| C07 | Cooking in progress | `app/job/[id]/cooking.tsx` | `POST /done` | Job check |
| C08 | Finish OTP · payout | `app/job/[id]/finish.tsx` | `POST /finish` | Job check |
| C14 | Guest not responding | `app/job/[id]/no-show.tsx` | `POST /door-log`, `POST /no-show` | Job check |
| C15 | Rate the guest | `app/job/[id]/rate-guest.tsx` | `POST /rate-guest` | Reviews |
| C09 | Earnings & withdraw | `app/(tabs)/earnings.tsx` | `GET /partner/earnings`, `POST /payouts/withdraw` | Ledger |
| C17 | Payout failed | `app/payouts/[id].tsx` | `GET /partner/payouts/:id` | Ledger |
| C18 | Tax statements | `app/tax.tsx` | `GET /partner/tax-documents` | Ledger |
| C10 | Availability calendar | `app/(tabs)/calendar.tsx` | `/partner/availability` | Chefs |
| C12 | Edit profile + bank | `app/(tabs)/profile.tsx` | `/partner/profile`, `/partner/bank` | Chefs |
| C20 | Set menus | `app/menus/index.tsx` | `/partner/menus` | Menus |
| C21 | Reply to menu request | `app/menu-requests/[id].tsx` | `GET /partner/menu-requests/:id`, `POST /proposals` | Requests |
| C22 | Experience & proof | `app/experience.tsx` | `PUT /partner/experience`, `POST /partner/proofs` | Chefs |
| C16 | Past jobs | `app/jobs/past.tsx` | `GET /partner/bookings?scope=past` | Bookings |
| C19 | Pause / delete account | `app/settings.tsx` | `POST /partner/pause`, `DELETE /partner/account` | Chefs |

Chef flow: C11 → C01 → C02 → C03 → C04 → C05 → C13 → C06 → C07 → C08 → C15.

## Web — `apps/web` (Next.js via Vinext)

| Mockup | Page | Route |
| --- | --- | --- |
| Main | Browse & book chefs (the "ticket rail") | `/`, `/chef/[slug]`, `/city/[city]` |
| ChefSignup | Chef profile upload | `/join` → then "download Senzo Partner" |

## Admin — `apps/admin` (no mockup yet)

Needs design before building: chef approval queue, booking search with timeline, refunds and disputes, payouts (hold/release/retry), promo codes, service areas, audit log. See `docs/api.md` → Admin.

## Shared components (`packages/ui`)

From the mockup components: `ChefFig` (illustrated chef figure), `DishArt` (dish illustrations), `KitchenBg` (kitchen background). Build them with `react-native-svg`.

## Known gaps in the mockup (fix in code, not by copying the mockup)

| Screen | Problem | Do this instead |
| --- | --- | --- |
| G18 | Shows a map ("Move map to your gate") — decision is **no map on screen** | Places autocomplete + "use my current location" + typed flat/gate notes |
| C13 | Shows a route map, says live location is shared, has "Open in Maps" link | Status + ETA picker (15/30/45 min); "Open in Google Maps" button that opens the phone's Maps app with the address; no live location |
| G13 | Says payment "has been released" right after the job | Say it will be released in 24 h if there's no problem |
| G22 → G08 → G09 | Each mockup screen has its own demo state; choices don't carry over | One booking draft (Zustand) + `POST /quotes` on every change |
| C02 | Lets chefs take requests after ID + bank | Follow `docs/business-rules.md` Q1 |
| G09 | Promo shown applied while G10/G16 show the total without it | Use the server quote everywhere |

### Mockup items not in the spec (founder to decide; built without them)

| Screen | In the mockup | Built as |
| --- | --- | --- |
| G02 | "Continue with Google / Apple" | Phone OTP only (E1) |
| G03 | "New here? Tell us a little" (name, area, food preference) | Not yet — needs `PATCH /me`; `isNewUser` is kept for it |
| G04 | Chef preview bottom sheet | "View & book" opens the profile (G07) |
| G05 | Sort menu | API ranking only ("recommended") |
| G06 | Breakfast, rating, price range, "chef speaks", police-verified only, Vegan / Eggless / Non-veg | Date, meal (lunch/dinner/late), guests, cuisine, Jain / no onion-garlic |
| G07 | Save to favourites, real guest photos | Not yet — needs `/me/favourites` and photo uploads |
