import {
  AppKind,
  ConsentKind,
  Lang,
  OtpPurpose,
  Platform,
  type Role,
  UserStatus,
} from '@senzo/schemas';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { id, json, oneOf, timestamps, tuple } from '../columns';

export const users = sqliteTable(
  'users',
  {
    id: id(),
    phoneE164: text('phone_e164').notNull().unique(),
    name: text('name'),
    email: text('email'),
    roleFlags: json<Role[]>('role_flags').notNull().default([]),
    ageConfirmedAt: integer('age_confirmed_at'),
    lang: text('lang', { enum: tuple(Lang) })
      .notNull()
      .default('en'),
    status: text('status', { enum: tuple(UserStatus) })
      .notNull()
      .default('active'),
    deletedAt: integer('deleted_at'),
    ...timestamps,
  },
  (t) => [oneOf(t.lang, Lang.options), oneOf(t.status, UserStatus.options)],
);

export const devices = sqliteTable(
  'devices',
  {
    id: id(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    platform: text('platform', { enum: tuple(Platform) }).notNull(),
    app: text('app', { enum: tuple(AppKind) }).notNull(),
    pushToken: text('push_token'),
    lastSeenAt: integer('last_seen_at'),
    ...timestamps,
  },
  (t) => [
    index('devices_user_idx').on(t.userId),
    oneOf(t.platform, Platform.options),
    oneOf(t.app, AppKind.options),
  ],
);

export const sessions = sqliteTable(
  'sessions',
  {
    id: id(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    deviceId: text('device_id').references(() => devices.id),
    refreshHash: text('refresh_hash').notNull().unique(),
    expiresAt: integer('expires_at').notNull(),
    rotatedFrom: text('rotated_from'),
    revokedAt: integer('revoked_at'),
    ...timestamps,
  },
  (t) => [index('sessions_user_idx').on(t.userId)],
);

export const otpCodes = sqliteTable(
  'otp_codes',
  {
    id: id(),
    phoneE164: text('phone_e164').notNull(),
    purpose: text('purpose', { enum: tuple(OtpPurpose) }).notNull(),
    codeHash: text('code_hash').notNull(),
    attempts: integer('attempts').notNull().default(0),
    expiresAt: integer('expires_at').notNull(),
    ...timestamps,
  },
  (t) => [index('otp_codes_phone_idx').on(t.phoneE164), oneOf(t.purpose, OtpPurpose.options)],
);

export const consents = sqliteTable(
  'consents',
  {
    id: id(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    kind: text('kind', { enum: tuple(ConsentKind) }).notNull(),
    version: text('version').notNull(),
    grantedAt: integer('granted_at').notNull(),
    withdrawnAt: integer('withdrawn_at'),
    ...timestamps,
  },
  (t) => [index('consents_user_idx').on(t.userId), oneOf(t.kind, ConsentKind.options)],
);
