import type { Db } from './db';

export type Bindings = {
  DB: D1Database;
};

export type AppEnv = {
  Bindings: Bindings;
  Variables: {
    db: Db;
    /** Set by auth middleware; absent on public routes. */
    userId?: string;
  };
};
