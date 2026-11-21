// Cancellation and change rules from docs/business-rules.md §4. Change only with that doc.

export const POLICY = {
  /** Guest cancels more than this long before the slot → full refund. */
  fullRefundBeforeMs: 48 * 3_600_000,
  /** Between this and fullRefundBeforeMs → half refund; closer → none. */
  halfRefundBeforeMs: 24 * 3_600_000,
  halfRefundBps: 5000,
  /** Q4 default: guest credit when the chef cancels after accepting. */
  chefCancelCreditPaise: 25_000,
  /** Free reschedule, once, up to this long before the slot. */
  rescheduleBeforeMs: 48 * 3_600_000,
} as const;

/** Checkout soft lock on a chef's slot while the guest pays (§3). */
export const CHECKOUT_LOCK_MS = 10 * 60_000;
