import { sql } from 'drizzle-orm';
import { check, integer, text, type SQLiteColumn } from 'drizzle-orm/sqlite-core';
import { ulid } from 'ulidx';

export const id = () =>
  text('id')
    .primaryKey()
    .$defaultFn(() => ulid());

export const timestamps = {
  createdAt: integer('created_at')
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer('updated_at')
    .notNull()
    .$defaultFn(() => Date.now())
    .$onUpdateFn(() => Date.now()),
};

export const bool = (name: string) => integer(name, { mode: 'boolean' });

export const json = <T>(name: string) => text(name, { mode: 'json' }).$type<T>();

/** CHECK that mirrors a zod enum; values are inlined because DDL can't take parameters. */
export function oneOf(column: SQLiteColumn, values: readonly string[]) {
  const list = values.map((v) => `'${v.replaceAll("'", "''")}'`).join(', ');
  return check(`${column.name}_valid`, sql`${column} IN (${sql.raw(list)})`);
}

/** zod 4 types `.options` as an array; Drizzle's `enum` wants a non-empty tuple. */
export const tuple = <T extends string>(e: { options: readonly T[] }) =>
  e.options as unknown as [T, ...T[]];
