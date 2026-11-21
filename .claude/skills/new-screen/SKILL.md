---
name: new-screen
description: Build a Senzo mobile screen from the mockup by its screen ID (G01–G24 guest, C01–C22 chef). Use when asked to build, implement or redo a screen.
argument-hint: "[screen-id e.g. G09]"
---

# Build screen $ARGUMENTS

1. Look up `$ARGUMENTS` in `docs/screens.md`: app (`apps/guest` or `apps/chef`), route file, API calls, module, and any row for it under "Known gaps".
2. Read the mockup source `design/mockups/m/$ARGUMENTS-*.dc.html` (web pages: `design/mockups/Main.dc.html`, `ChefSignup.dc.html`). Take layout, copy, states and interactions from the markup and the `renderVals()` logic. It's design-canvas source, not React Native — rebuild it with our components; don't copy HTML.
3. Read the user story for the screen in `docs/prd.md` and every rule it touches in `docs/business-rules.md`.
4. Check the API exists in `packages/api-client`. If it doesn't, stop and build it first with `/new-endpoint` (or ask).
5. Build:
   - Route file under `app/` as listed; logic in a hook (`use<Thing>.ts`) using TanStack Query; local choices in the Zustand store if they cross screens.
   - Components from `packages/ui`; tokens from the theme; strings through i18next (add `en` keys, and `gu`/`hi` placeholders marked TODO).
   - States: loading skeleton, empty, error with retry, offline banner (chef job screens must work from cache).
   - Prices only from the server (`POST /quotes` or the booking).
   - Apply the "Known gaps" fix instead of the mockup where listed (e.g. no maps).
6. Tests: React Native Testing Library for the main interactions; extend the Maestro flow if the screen is on the main path.
7. Run `pnpm typecheck && pnpm lint && pnpm test --filter <app>` and report what's left (missing API, copy, assets).
