import { describe, expect, it } from 'vitest';
import { HOUR, slotStartsAt } from '../../lib/time';
import { canReschedule, cancellationOutcome, type BookingMoney } from './policy';

// SZ-1042: 6 × ₹1,800, Q2 split.
const sz1042: BookingMoney = {
  date: '2026-12-05',
  slot: 'dinner',
  menuTotalPaise: 1_080_000,
  convenienceFeePaise: 14_900,
  feeGstPaise: 2_700,
  promoPaise: 0,
  walletPaise: 0,
  totalPaise: 1_097_600,
  chefSharePaise: 888_840,
};
const start = slotStartsAt(sz1042.date, sz1042.slot);
const hoursBefore = (h: number) => start - h * HOUR;

describe('cancellationOutcome — guest cancels', () => {
  it('refunds everything more than 48 h before', () => {
    expect(cancellationOutcome(sz1042, 'guest', hoursBefore(48) - 1)).toEqual({
      window: 'full',
      refund: { totalPaise: 1_097_600, toCardPaise: 1_097_600, toWalletPaise: 0 },
      creditPaise: 0,
      chefPayoutPaise: 0,
    });
  });

  it('refunds half the menu, not the fee, at exactly 48 h', () => {
    const out = cancellationOutcome(sz1042, 'guest', hoursBefore(48));
    expect(out.window).toBe('half');
    expect(out.refund.totalPaise).toBe(540_000);
    expect(out.chefPayoutPaise).toBe(444_420);
  });

  it('still refunds half at exactly 24 h', () => {
    expect(cancellationOutcome(sz1042, 'guest', hoursBefore(24)).window).toBe('half');
  });

  it('refunds nothing under 24 h and pays the chef their full share', () => {
    const out = cancellationOutcome(sz1042, 'guest', hoursBefore(24) + 1);
    expect(out.window).toBe('none');
    expect(out.refund.totalPaise).toBe(0);
    expect(out.chefPayoutPaise).toBe(888_840);
  });

  it('closes once the slot has started', () => {
    expect(() => cancellationOutcome(sz1042, 'guest', start)).toThrow(
      expect.objectContaining({ code: 'POLICY_WINDOW_CLOSED' }),
    );
  });
});

describe('cancellationOutcome — money sources', () => {
  it('never refunds promo money as cash', () => {
    const withPromo = { ...sz1042, promoPaise: 50_000, totalPaise: 1_047_600 };
    expect(cancellationOutcome(withPromo, 'guest', hoursBefore(72)).refund.totalPaise).toBe(
      1_047_600,
    );
    expect(cancellationOutcome(withPromo, 'guest', hoursBefore(30)).refund.totalPaise).toBe(
      515_000,
    );
  });

  it('returns wallet money to the wallet in the ratio it was paid', () => {
    const withWallet = { ...sz1042, walletPaise: 97_600 };
    expect(cancellationOutcome(withWallet, 'guest', hoursBefore(72)).refund).toEqual({
      totalPaise: 1_097_600,
      toCardPaise: 1_000_000,
      toWalletPaise: 97_600,
    });
    const half = cancellationOutcome(withWallet, 'guest', hoursBefore(30)).refund;
    expect(half.toCardPaise + half.toWalletPaise).toBe(540_000);
    expect(half.toWalletPaise).toBe(48_017);
  });
});

describe('cancellationOutcome — chef side', () => {
  it('refunds in full, fee included, when the chef declines — even late', () => {
    const out = cancellationOutcome(sz1042, 'chef_declined', hoursBefore(2));
    expect(out).toMatchObject({ window: 'full', creditPaise: 0, chefPayoutPaise: 0 });
    expect(out.refund.totalPaise).toBe(1_097_600);
  });

  it('adds ₹250 wallet credit when the chef cancels after accepting (Q4 default)', () => {
    const out = cancellationOutcome(sz1042, 'chef_cancelled', hoursBefore(5));
    expect(out).toMatchObject({ window: 'full', creditPaise: 25_000, chefPayoutPaise: 0 });
  });
});

describe('canReschedule', () => {
  it('allows one free reschedule up to 48 h before', () => {
    expect(canReschedule({ ...sz1042, rescheduledFrom: null }, hoursBefore(48))).toBe(true);
    expect(canReschedule({ ...sz1042, rescheduledFrom: null }, hoursBefore(48) + 1)).toBe(false);
    expect(canReschedule({ ...sz1042, rescheduledFrom: 'bk_old' }, hoursBefore(96))).toBe(false);
  });
});
