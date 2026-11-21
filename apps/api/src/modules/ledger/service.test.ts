import { env } from 'cloudflare:workers';
import type { BatchItem } from 'drizzle-orm/batch';
import { describe, expect, it } from 'vitest';
import { createDb } from '../../db';
import { captureLines } from './entries';
import { accountBalance, ledgerTxn } from './service';

const db = createDb(env.DB);
const run = (statements: unknown[]) =>
  db.batch(statements as [BatchItem<'sqlite'>, ...BatchItem<'sqlite'>[]]);

const lines = captureLines({
  guestId: 'g1',
  chefId: 'c1',
  menuTotalPaise: 1_080_000,
  convenienceFeePaise: 14_900,
  feeGstPaise: 2_700,
  promoPaise: 0,
  walletPaise: 0,
  totalPaise: 1_097_600,
  platformFeePaise: 162_000,
  platformFeeGstPaise: 29_160,
  chefSharePaise: 888_840,
});

describe('ledgerTxn', () => {
  it('drops zero lines, creates accounts on first use and reuses them after', async () => {
    const first = await ledgerTxn(db, { lines, memo: 'capture', at: Date.now() });
    expect(first.statements).toHaveLength(4);
    await run(first.statements);
    expect(await accountBalance(db, 'chef_payable', 'c1')).toBe(-888_840);
    expect(await accountBalance(db, 'guest_cash')).toBe(1_097_600);

    await run((await ledgerTxn(db, { lines, memo: 'capture', at: Date.now() })).statements);
    expect(await accountBalance(db, 'chef_payable', 'c1')).toBe(-1_777_680);
  });

  it('refuses an unbalanced transaction before touching the database', async () => {
    await expect(
      ledgerTxn(db, { lines: [{ kind: 'guest_cash', amountPaise: 5 }], memo: 'bad', at: 0 }),
    ).rejects.toThrow(/off by 5/);
  });
});
