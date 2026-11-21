# Senzo — business rules

The single source of truth for money, time limits and policies. Code in `apps/api` must match this file; if they disagree, this file wins until it is changed in a reviewed PR. Numbers come from the approved mockup (screen IDs in brackets) and the architecture doc.

Conventions: money is stored as **integer paise** (₹1 = 100 paise); all times are stored in **UTC** and shown in **IST**. "Guest" = person booking; "chef" = person cooking (Senzo Partner app).

## 1. Menus and prices (set by the chef)

| Rule | Value | Screens |
| --- | --- | --- |
| Price is **per guest**, set in **group-size bands** | Example "Gujarati Classic": 2–4 guests ₹2,200 · 5–10 ₹1,800 · 11–20 ₹1,500 | C20, G22, G08 |
| Bigger groups never pay more per guest than smaller groups | Validation: each band's price ≤ the previous band's | C20 |
| Each menu has a **chef minimum booking** (menu total before fees) | Example ₹4,000; chef changes it in ₹500 steps | C20, G22 |
| Guest count limits per chef | Chef's capacity, e.g. 2–12 for one menu, max 40 with a helper | G08, C22 |
| **Dish options** per course: some swaps cost extra per guest | Example: Paneer Tikka +₹150, Puri & Veg Pulao +₹50, Mango Rasmalai +₹100 | G22 |
| **Add-ons**, priced per guest | Example: Live jalebi counter ₹120, Extra farsan ₹60, Second dessert ₹80, Masala chaas ₹40 | G22, C20 |
| **Groceries**: chef brings them (default, included) or guest buys them | Guest buys → saves the chef-set amount per guest (e.g. ₹250); chef sends the exact list 2 days before | G22, C20 |
| **Food rules**: Regular, Jain, No onion-garlic | Same price. Each dish is flagged: `ok`, `jain_version` (cooked differently), `not_jain` (auto-swapped to the first Jain-safe option in Jain mode) | G22, C20 |
| **Kitchen check** | No gas/induction → chef can bring induction for ₹200 (one-off). No oven → oven dishes served in another form (e.g. tart → shrikhand cups) | G22 |
| New photos and dishes go live only after a quick ops review | — | C12 |

**Price formula (server-side only, never trust the app):**

```
per_guest   = band_price(guests) + Σ option_extras + Σ addon_prices − grocery_saving (if guest buys)
menu_total  = per_guest × guests  (+ one-off extras such as induction ₹200)
valid only if menu_total ≥ chef_minimum
guest_pays  = menu_total + convenience_fee + GST on convenience fee − promo − wallet used
```

The price is **snapshotted** on the booking at checkout; later menu edits by the chef never change it.

## 2. Fees, commission, tips

| Rule | Value | Screens |
| --- | --- | --- |
| Guest **convenience fee** | ₹149 per booking + 18% GST on the fee (₹27) | G09 |
| Chef **platform fee (commission)** | 15% of `menu_total` (not of tips, not of the convenience fee) | C03, C05, C08, C21 |
| Example | 6 guests × ₹1,800 = ₹10,800 → fee ₹1,620 → chef gets ₹9,180 (+ ₹200 tip = ₹9,380) | C08 |
| **Tips** | Optional, added after the job; 100% goes to the chef | G13, C08 |
| **Promo codes** | One per booking, one first-booking promo per device (e.g. `FIRSTFEAST` −₹500); platform pays for promos, never the chef | G09 |
| **Senzo wallet** | Balance from refunds-as-credit and goodwill; can pay part of a booking | G09, G14 |

## 3. Booking lifecycle and time limits

