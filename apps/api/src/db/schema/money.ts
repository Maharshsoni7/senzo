import {
  InvoiceKind,
  LedgerAccountKind,
  PaymentStatus,
  PayoutStatus,
  PromoKind,
  RefundStatus,
  TaxStatementKind,
} from '@senzo/schemas';
import { sql } from 'drizzle-orm';
import { check, index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { bool, id, oneOf, timestamps, tuple } from '../columns';
import { bookings } from './bookings';
import { chefs } from './chefs';
import { devices, users } from './identity';

export const payments = sqliteTable(
  'payments',
  {
    id: id(),
    bookingId: text('booking_id')
      .notNull()
      .references(() => bookings.id),
    razorpayOrderId: text('razorpay_order_id').notNull().unique(),
    razorpayPaymentId: text('razorpay_payment_id').unique(),
    method: text('method'),
    amountPaise: integer('amount_paise').notNull(),
    status: text('status', { enum: tuple(PaymentStatus) })
      .notNull()
      .default('created'),
    capturedAt: integer('captured_at'),
    ...timestamps,
  },
  (t) => [index('payments_booking_idx').on(t.bookingId), oneOf(t.status, PaymentStatus.options)],
);

export const transfers = sqliteTable(
  'transfers',
  {
    id: id(),
    bookingId: text('booking_id')
      .notNull()
      .references(() => bookings.id),
    razorpayTransferId: text('razorpay_transfer_id').unique(),
    chefId: text('chef_id')
      .notNull()
      .references(() => chefs.id),
    amountPaise: integer('amount_paise').notNull(),
    onHold: bool('on_hold').notNull().default(true),
    releasedAt: integer('released_at'),
    reversedAt: integer('reversed_at'),
    ...timestamps,
  },
  (t) => [index('transfers_booking_idx').on(t.bookingId)],
);

export const refunds = sqliteTable(
  'refunds',
  {
    id: id(),
    bookingId: text('booking_id')
      .notNull()
      .references(() => bookings.id),
    razorpayRefundId: text('razorpay_refund_id').unique(),
    amountPaise: integer('amount_paise').notNull(),
    reason: text('reason').notNull(),
    status: text('status', { enum: tuple(RefundStatus) })
      .notNull()
      .default('pending'),
    ...timestamps,
  },
  (t) => [index('refunds_booking_idx').on(t.bookingId), oneOf(t.status, RefundStatus.options)],
);

export const ledgerAccounts = sqliteTable(
  'ledger_accounts',
  {
    id: id(),
    kind: text('kind', { enum: tuple(LedgerAccountKind) }).notNull(),
    // '' for platform-wide accounts, so the unique index treats them as one row.
    ownerId: text('owner_id').notNull().default(''),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('ledger_accounts_kind_owner').on(t.kind, t.ownerId),
    oneOf(t.kind, LedgerAccountKind.options),
  ],
);

/** Each txn_id sums to zero; checked in the ledger service, SQLite can't express it. */
export const ledgerEntries = sqliteTable(
  'ledger_entries',
  {
    id: id(),
    txnId: text('txn_id').notNull(),
    accountId: text('account_id')
      .notNull()
      .references(() => ledgerAccounts.id),
    amountPaise: integer('amount_paise').notNull(),
    bookingId: text('booking_id').references(() => bookings.id),
    memo: text('memo'),
    at: integer('at').notNull(),
    ...timestamps,
  },
  (t) => [
    index('ledger_entries_txn_idx').on(t.txnId),
    index('ledger_entries_booking_idx').on(t.bookingId),
    index('ledger_entries_account_idx').on(t.accountId),
    check('amount_nonzero', sql`${t.amountPaise} <> 0`),
  ],
);

export const payouts = sqliteTable(
  'payouts',
  {
    id: id(),
    chefId: text('chef_id')
      .notNull()
      .references(() => chefs.id),
    amountPaise: integer('amount_paise').notNull(),
    razorpayPayoutRef: text('razorpay_payout_ref'),
    status: text('status', { enum: tuple(PayoutStatus) })
      .notNull()
      .default('queued'),
    failureReason: text('failure_reason'),
    attemptedAt: integer('attempted_at'),
    ...timestamps,
  },
  (t) => [index('payouts_chef_idx').on(t.chefId), oneOf(t.status, PayoutStatus.options)],
);

export const tips = sqliteTable(
  'tips',
  {
    id: id(),
    bookingId: text('booking_id')
      .notNull()
      .references(() => bookings.id),
    amountPaise: integer('amount_paise').notNull(),
    paymentId: text('payment_id').references(() => payments.id),
    ...timestamps,
  },
  (t) => [index('tips_booking_idx').on(t.bookingId)],
);

export const promoCodes = sqliteTable(
  'promo_codes',
  {
    code: text('code').primaryKey(),
    kind: text('kind', { enum: tuple(PromoKind) }).notNull(),
    amountPaise: integer('amount_paise'),
    percentBps: integer('percent_bps'),
    maxUses: integer('max_uses'),
    perDeviceLimit: integer('per_device_limit'),
    validFrom: integer('valid_from').notNull(),
    validTo: integer('valid_to').notNull(),
    ...timestamps,
  },
  (t) => [
    oneOf(t.kind, PromoKind.options),
    check(
      'promo_value',
      sql`(${t.kind} = 'flat' AND ${t.amountPaise} > 0) OR (${t.kind} = 'percent' AND ${t.percentBps} BETWEEN 1 AND 10000)`,
    ),
  ],
);

export const promoRedemptions = sqliteTable(
  'promo_redemptions',
  {
    id: id(),
    code: text('code')
      .notNull()
      .references(() => promoCodes.code),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    deviceId: text('device_id').references(() => devices.id),
    bookingId: text('booking_id')
      .notNull()
      .references(() => bookings.id),
    ...timestamps,
  },
  (t) => [
    index('promo_redemptions_code_idx').on(t.code),
    index('promo_redemptions_device_idx').on(t.deviceId),
  ],
);

export const invoices = sqliteTable(
  'invoices',
  {
    id: id(),
    number: text('number').notNull().unique(),
    bookingId: text('booking_id')
      .notNull()
      .references(() => bookings.id),
    kind: text('kind', { enum: tuple(InvoiceKind) }).notNull(),
    pdfKey: text('pdf_key'),
    issuedAt: integer('issued_at').notNull(),
    ...timestamps,
  },
  (t) => [index('invoices_booking_idx').on(t.bookingId), oneOf(t.kind, InvoiceKind.options)],
);

export const taxStatements = sqliteTable(
  'tax_statements',
  {
    id: id(),
    chefId: text('chef_id')
      .notNull()
      .references(() => chefs.id),
    period: text('period').notNull(),
    kind: text('kind', { enum: tuple(TaxStatementKind) }).notNull(),
    pdfKey: text('pdf_key'),
    ...timestamps,
  },
  (t) => [index('tax_statements_chef_idx').on(t.chefId), oneOf(t.kind, TaxStatementKind.options)],
);
