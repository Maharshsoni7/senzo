import type { CancellationOutcome } from '../bookings/policy';

/** Debit positive, credit negative. Accounts with an owner are per chef or per guest. */
export type Line = {
  kind:
    | 'guest_cash'
    | 'chef_payable'
    | 'platform_revenue'
    | 'gateway_fee'
    | 'gst_payable'
    | 'tds_payable'
    | 'wallet_liability'
    | 'promo_expense';
  ownerId?: string;
  amountPaise: number;
};

export type BookingForLedger = {
  guestId: string;
  chefId: string;
  menuTotalPaise: number;
  convenienceFeePaise: number;
  feeGstPaise: number;
  promoPaise: number;
  walletPaise: number;
  totalPaise: number;
  platformFeePaise: number;
  platformFeeGstPaise: number;
  chefSharePaise: number;
};

export function assertBalanced(lines: Line[]) {
  for (const l of lines) {
    if (!Number.isInteger(l.amountPaise)) throw new Error(`Non-integer paise: ${l.amountPaise}`);
  }
  const sum = lines.reduce((s, l) => s + l.amountPaise, 0);
  if (sum !== 0) throw new Error(`Ledger transaction off by ${sum} paise`);
}

/** Payment captured: guest money in, chef share held as payable, platform fees and GST recognised. */
export function captureLines(b: BookingForLedger): Line[] {
  const lines: Line[] = [
    { kind: 'guest_cash', amountPaise: b.totalPaise - b.walletPaise },
    { kind: 'wallet_liability', ownerId: b.guestId, amountPaise: b.walletPaise },
    { kind: 'promo_expense', amountPaise: b.promoPaise },
    { kind: 'chef_payable', ownerId: b.chefId, amountPaise: -b.chefSharePaise },
    { kind: 'platform_revenue', amountPaise: -(b.platformFeePaise + b.convenienceFeePaise) },
    { kind: 'gst_payable', amountPaise: -(b.platformFeeGstPaise + b.feeGstPaise) },
  ];
  assertBalanced(lines);
  return lines;
}

/**
 * Full refunds reverse the capture exactly. Partial ones pay the guest and chef per the
 * outcome and leave the rest with the platform (GST treatment of partial refunds: Q6, CA).
 */
export function cancellationLines(b: BookingForLedger, o: CancellationOutcome): Line[] {
  const lines: Line[] =
    o.window === 'full'
      ? captureLines(b).map((l) => ({ ...l, amountPaise: 0 - l.amountPaise }))
      : [
          { kind: 'guest_cash', amountPaise: -o.refund.toCardPaise },
          { kind: 'wallet_liability', ownerId: b.guestId, amountPaise: -o.refund.toWalletPaise },
          {
            kind: 'chef_payable',
            ownerId: b.chefId,
            amountPaise: b.chefSharePaise - o.chefPayoutPaise,
          },
        ];

  if (o.creditPaise) {
    lines.push(
      { kind: 'promo_expense', amountPaise: o.creditPaise },
      { kind: 'wallet_liability', ownerId: b.guestId, amountPaise: -o.creditPaise },
    );
  }
  if (o.window !== 'full') {
    const plug = -lines.reduce((s, l) => s + l.amountPaise, 0);
    lines.push({ kind: 'platform_revenue', amountPaise: plug });
  }
  assertBalanced(lines);
  return lines;
}

export function tipLines(chefId: string, amountPaise: number): Line[] {
  return [
    { kind: 'guest_cash', amountPaise },
    { kind: 'chef_payable', ownerId: chefId, amountPaise: -amountPaise },
  ];
}

export function payoutLines(chefId: string, amountPaise: number): Line[] {
  return [
    { kind: 'chef_payable', ownerId: chefId, amountPaise },
    { kind: 'guest_cash', amountPaise: -amountPaise },
  ];
}
