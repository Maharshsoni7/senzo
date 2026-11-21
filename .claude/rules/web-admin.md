---
paths:
  - "apps/web/**"
  - "apps/admin/**"
---

# Web and admin rules (Next.js via Vinext on Cloudflare Workers)

- App Router; server components by default; call the API through `packages/api-client` — the web apps never touch D1 directly.
- Public site: chef pages (`/chef/[slug]`) and city pages are server-rendered with schema.org markup for Google. Booking on web uses Razorpay web checkout with the same API flow as the apps.
- Chef signup (`/join`) uploads straight to R2 with presigned URLs, then points chefs to the Senzo Partner app.
- Serve `/.well-known/assetlinks.json` and `apple-app-site-association` so shared links open the apps.
- Admin: shadcn/ui + TanStack Table; reachable only behind Cloudflare Access; check the role on every action (Support, Operations, Finance, Admin). Phone numbers masked by default; revealing writes an audit log entry. Every mutating action writes `audit_logs`.
- If a Next.js feature misbehaves on Vinext, switch that app to the OpenNext adapter rather than working around it.
- No maps on any page.
