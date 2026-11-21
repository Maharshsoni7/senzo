---
name: release
description: Prepare a Senzo release — API deploy to staging/production with Wrangler and mobile builds with EAS. Only run when the user asks.
argument-hint: "[api|guest|chef|web|admin] [staging|production]"
disable-model-invocation: true
---

# Release $ARGUMENTS

Stop and ask before any production step. Never print secrets.

1. Check `main` is green: `pnpm typecheck && pnpm lint && pnpm test`.
2. **API / web / admin (Wrangler):**
   - Staging: apply D1 migrations (`wrangler d1 migrations apply senzo-staging --remote`), then `wrangler deploy --env staging`; run smoke tests.
   - Production: take note of the D1 Time Travel restore point, apply migrations, deploy a new Worker version and roll out gradually (10% → 50% → 100%); watch Sentry and error-rate alerts at each step; rollback = previous version.
3. **Mobile (EAS):**
   - JavaScript-only change → `eas update --channel <staging|production>` for the app.
   - Native change or new native module → `eas build --profile <staging|production>` then `eas submit`.
   - Bump version/build numbers; update release notes; confirm the Play Data safety form and iOS privacy manifest still match.
4. Write a short release note: what changed, migrations run, flags turned on, rollback steps.
