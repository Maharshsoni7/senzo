import { describe, expect, it } from 'vitest';
import { HOUR, slotStartsAt } from '../../lib/time';
import { cancellationOutcome } from '../bookings/policy';
import {
  assertBalanced,
  cancellationLines,
  captureLines,
  type BookingForLedger,
  type Line,
} from './entries';

const when = { date: '2026-12-05', slot: 'dinner' as const };
const sz1042: BookingForLedger = {
  guestId: 'usr_rahul',
  chefId: 'chef_ananya',
  menuTotalPaise: 1_080_000,
  convenienceFeePaise: 14_900,
  feeGstPaise: 2_700,
  promoPaise: 0,
  walletPaise: 0,
  totalPaise: 1_097_600,
  platformFeePaise: 162_000,
  platformFeeGstPaise: 29_160,
  chefSharePaise: 888_840,
};
const hoursBefore = (h: number) => slotStartsAt(when.date, when.slot) - h * HOUR;
const net = (lines: Line[], kind: Line['kind']) =>
  lines.filter((l) => l.kind === kind).reduce((s, l) => s + l.amountPaise, 0);
const outcome = (b: BookingForLedger, h: number, reason: 'guest' | 'chef_cancelled' = 'guest') =>
  cancellationOutcome({ ...b, ...when }, reason, hoursBefore(h));

const variants: [string, BookingForLedger][] = [
  ['plain', sz1042],
  ['promo', { ...sz1042, promoPaise: 50_000, totalPaise: 1_047_600 }],
  ['wallet', { ...sz1042, walletPaise: 97_600 }],
  ['promo + wallet', { ...sz1042, promoPaise: 50_000, totalPaise: 1_047_600, walletPaise: 7_601 }],
];

describe('ledger lines', () => {
  it.each(variants)('capture balances (%s)', (_, b) => {
    const lines = captureLines(b);
    expect(net(lines, 'chef_payable')).toBe(-888_840);
    expect(net(lines, 'gst_payable')).toBe(-31_860);
  });

  it.each(variants.flatMap(([name, b]) => [72, 30, 5].map((h) => [name, h, b] as const)))(
    'guest cancellation balances (%s, %i h before)',
    (_, h, b) => {
      const out = outcome(b, h);
      const all = [...captureLines(b), ...cancellationLines(b, out)];
      expect(() => assertBalanced(all)).not.toThrow();
      expect(0 - net(all, 'chef_payable')).toBe(out.chefPayoutPaise);
      expect(net(all, 'guest_cash')).toBe(b.totalPaise - b.walletPaise - out.refund.toCardPaise);
    },
  );

  it('leaves every account at zero after a full refund', () => {
    const all = [...captureLines(sz1042), ...cancellationLines(sz1042, outcome(sz1042, 72))];
    for (const kind of new Set(all.map((l) => l.kind))) expect(net(all, kind)).toBe(0);
  });

  it('keeps the platform cut on a half refund', () => {
    const all = [...captureLines(sz1042), ...cancellationLines(sz1042, outcome(sz1042, 30))];
    // Retained 557,600 − chef 444,420 − GST 31,860.
    expect(0 - net(all, 'platform_revenue')).toBe(81_320);
  });

  it('books the chef-cancel credit as an expense owed to the guest wallet', () => {
    const out = outcome(sz1042, 5, 'chef_cancelled');
    const all = [...captureLines(sz1042), ...cancellationLines(sz1042, out)];
    expect(net(all, 'wallet_liability')).toBe(-25_000);
    expect(net(all, 'promo_expense')).toBe(25_000);
  });

  it('refuses unbalanced or fractional lines', () => {
    expect(() => assertBalanced([{ kind: 'guest_cash', amountPaise: 1 }])).toThrow(/off by 1/);
    expect(() => assertBalanced([{ kind: 'guest_cash', amountPaise: 0.5 }])).toThrow(/Non-integer/);
  });
});
