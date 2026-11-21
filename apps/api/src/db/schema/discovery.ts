import {
  BudgetTier,
  FoodRule,
  GroceriesBy,
  MenuRequestStatus,
  ProposalStatus,
  Slot,
} from '@senzo/schemas';
import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { bool, id, json, oneOf, timestamps, tuple } from '../columns';
import { chefs } from './chefs';
import { addresses } from './guests';
import { users } from './identity';

type Polygon = { type: 'Polygon'; coordinates: [number, number][][] };

export const serviceAreas = sqliteTable('service_areas', {
  id: id(),
  city: text('city').notNull(),
  name: text('name').notNull(),
  polygon: json<Polygon>('polygon').notNull(),
  isLive: bool('is_live').notNull().default(false),
  ...timestamps,
});

export const searchSynonyms = sqliteTable(
  'search_synonyms',
  {
    term: text('term').notNull(),
    synonym: text('synonym').notNull(),
    ...timestamps,
  },
  (t) => [primaryKey({ columns: [t.term, t.synonym] })],
);

export const menuRequests = sqliteTable(
  'menu_requests',
  {
    id: id(),
    code: text('code').notNull().unique(),
    guestId: text('guest_id')
      .notNull()
      .references(() => users.id),
    occasion: text('occasion').notNull(),
    guests: integer('guests'),
    visitsPerWeek: integer('visits_per_week'),
    date: text('date').notNull(),
    slot: text('slot', { enum: tuple(Slot) }).notNull(),
    cuisines: json<string[]>('cuisines').notNull().default([]),
    foodRule: text('food_rule', { enum: tuple(FoodRule) })
      .notNull()
      .default('regular'),
    budgetTier: text('budget_tier', { enum: tuple(BudgetTier) }).notNull(),
    mustHaves: text('must_haves'),
    groceries: text('groceries', { enum: tuple(GroceriesBy) })
      .notNull()
      .default('chef'),
    addressId: text('address_id')
      .notNull()
      .references(() => addresses.id),
    status: text('status', { enum: tuple(MenuRequestStatus) })
      .notNull()
      .default('open'),
    replyDeadlineAt: integer('reply_deadline_at').notNull(),
    ...timestamps,
  },
  (t) => [
    index('menu_requests_guest_idx').on(t.guestId),
    oneOf(t.slot, Slot.options),
    oneOf(t.foodRule, FoodRule.options),
    oneOf(t.budgetTier, BudgetTier.options),
    oneOf(t.groceries, GroceriesBy.options),
    oneOf(t.status, MenuRequestStatus.options),
  ],
);

export const requestInvites = sqliteTable(
  'request_invites',
  {
    requestId: text('request_id')
      .notNull()
      .references(() => menuRequests.id),
    chefId: text('chef_id')
      .notNull()
      .references(() => chefs.id),
    invitedAt: integer('invited_at').notNull(),
    seenAt: integer('seen_at'),
    ...timestamps,
  },
  (t) => [primaryKey({ columns: [t.requestId, t.chefId] })],
);

export const proposals = sqliteTable(
  'proposals',
  {
    id: id(),
    requestId: text('request_id')
      .notNull()
      .references(() => menuRequests.id),
    chefId: text('chef_id')
      .notNull()
      .references(() => chefs.id),
    menu: json<unknown>('menu').notNull(),
    pricePerGuestPaise: integer('price_per_guest_paise').notNull(),
    bringsHelper: bool('brings_helper').notNull().default(false),
    note: text('note'),
    heldUntil: integer('held_until').notNull(),
    status: text('status', { enum: tuple(ProposalStatus) })
      .notNull()
      .default('sent'),
    ...timestamps,
  },
  (t) => [index('proposals_request_idx').on(t.requestId), oneOf(t.status, ProposalStatus.options)],
);
