---
paths:
  - "apps/api/src/modules/payments/**"
  - "apps/api/src/modules/ledger/**"
  - "apps/api/src/modules/bookings/**"
  - "apps/api/src/modules/payouts/**"
  - "apps/api/src/vendors/razorpay*"
---

# Money rules — read docs/business-rules.md before changing anything here

- Amounts are **integer paise** (`number` holding an integer; use helpers in `packages/schemas/src/money.ts`). Never floats, never `toFixed` on money. Round only where business rules say, and always with the shared helper.
- The server computes every amount from the booking's **price snapshot**; ignore any amount sent by a client.
- A booking becomes `requested` only after **both**: Razorpay signature verification and the verified `payment.captured` webhook.
- Each Razorpay order carries a Route transfer to the chef's linked account with `on_hold: true`; release only from the payout Workflow (24 h after completion, no open report).
- Every money movement writes `ledger_entries` in the same `db.batch()` as the state change. Each `txn_id` must sum to zero; each booking must sum to zero when final. Add a test for every new kind of entry.
- Refunds and cancellations use the policy function in `modules/bookings/policy.ts` — one implementation shared by the cancellation quote (G16) and the actual refund.
- Platform fee 15% of `menu_total`; convenience fee ₹149 + 18% GST; tips 100% to chef — constants live in one config file, not in components or routes.
- Use `Idempotency-Key` on create-booking, cancel, tip, refund and withdraw.
- Use Razorpay **test mode** in dev and staging only; live keys exist only in production secrets.
- Never log card data, UPI IDs, bank account numbers or full Razorpay payloads with personal data.
- Any change to fees, refund windows or payout timing needs an update to `docs/business-rules.md` in the same PR.
