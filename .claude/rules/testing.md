---
paths:
  - "**/*.test.ts"
  - "**/*.test.tsx"
  - "**/e2e/**"
  - "**/.maestro/**"
---

# Testing rules

- Unit/business rules: Vitest. Cover price bands, option extras, add-ons, grocery saving, Jain auto-swap, chef minimum, cancellation windows (exact boundaries at 24 h and 48 h), no-show fee, payout timing, ledger sums to zero.
- API integration: Vitest with `@cloudflare/vitest-pool-workers` (Miniflare: local D1, Durable Objects, Queues). Test the full booking flow, the double-booking unique index, and webhook replays processed once.
- Use fixed clocks (`vi.setSystemTime`) for every time rule; times in UTC, assertions in IST where the rule is in IST.
- Use the seed data from `apps/api/seed/` (chefs, menus, bookings from the design: Ananya Mehta, Rahul Desai, SZ-1042…) instead of inventing new fixtures.
- Payments: Razorpay test mode and recorded webhook payloads only; never hit live keys.
- App components: React Native Testing Library. End-to-end: Maestro flows for guest (login → book → pay → OTPs → rate) and chef (accept → on my way → OTPs → payout); Playwright for web.
- A bug fix starts with a failing test that reproduces it.
