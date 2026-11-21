// Writes the seed as plain SQL for `wrangler d1 execute --remote --file`.
import { writeFileSync } from 'node:fs';
import { seedStatements } from '.';
import { createDb } from '../src/db';

const out = process.argv[2] ?? 'seed.sql';

// Only builds SQL; the binding is never called.
const db = createDb({} as D1Database);

const literal = (v: unknown): string => {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number' || typeof v === 'bigint') return String(v);
  if (typeof v === 'boolean') return v ? '1' : '0';
  return `'${String(v).replaceAll("'", "''")}'`;
};

const lines = seedStatements(db).map((q) => {
  const { sql, params } = q.toSQL();
  let i = 0;
  return `${sql.replace(/\?/g, () => literal(params[i++]))};`;
});

writeFileSync(out, lines.join('\n') + '\n');
console.log(`Wrote ${lines.length} statements to ${out}`);
