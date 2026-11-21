import type { Db } from './db';

export type Bindings = {
  DB: D1Database;
  ENVIRONMENT: 'development' | 'staging' | 'production';
  JWT_SECRET: string;
  /** HMAC key for OTP and refresh-token hashes. */
  OTP_PEPPER: string;
  TURNSTILE_SECRET: string;
  /** Non-production only: every OTP is this code and no SMS is sent. */
  DEV_FIXED_OTP?: string;
};

export type AppEnv = {
  Bindings: Bindings;
  Variables: {
    db: Db;
    /** Set by requireAuth; absent on public routes. */
    userId?: string;
    sessionId?: string;
  };
};
