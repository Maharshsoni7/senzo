import { AddressLabel, WalletReason } from '@senzo/schemas';
import { index, integer, primaryKey, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { bool, id, json, oneOf, timestamps, tuple } from '../columns';
import { chefs } from './chefs';
import { serviceAreas } from './discovery';
import { users } from './identity';

export const addresses = sqliteTable(
  'addresses',
  {
    id: id(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    label: text('label', { enum: tuple(AddressLabel) })
      .notNull()
      .default('home'),
    line1: text('line1').notNull(),
    area: text('area').notNull(),
    city: text('city').notNull(),
    pincode: text('pincode').notNull(),
    lat: real('lat').notNull(),
    lng: real('lng').notNull(),
    flatEnc: text('flat_enc'),
    gateNotesEnc: text('gate_notes_enc'),
    serviceAreaId: text('service_area_id').references(() => serviceAreas.id),
    isDefault: bool('is_default').notNull().default(false),
    ...timestamps,
  },
  (t) => [index('addresses_user_idx').on(t.userId), oneOf(t.label, AddressLabel.options)],
);

export type FoodRules = { jainCount?: number; noOnionGarlic?: boolean; other?: string };

export const foodProfiles = sqliteTable('food_profiles', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id),
  allergies: json<string[]>('allergies').notNull().default([]),
  rules: json<FoodRules>('rules').notNull().default({}),
  notes: text('notes'),
  ...timestamps,
});

export const favourites = sqliteTable(
  'favourites',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    chefId: text('chef_id')
      .notNull()
      .references(() => chefs.id),
    ...timestamps,
  },
  (t) => [primaryKey({ columns: [t.userId, t.chefId] })],
);

/** Cache of Σ wallet_entries; written only alongside a wallet entry. */
export const wallets = sqliteTable('wallets', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id),
  balancePaise: integer('balance_paise').notNull().default(0),
  ...timestamps,
});

export const walletEntries = sqliteTable(
  'wallet_entries',
  {
    id: id(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    amountPaise: integer('amount_paise').notNull(),
    reason: text('reason', { enum: tuple(WalletReason) }).notNull(),
    bookingId: text('booking_id'),
    expiresAt: integer('expires_at'),
    ...timestamps,
  },
  (t) => [index('wallet_entries_user_idx').on(t.userId), oneOf(t.reason, WalletReason.options)],
);
