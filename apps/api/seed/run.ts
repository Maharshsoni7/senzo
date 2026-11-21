import { getPlatformProxy } from 'wrangler';
import { createDb } from '../src/db';
import type { Bindings } from '../src/env';
import { seed } from '.';

const { env, dispose } = await getPlatformProxy<Bindings>();
const rows = await seed(createDb(env.DB));
console.log(`Seeded ${rows} rows into local D1 (senzo-dev)`);
await dispose();
