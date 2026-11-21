import { and, eq, inArray } from 'drizzle-orm';
import { ulid } from 'ulidx';
import type { Db } from '../../db';
import { ledgerAccounts, ledgerEntries } from '../../db/schema';
import { assertBalanced, type Line } from './entries';

const accountKey = (kind: string, ownerId = '') => `${kind}:${ownerId}`;

async function resolveAccounts(db: Db, lines: Line[]) {
  const kinds = [...new Set(lines.map((l) => l.kind))];
  const owners = [...new Set(lines.map((l) => l.ownerId ?? ''))];
  const find = () =>
    db
      .select({ id: ledgerAccounts.id, kind: ledgerAccounts.kind, ownerId: ledgerAccounts.ownerId })
      .from(ledgerAccounts)
      .where(and(inArray(ledgerAccounts.kind, kinds), inArray(ledgerAccounts.ownerId, owners)));

  const ids = new Map((await find()).map((a) => [accountKey(a.kind, a.ownerId), a.id]));
  const missing = lines.filter((l) => !ids.has(accountKey(l.kind, l.ownerId)));
  if (missing.length > 0) {
    for (const l of missing) {
      await db
        .insert(ledgerAccounts)
        .values({ kind: l.kind, ownerId: l.ownerId ?? '' })
        .onConflictDoNothing();
    }
    for (const a of await find()) ids.set(accountKey(a.kind, a.ownerId), a.id);
  }
  return ids;
}

/**
 * Returns insert statements to put in the same db.batch() as the state change they record.
 * Throws if the lines don't sum to zero.
 */
export async function ledgerTxn(
  db: Db,
  args: { lines: Line[]; bookingId?: string; memo: string; at: number },
) {
  const lines = args.lines.filter((l) => l.amountPaise !== 0);
  assertBalanced(lines);
  const ids = await resolveAccounts(db, lines);
  const txnId = ulid();

  return {
    txnId,
    statements: lines.map((l) =>
      db.insert(ledgerEntries).values({
        txnId,
        accountId: ids.get(accountKey(l.kind, l.ownerId))!,
        amountPaise: l.amountPaise,
        bookingId: args.bookingId,
        memo: args.memo,
        at: args.at,
      }),
    ),
  };
}

export async function accountBalance(db: Db, kind: Line['kind'], ownerId = '') {
  const rows = await db
    .select({ amountPaise: ledgerEntries.amountPaise })
    .from(ledgerEntries)
    .innerJoin(ledgerAccounts, eq(ledgerAccounts.id, ledgerEntries.accountId))
    .where(and(eq(ledgerAccounts.kind, kind), eq(ledgerAccounts.ownerId, ownerId)));
  return rows.reduce((s, r) => s + r.amountPaise, 0);
}
