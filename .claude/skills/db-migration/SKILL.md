---
name: db-migration
description: Change the Senzo D1 database schema safely with Drizzle and Wrangler (expand → migrate → contract). Use for any new table, column, index or data back-fill.
argument-hint: "[what to change]"
---

# Database change: $ARGUMENTS

1. Read `docs/data-model.md` (conventions: ULID ids, paise integers, UTC epoch ms, enums as CHECKed TEXT, `*_enc` for encrypted fields).
2. Plan as **expand → migrate → contract**:
   - Expand: add new tables/columns/indexes; new columns nullable or with defaults. No drops or renames.
   - Migrate: code writes both old and new; back-fill in a Queue job in batches (D1: ≤ 50 queries per request on free plan; one query at a time per database).
   - Contract: remove the old column in a **later** release, after every app version that used it is gone.
3. Edit the Drizzle schema in `apps/api/src/db/schema/`, then `pnpm --filter api db:generate`. Read the generated SQL and fix anything SQLite can't do in place (rebuild-table patterns must keep data).
4. Apply locally: `pnpm --filter api db:migrate:local`; run the integration tests.
5. Update `docs/data-model.md` and the zod schemas in the same PR.
6. Never edit a migration that has run on staging or production; add a new one.
7. Note in the PR how to roll back (D1 Time Travel restore point taken before applying to production).
