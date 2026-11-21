import { FoodType, JainFlag, MenuKind, ReviewStatus } from '@senzo/schemas';
import { sql } from 'drizzle-orm';
import { check, index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { bool, id, oneOf, timestamps, tuple } from '../columns';
import { chefs } from './chefs';

export const dishes = sqliteTable(
  'dishes',
  {
    id: id(),
    chefId: text('chef_id')
      .notNull()
      .references(() => chefs.id),
    name: text('name').notNull(),
    course: text('course').notNull(),
    foodType: text('food_type', { enum: tuple(FoodType) }).notNull(),
    description: text('description'),
    photoKey: text('photo_key'),
    isSignature: bool('is_signature').notNull().default(false),
    reviewStatus: text('review_status', { enum: tuple(ReviewStatus) })
      .notNull()
      .default('pending'),
    ...timestamps,
  },
  (t) => [
    index('dishes_chef_idx').on(t.chefId),
    oneOf(t.foodType, FoodType.options),
    oneOf(t.reviewStatus, ReviewStatus.options),
    check('description_len', sql`length(${t.description}) <= 90`),
  ],
);

export const setMenus = sqliteTable(
  'set_menus',
  {
    id: id(),
    chefId: text('chef_id')
      .notNull()
      .references(() => chefs.id),
    name: text('name').notNull(),
    summary: text('summary'),
    minBookingPaise: integer('min_booking_paise').notNull(),
    grocerySavingPaise: integer('grocery_saving_paise').notNull().default(0),
    offersJain: bool('offers_jain').notNull().default(false),
    offersNog: bool('offers_nog').notNull().default(false),
    isLive: bool('is_live').notNull().default(false),
    sort: integer('sort').notNull().default(0),
    kind: text('kind', { enum: tuple(MenuKind) })
      .notNull()
      .default('event'),
    ...timestamps,
  },
  (t) => [index('set_menus_chef_idx').on(t.chefId), oneOf(t.kind, MenuKind.options)],
);

// Non-increasing price per guest by band size is enforced in the menu service, not here.
export const menuBands = sqliteTable(
  'menu_bands',
  {
    menuId: text('menu_id')
      .notNull()
      .references(() => setMenus.id),
    minGuests: integer('min_guests').notNull(),
    maxGuests: integer('max_guests').notNull(),
    pricePerGuestPaise: integer('price_per_guest_paise').notNull(),
    ...timestamps,
  },
  (t) => [
    primaryKey({ columns: [t.menuId, t.minGuests] }),
    check('band_range', sql`${t.minGuests} >= 1 AND ${t.maxGuests} >= ${t.minGuests}`),
  ],
);

export const menuCourses = sqliteTable(
  'menu_courses',
  {
    id: id(),
    menuId: text('menu_id')
      .notNull()
      .references(() => setMenus.id),
    name: text('name').notNull(),
    position: integer('position').notNull(),
    ...timestamps,
  },
  (t) => [index('menu_courses_menu_idx').on(t.menuId)],
);

export const menuOptions = sqliteTable(
  'menu_options',
  {
    id: id(),
    courseId: text('course_id')
      .notNull()
      .references(() => menuCourses.id),
    dishId: text('dish_id')
      .notNull()
      .references(() => dishes.id),
    extraPaise: integer('extra_paise').notNull().default(0),
    jainFlag: text('jain_flag', { enum: tuple(JainFlag) })
      .notNull()
      .default('ok'),
    needsOven: bool('needs_oven').notNull().default(false),
    ovenAltText: text('oven_alt_text'),
    position: integer('position').notNull(),
    ...timestamps,
  },
  (t) => [index('menu_options_course_idx').on(t.courseId), oneOf(t.jainFlag, JainFlag.options)],
);

export const menuAddons = sqliteTable(
  'menu_addons',
  {
    id: id(),
    menuId: text('menu_id')
      .notNull()
      .references(() => setMenus.id),
    name: text('name').notNull(),
    pricePerGuestPaise: integer('price_per_guest_paise').notNull(),
    note: text('note'),
    ...timestamps,
  },
  (t) => [index('menu_addons_menu_idx').on(t.menuId)],
);

export const mealPrepPlans = sqliteTable(
  'meal_prep_plans',
  {
    menuId: text('menu_id')
      .notNull()
      .references(() => setMenus.id),
    visitsPerWeek: integer('visits_per_week').notNull(),
    pricePerVisitPaise: integer('price_per_visit_paise').notNull(),
    ...timestamps,
  },
  (t) => [primaryKey({ columns: [t.menuId, t.visitsPerWeek] })],
);
