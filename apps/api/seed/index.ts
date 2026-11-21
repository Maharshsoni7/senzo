import type { BatchItem } from 'drizzle-orm/batch';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';
import type { Db } from '../src/db';
import { schema } from '../src/db';
import * as data from './data';

// Parent tables first; FKs are enforced.
const plan: [SQLiteTable, object[]][] = [
  [schema.users, data.users],
  [schema.serviceAreas, data.serviceAreas],
  [schema.chefs, data.chefs],
  [schema.chefCuisines, data.chefCuisines],
  [schema.chefFoodRules, data.chefFoodRules],
  [schema.chefOccasions, data.chefOccasions],
  [schema.cookingDays, data.cookingDays],
  [schema.dishes, data.dishes],
  [schema.setMenus, data.setMenus],
  [schema.menuBands, data.menuBands],
  [schema.menuCourses, data.menuCourses],
  [schema.menuOptions, data.menuOptions],
  [schema.menuAddons, data.menuAddons],
  [schema.addresses, data.addresses],
  [schema.foodProfiles, data.foodProfiles],
  [schema.bookings, data.bookings],
  [schema.bookingEvents, data.bookingEvents],
  [schema.tips, data.tips],
  [schema.reviews, data.reviews],
  [schema.promoCodes, data.promoCodes],
  [schema.ledgerAccounts, data.ledgerAccounts],
];

/** One row per statement: D1 caps a query at 100 bound parameters. */
export const seedStatements = (db: Db) =>
  plan.flatMap(([table, rows]) =>
    rows.map((row) => db.insert(table).values(row).onConflictDoNothing()),
  );

/** Idempotent: rows that already exist are skipped. */
export async function seed(db: Db) {
  const statements = seedStatements(db) as unknown as [
    BatchItem<'sqlite'>,
    ...BatchItem<'sqlite'>[],
  ];
  await db.batch(statements);
  return statements.length;
}
