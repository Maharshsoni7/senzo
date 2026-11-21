# Senzo — starter pack for Claude Code

Copy these files into the root of the new `senzo` monorepo, commit them, then open the repo in Claude Code. Claude Code reads `CLAUDE.md` at the start of every session and loads the rules in `.claude/rules/` when it works on matching files.

## What's here

| Path | Purpose |
| --- | --- |
| `CLAUDE.md` | Project instructions Claude Code reads every session: stack, layout, commands, hard rules |
| `.claude/rules/` | Rules that load only for matching files: `api.md`, `payments.md`, `mobile.md`, `web-admin.md`, `testing.md` |
| `.claude/skills/` | Repeatable commands: `/new-screen G09`, `/new-endpoint POST /v1/bookings`, `/db-migration …`, `/release api staging` |
| `.claude/settings.json` | Blocks Claude from reading or editing `.env` / `.dev.vars` files |
| `.mcp.json` | Tool connections: Expo, Cloudflare, Cloudflare docs |
| `docs/prd.md` | Product spec: goals, scope, user stories with checks |
| `docs/business-rules.md` | Every price, fee, time limit and policy — plus 7 open questions |
| `docs/booking-states.md` | Booking state machine, transitions, timers, invariants |
| `docs/data-model.md` | D1 tables and conventions |
| `docs/api.md` | All API routes, webhooks, admin, events |
| `docs/screens.md` | Screen → route → API map, known mockup gaps |
| `docs/decisions.md` | Decisions not to reverse (no maps, no WhatsApp, Razorpay only, D1…) |
| `design/` | Tokens, logo files, mockup sources |

## First steps

1. Create the repo and scaffold the monorepo (pnpm + Turborepo) with the layout in `CLAUDE.md`; then update the **Commands** section of `CLAUDE.md` to the real scripts.
2. In Claude Code, run `/mcp` and sign in to **Expo** (needs a paid EAS plan) and **Cloudflare**.
3. Optional: add the **Razorpay MCP server** (`https://mcp.razorpay.com/mcp`) with **test-mode keys only** — see https://razorpay.com/docs/mcp-server/ for setup. Never connect live keys to an AI tool.
4. Decide the open questions at the end of `docs/business-rules.md` (Q1–Q7); confirm GST/TDS with a CA.
5. Suggested first tasks for Claude Code:
   - "Scaffold the monorepo from CLAUDE.md, with an empty Hono API, both Expo apps and shared packages."
   - "Create the Drizzle schema from docs/data-model.md and the first migration."
   - "Build the booking state machine from docs/booking-states.md with tests for every transition."
   - "/new-endpoint POST /v1/quotes" then "/new-screen G22".

## Still to write before launch

Admin panel design · notification templates (MSG91 DLT registration) · security & privacy notice (DPDP) · environments & secrets list · test plan · sprint roadmap · Terms, Privacy Policy, chef agreement, refund policy · store listing text.
