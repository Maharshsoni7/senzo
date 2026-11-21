import {
  Actor,
  BookingState,
  BookingSubStatus,
  FoodRule,
  GroceriesBy,
  JobCheckKind,
  JobOtpKind,
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
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
import { bool, id, json, oneOf, timestamps, tuple } from '../columns';
import { chefs } from './chefs';
import { proposals } from './discovery';
import { addresses } from './guests';
import { users } from './identity';
import { setMenus } from './menus';

export const bookings = sqliteTable(
  'bookings',
  {
    id: id(),
    code: text('code').notNull().unique(),
    guestId: text('guest_id')
      .notNull()
      .references(() => users.id),
    chefId: text('chef_id')
      .notNull()
      .references(() => chefs.id),
    menuId: text('menu_id').references(() => setMenus.id),
    proposalId: text('proposal_id').references(() => proposals.id),
    addressId: text('address_id')
      .notNull()
      .references(() => addresses.id),
    /** IST calendar date, YYYY-MM-DD. */
    date: text('date').notNull(),
    slot: text('slot', { enum: tuple(Slot) }).notNull(),
    guests: integer('guests').notNull(),
    foodRule: text('food_rule', { enum: tuple(FoodRule) }).notNull(),
    groceriesBy: text('groceries_by', { enum: tuple(GroceriesBy) }).notNull(),
    state: text('state', { enum: tuple(BookingState) }).notNull(),
    subStatus: text('sub_status', { enum: tuple(BookingSubStatus) }),
    etaMinutes: integer('eta_minutes'),
    priceSnapshot: json<unknown>('price_snapshot').notNull(),
    menuTotalPaise: integer('menu_total_paise').notNull(),
    convenienceFeePaise: integer('convenience_fee_paise').notNull(),
    feeGstPaise: integer('fee_gst_paise').notNull(),
    promoCode: text('promo_code'),
    promoPaise: integer('promo_paise').notNull().default(0),
    walletPaise: integer('wallet_paise').notNull().default(0),
    totalPaise: integer('total_paise').notNull(),
    platformFeePaise: integer('platform_fee_paise').notNull(),
    chefSharePaise: integer('chef_share_paise').notNull(),
    allergiesAckAt: integer('allergies_ack_at'),
    acceptedAt: integer('accepted_at'),
    startedAt: integer('started_at'),
    doneAt: integer('done_at'),
    completedAt: integer('completed_at'),
    paidOutAt: integer('paid_out_at'),
    cancelledBy: text('cancelled_by', { enum: tuple(Actor) }),
    cancelReason: text('cancel_reason'),
    rescheduledFrom: text('rescheduled_from'),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('one_booking_per_slot')
      .on(t.chefId, t.date, t.slot)
      .where(sql`state IN ('requested', 'confirmed', 'in_progress')`),
    index('bookings_guest_idx').on(t.guestId),
    index('bookings_chef_date_idx').on(t.chefId, t.date),
    oneOf(t.slot, Slot.options),
    oneOf(t.foodRule, FoodRule.options),
    oneOf(t.groceriesBy, GroceriesBy.options),
    oneOf(t.state, BookingState.options),
    oneOf(t.subStatus, BookingSubStatus.options),
    oneOf(t.cancelledBy, Actor.options),
    check('guests_positive', sql`${t.guests} > 0`),
  ],
);

export const bookingItems = sqliteTable(
  'booking_items',
  {
    id: id(),
    bookingId: text('booking_id')
      .notNull()
      .references(() => bookings.id),
    course: text('course'),
    dishName: text('dish_name').notNull(),
    extraPaise: integer('extra_paise').notNull().default(0),
    isAddon: bool('is_addon').notNull().default(false),
    perGuest: bool('per_guest').notNull().default(true),
    ...timestamps,
  },
  (t) => [index('booking_items_booking_idx').on(t.bookingId)],
);

/** Append-only. */
export const bookingEvents = sqliteTable(
  'booking_events',
  {
    id: id(),
    bookingId: text('booking_id')
      .notNull()
      .references(() => bookings.id),
    fromState: text('from_state', { enum: tuple(BookingState) }),
    toState: text('to_state', { enum: tuple(BookingState) }).notNull(),
    actor: text('actor', { enum: tuple(Actor) }).notNull(),
    actorId: text('actor_id'),
    reason: text('reason'),
    at: integer('at').notNull(),
    ...timestamps,
  },
  (t) => [
    index('booking_events_booking_idx').on(t.bookingId),
    oneOf(t.fromState, BookingState.options),
    oneOf(t.toState, BookingState.options),
    oneOf(t.actor, Actor.options),
  ],
);

export const jobOtps = sqliteTable(
  'job_otps',
  {
    bookingId: text('booking_id')
      .notNull()
      .references(() => bookings.id),
    kind: text('kind', { enum: tuple(JobOtpKind) }).notNull(),
    codeHash: text('code_hash').notNull(),
    attempts: integer('attempts').notNull().default(0),
    validFrom: integer('valid_from').notNull(),
    validTo: integer('valid_to').notNull(),
    usedAt: integer('used_at'),
    ...timestamps,
  },
  (t) => [primaryKey({ columns: [t.bookingId, t.kind] }), oneOf(t.kind, JobOtpKind.options)],
);

export const jobChecks = sqliteTable(
  'job_checks',
  {
    id: id(),
    bookingId: text('booking_id')
      .notNull()
      .references(() => bookings.id),
    kind: text('kind', { enum: tuple(JobCheckKind) }).notNull(),
    lat: real('lat'),
    lng: real('lng'),
    distanceM: integer('distance_m'),
    at: integer('at').notNull(),
    ...timestamps,
  },
  (t) => [index('job_checks_booking_idx').on(t.bookingId), oneOf(t.kind, JobCheckKind.options)],
);

export const kitchenChecks = sqliteTable('kitchen_checks', {
  bookingId: text('booking_id')
    .primaryKey()
    .references(() => bookings.id),
  gas: bool('gas').notNull(),
  oven: bool('oven').notNull(),
  mixer: bool('mixer').notNull(),
  fridge: bool('fridge').notNull(),
  ...timestamps,
});