| Rule | Value | Screens |
| --- | --- | --- |
| **Slots** | Lunch 12:30 PM · Dinner 7:30 PM · Late 9:30 PM (fixed); one active booking per chef per date + slot | G08 |
| Chef **arrives** | About 2 hours before serving time (dinner 7:30 → reach by 5:30) | C05, C13 |
| Checkout **soft lock** | 10 minutes on the chef's slot while the guest pays | — |
| Booking counts as paid | Only after the server verifies the Razorpay signature **and** the `payment.captured` webhook | G09 |
| Chef must **accept or decline** | Within **2 hours**; otherwise auto-declined, full refund, similar chefs suggested | C05, G17 |
| Accepting needs **allergy acknowledgement** | Chef ticks "I've read the allergies & food rules" | C05 |
| Unlocked after acceptance | Full address, chat, masked calls | C05 |
| Masked calls window | From 24 h before to 24 h after the booking | G12, G15 |
| **Grocery list** | Shared by the chef by the day before (2 days before if the guest buys) | G15, G22 |
| **Menu chat** | Chef can send a proposed-menu card; once the guest accepts, the menu is locked | G15 |
| **Reminders** | 24 h and 2 h before the slot, to both sides | — |
| **On my way** | Chef taps it and picks an ETA (15/30/45 min). Guest sees status + ETA only. No map, no live tracking | C13, G12 |
| **Start OTP** | 4 digits, shown to the guest, typed by the chef at the door; 5 tries; valid only in the booking window. Chef location read once here; > 300 m from the address is flagged, not blocked | G10, C06 |
| **Finish OTP** | Created when the chef taps "done"; shown to the guest; typed by the chef | G12, C08 |
| **Auto-complete** | If the guest never shares the finish OTP, the job completes 2 h after the chef tapped "done", unless the guest opens a report | C08 |
| **Payout release** | 24 h after completion if no report is open; then paid out in the chef's next daily payout (11 AM) or by "Withdraw now" | C08, C09 |

## 4. Cancellation, rescheduling, refunds (guest side)

| When the guest cancels | Guest gets back | Chef gets | Screen |
| --- | --- | --- | --- |
| More than 48 h before the slot | 100% | 0 | G16 |
| 24–48 h before | 50% | 50% of the menu total (minus platform fee) | G16 |
| Less than 24 h before | 0 | 100% of their share | G16 |

- The convenience fee follows the same split. *(Open question Q3.)*
- **Reschedule**: free **once**, up to 48 h before; the chef must accept the new date/slot (G16). If the chef doesn't accept within 2 h, the original booking stands. *(proposed)*
- Refunds go back to the original payment method; usually 3–5 working days. (G16, G17)
- **Chef declines or times out** → 100% refund including the convenience fee. (G17)
- **Chef cancels after accepting** → 100% refund + ₹250 wallet credit to the guest; the chef gets a strike (3 strikes in 90 days → paused for review). *(Open question Q4.)*

## 5. No-shows and disputes

| Case | Rule | Screens |
| --- | --- | --- |
| **Guest no-show** | Chef waits **30 min** at the door (calls + door log + location). Then chef marks no-show → chef gets **50% of their earnings** as a no-show fee in the next payout; the rest is refunded to the guest *(proposed)*. Guest can dispute within **24 h** | C14 |
| **Chef no-show** | No start OTP 30 min after the start time → system calls both sides and opens the no-show flow. Confirmed chef no-show → 100% refund + wallet credit; chef paused for review *(proposed, see Q4)* | — |
| **Report / dispute** (food, hygiene, damage, cash request, safety, other) | Payout stays on hold until support decides: no refund, partial or full refund. Support calls back within 15 min. Guest is told not to share the finish OTP | G19 |
| **SOS** | Button during every job: shares location with support and an emergency contact, offers a 112 call | G19 |

## 6. Menu requests ("Tell chefs what you want")

| Rule | Value | Screens |
| --- | --- | --- |
| Who sees a request | Only verified, live chefs who serve the guest's area and match the food rules; guest's address and number stay hidden | G23 |
| Replies | Up to **3 chef menus** per request; request closes after 3 replies or the reply window | G24, C21 |
| Reply window | Shown as a countdown to chefs. *(Open question Q5 — proposed 6 h.)* | C21 |
| Price hold | A chef's proposal is held **24 h**; after that it closes | G24, C21 |
| Budget tiers | Simple ₹500–800 · Special ₹800–1,500 · Premium ₹1,500+ per guest | G23 |
| Helper | Recommended for 20+ guests; helpers pass ID + background checks too | C21, C22 |
| **Weekly meal prep** | 3-hour visit, 12–15 dishes packed in the guest's boxes; guest buys groceries from the chef's list; price per visit with a discount for more visits per week (e.g. 1×/week ₹1,400, 2×/week ₹1,250 per visit); pause anytime | G07, G23 |

