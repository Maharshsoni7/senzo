import { percentOf, type Slot } from '@senzo/schemas';
import { POLICY } from '../../config/policy';
import { AppError } from '../../lib/errors';
import { slotStartsAt } from '../../lib/time';

export type CancelReason = 'guest' | 'chef_declined' | 'chef_cancelled';

/** `totalPaise` is what the guest owes after promo; `walletPaise` is the part paid from the wallet. */
export type BookingMoney = {
  date: string;
  slot: Slot;
  menuTotalPaise: number;
  convenienceFeePaise: number;
  feeGstPaise: number;
  promoPaise: number;
  walletPaise: number;
  totalPaise: number;
  chefSharePaise: number;
};

export type CancellationOutcome = {
  window: 'full' | 'half' | 'none';
  refund: { totalPaise: number; toCardPaise: number; toWalletPaise: number };
  /** Goodwill wallet credit on top of the refund. */
  creditPaise: number;
  chefPayoutPaise: number;
};

/**
 * The one cancellation rule set: G16's "you'll get back" quote and the real refund both call this.
 * Promo money is never refunded as cash; refunds split between card and wallet in the ratio paid.
 */
export function cancellationOutcome(
  b: BookingMoney,
  reason: CancelReason,
  now: number,
): CancellationOutcome {
  const lead = slotStartsAt(b.date, b.slot) - now;
  if (lead <= 0) {
    throw new AppError('POLICY_WINDOW_CLOSED', 409, 'The booking has already started');
  }

  let window: CancellationOutcome['window'];
  let chefPayoutPaise = 0;
  if (reason !== 'guest' || lead > POLICY.fullRefundBeforeMs) {
    window = 'full';
  } else if (lead >= POLICY.halfRefundBeforeMs) {
    window = 'half';
    chefPayoutPaise = percentOf(b.chefSharePaise, POLICY.halfRefundBps);
  } else {
    window = 'none';
    chefPayoutPaise = b.chefSharePaise;
  }

  const paidForMenu = Math.max(b.menuTotalPaise - b.promoPaise, 0);
  const menuRefund =
    window === 'full'
      ? paidForMenu
      : window === 'half'
        ? percentOf(paidForMenu, POLICY.halfRefundBps)
        : 0;
  // Q3 default: the convenience fee comes back only with a full refund.
  const feeRefund = window === 'full' ? b.convenienceFeePaise + b.feeGstPaise : 0;

  const totalPaise = Math.min(menuRefund + feeRefund, b.totalPaise);
  const toWalletPaise =
    b.totalPaise === 0 ? 0 : Math.round((totalPaise * b.walletPaise) / b.totalPaise);

  return {
    window,
    refund: { totalPaise, toCardPaise: totalPaise - toWalletPaise, toWalletPaise },
    creditPaise: reason === 'chef_cancelled' ? POLICY.chefCancelCreditPaise : 0,
    chefPayoutPaise,
  };
}

export function canReschedule(
  b: Pick<BookingMoney, 'date' | 'slot'> & { rescheduledFrom: string | null },
  now: number,
) {
  return (
    b.rescheduledFrom === null && slotStartsAt(b.date, b.slot) - now >= POLICY.rescheduleBeforeMs
  );
}
