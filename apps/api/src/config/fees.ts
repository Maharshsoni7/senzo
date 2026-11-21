// Every fee, rate and rounding rule from docs/business-rules.md §1–2. Change only with that doc.

export const FEES = {
  convenienceFeePaise: 14_900,
  /** 18% GST on the convenience fee. */
  convenienceFeeGstBps: 1800,
  /** Q8 default: GST on the convenience fee rounds to the whole rupee (₹27, as in the mockups). */
  roundConvenienceGstToRupee: true,

  /** 15% of menu_total; never of tips or the convenience fee. */
  platformFeeBps: 1500,
  /** Q2 default: 18% GST on the platform fee, deducted from the chef's share. 0 = GST-inclusive. */
  platformFeeGstBps: 1800,

  /** One-off, added to menu_total when the guest has no gas or induction. */
  inductionPaise: 20_000,
} as const;