## 7. Chefs: onboarding, verification, payouts

| Rule | Value | Screens |
| --- | --- | --- |
| Onboarding | 3 steps: profile → verify & bank → specialties & price; at least **3 signature dishes** and **1 cooking day** to go live | C01–C03 |
| Verification | Aadhaar e-KYC (DigiLocker + liveness), PAN, bank ₹1 penny-drop, police/background check, experience proof | C02, C22 |
| When a chef can go live | *(Open question Q1: mockup C02 allows requests after ID + bank; architecture doc requires all checks.)* | C02 |
| Aadhaar | Store only the provider reference + last 4 digits | — |
| Checks repeat | Every year | — |
| Changing bank account | OTP confirmation + ₹1 penny-drop; **payouts pause 24 h** | C12 |
| Payout schedule | Daily auto-payout at 11 AM; "Withdraw now" for released money (~30 min) | C09 |
| Failed payout | Money stays in the chef's Senzo balance; chef fixes bank details; retry | C17 |
| TDS | Section 393(1) (old 194O): 0.1% of gross; not for a resident individual under ₹5 lakh a year with PAN/Aadhaar. Track each chef's yearly total. **Confirm with a CA.** | C18 |
| Pause | 1 week · 2 weeks · until turned back on; hidden from the rail; accepted bookings stay | C19 |
| Delete account | Only with no upcoming bookings and no pending payout; type DELETE; invoices/tax records kept as the law requires | C19 |

## 8. Guests and accounts

- Phone OTP login: 6 digits, valid 5 minutes, 3 resends per hour; Turnstile before sending.
- Guests must be **18+** (confirmed at signup).
- Allergies and food rules are saved on the account and shown to every chef booked; the chef must confirm them before accepting. (G14, C05)
- Service area: a polygon per city; an address outside it shows "not in <area> yet". (G18)
- Chefs rate guests privately; "don't match me again" hides that guest from that chef. (C15)
- Chat and calls never show phone numbers; chat warns on phone numbers, UPI IDs and "pay cash". (G15)
- Marketing messages only with opt-in and never between 10 PM and 8 AM IST.

## 9. Booking IDs and documents

- Booking IDs: `SZ-` + number (e.g. `SZ-1042`); requests `REQ-`; support tickets `SR-`; invoices `INV-YYYY-NNNN`.
- After each job: the chef's service bill to the guest (issued through the platform) and Senzo's commission invoice with GST, both as PDF (G21).

## Open questions (decide before building the module)

| # | Question | Default until decided |
| --- | --- | --- |
| Q1 | Can a chef go live after ID + PAN + bank, with the police badge added later (mockup C02), or only after all checks (architecture doc)? | All checks except police; police badge added when it clears |
| Q2 | Is the 15% platform fee inclusive of GST? (C08 shows 15% flat; C18 mock totals look like 15% + 18% GST) | 15% + 18% GST on the fee, deducted from the chef's share — confirm with CA. With it, the C08 example pays the chef ₹8,888.40, not ₹9,180. Switch: `FEES.platformFeeGstBps` in `apps/api/src/config/fees.ts` |
| Q3 | Is the ₹149 convenience fee refunded on guest cancellation? | Refunded only when the guest gets a 100% refund |
| Q4 | Penalty and guest compensation when a chef cancels after accepting | 100% refund + ₹250 wallet credit; strike system |
| Q5 | Reply window for menu requests | 6 hours |
| Q6 | Is GST due on the chef's cooking service through the platform (e-commerce operator rules)? | Written CA opinion needed before launch |
| Q7 | Wallet: can credits expire? Can they be withdrawn? | No expiry for refunds-as-credit; promos expire in 90 days; never withdrawable |
| Q8 | GST on the ₹149 convenience fee: exact 18% is ₹26.82, but the mockups charge ₹27 (SZ-1042 paid ₹10,976). Round GST to the whole rupee? | Round to the whole rupee (₹27), as in the mockups — confirm with CA |
