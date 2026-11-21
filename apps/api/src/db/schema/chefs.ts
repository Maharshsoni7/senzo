import {
  AvailabilityState,
  ChefFoodRule,
  ChefStatus,
  CuisineLevel,
  HelperStatus,
  KycKind,
  KycStatus,
  PennyDropStatus,
  ProofKind,
  ProofStatus,
  Slot,
} from '@senzo/schemas';
import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';
import { bool, id, json, oneOf, timestamps, tuple } from '../columns';
import { users } from './identity';

export const chefs = sqliteTable(
  'chefs',
  {
    id: id(),
    userId: text('user_id')
      .notNull()
      .unique()
      .references(() => users.id),
    slug: text('slug').notNull().unique(),
    displayName: text('display_name').notNull(),
    headline: text('headline'),
    bio: text('bio'),
    yearsCooking: integer('years_cooking'),
    baseLat: real('base_lat'),
    baseLng: real('base_lng'),
    serviceRadiusKm: integer('service_radius_km'),
    maxGuests: integer('max_guests'),
    hasHelper: bool('has_helper').notNull().default(false),
    status: text('status', { enum: tuple(ChefStatus) })
      .notNull()
      .default('draft'),
    pausedUntil: integer('paused_until'),
    ratingAvg: real('rating_avg'),
    ratingCount: integer('rating_count').notNull().default(0),
    jobsDone: integer('jobs_done').notNull().default(0),
    acceptRate: real('accept_rate'),
    replyMinutesP50: integer('reply_minutes_p50'),
    strikes: integer('strikes').notNull().default(0),
    ...timestamps,
  },
  (t) => [index('chefs_status_idx').on(t.status), oneOf(t.status, ChefStatus.options)],
);

export const chefCuisines = sqliteTable(
  'chef_cuisines',
  {
    chefId: text('chef_id')
      .notNull()
      .references(() => chefs.id),
    cuisine: text('cuisine').notNull(),
    level: text('level', { enum: tuple(CuisineLevel) }).notNull(),
    ...timestamps,
  },
  (t) => [primaryKey({ columns: [t.chefId, t.cuisine] }), oneOf(t.level, CuisineLevel.options)],
);

export const chefFoodRules = sqliteTable(
  'chef_food_rules',
  {
    chefId: text('chef_id')
      .notNull()
      .references(() => chefs.id),
    rule: text('rule', { enum: tuple(ChefFoodRule) }).notNull(),
    ...timestamps,
  },
  (t) => [primaryKey({ columns: [t.chefId, t.rule] }), oneOf(t.rule, ChefFoodRule.options)],
);

export const chefOccasions = sqliteTable(
  'chef_occasions',
  {
    chefId: text('chef_id')
      .notNull()
      .references(() => chefs.id),
    occasion: text('occasion').notNull(),
    ...timestamps,
  },
  (t) => [primaryKey({ columns: [t.chefId, t.occasion] })],
);

export const chefProofs = sqliteTable(
  'chef_proofs',
  {
    id: id(),
    chefId: text('chef_id')
      .notNull()
      .references(() => chefs.id),
    kind: text('kind', { enum: tuple(ProofKind) }).notNull(),
    title: text('title').notNull(),
    detail: text('detail'),
    fileKey: text('file_key'),
    status: text('status', { enum: tuple(ProofStatus) })
      .notNull()
      .default('need'),
    reviewedBy: text('reviewed_by'),
    ...timestamps,
  },
  (t) => [
    index('chef_proofs_chef_idx').on(t.chefId),
    oneOf(t.kind, ProofKind.options),
    oneOf(t.status, ProofStatus.options),
  ],
);

export const helpers = sqliteTable(
  'helpers',
  {
    id: id(),
    chefId: text('chef_id')
      .notNull()
      .references(() => chefs.id),
    name: text('name').notNull(),
    phoneE164: text('phone_e164').notNull(),
    status: text('status', { enum: tuple(HelperStatus) })
      .notNull()
      .default('pending'),
    ...timestamps,
  },
  (t) => [index('helpers_chef_idx').on(t.chefId), oneOf(t.status, HelperStatus.options)],
);

export const kycChecks = sqliteTable(
  'kyc_checks',
  {
    id: id(),
    chefId: text('chef_id').references(() => chefs.id),
    helperId: text('helper_id').references(() => helpers.id),
    kind: text('kind', { enum: tuple(KycKind) }).notNull(),
    provider: text('provider').notNull(),
    providerRef: text('provider_ref'),
    status: text('status', { enum: tuple(KycStatus) })
      .notNull()
      .default('pending'),
    aadhaarLast4: text('aadhaar_last4'),
    expiresAt: integer('expires_at'),
    ...timestamps,
  },
  (t) => [
    index('kyc_checks_chef_idx').on(t.chefId),
    oneOf(t.kind, KycKind.options),
    oneOf(t.status, KycStatus.options),
    check('kyc_checks_subject', sql`(${t.chefId} IS NULL) <> (${t.helperId} IS NULL)`),
    check('aadhaar_last4_len', sql`${t.aadhaarLast4} IS NULL OR length(${t.aadhaarLast4}) = 4`),
  ],
);

export const bankAccounts = sqliteTable(
  'bank_accounts',
  {
    id: id(),
    chefId: text('chef_id')
      .notNull()
      .references(() => chefs.id),
    holderName: text('holder_name').notNull(),
    ifsc: text('ifsc').notNull(),
    accountLast4: text('account_last4').notNull(),
    accountEnc: text('account_enc').notNull(),
    razorpayLinkedAccountId: text('razorpay_linked_account_id'),
    pennyDropStatus: text('penny_drop_status', { enum: tuple(PennyDropStatus) })
      .notNull()
      .default('pending'),
    payoutsPausedUntil: integer('payouts_paused_until'),
    ...timestamps,
  },
  (t) => [
    index('bank_accounts_chef_idx').on(t.chefId),
    oneOf(t.pennyDropStatus, PennyDropStatus.options),
  ],
);

export const availability = sqliteTable(
  'availability',
  {
    chefId: text('chef_id')
      .notNull()
      .references(() => chefs.id),
    date: text('date').notNull(),
    slot: text('slot', { enum: tuple(Slot) }).notNull(),
    state: text('state', { enum: tuple(AvailabilityState) }).notNull(),
    ...timestamps,
  },
  (t) => [
    primaryKey({ columns: [t.chefId, t.date, t.slot] }),
    oneOf(t.slot, Slot.options),
    oneOf(t.state, AvailabilityState.options),
  ],
);

export const cookingDays = sqliteTable(
  'cooking_days',
  {
    chefId: text('chef_id')
      .notNull()
      .references(() => chefs.id),
    weekday: integer('weekday').notNull(),
    slots: json<Slot[]>('slots').notNull(),
    ...timestamps,
  },
  (t) => [
    primaryKey({ columns: [t.chefId, t.weekday] }),
    check('weekday_range', sql`${t.weekday} BETWEEN 0 AND 6`),
  ],
);
