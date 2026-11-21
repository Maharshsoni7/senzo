import { AdminRole, WebhookProvider } from '@senzo/schemas';
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
import { bool, id, json, oneOf, timestamps, tuple } from '../columns';

export const outboxEvents = sqliteTable(
  'outbox_events',
  {
    id: id(),
    type: text('type').notNull(),
    payload: json<unknown>('payload').notNull(),
    publishedAt: integer('published_at'),
    ...timestamps,
  },
  (t) => [index('outbox_events_unpublished_idx').on(t.publishedAt)],
);

export const webhookEvents = sqliteTable(
  'webhook_events',
  {
    id: id(),
    provider: text('provider', { enum: tuple(WebhookProvider) }).notNull(),
    eventId: text('event_id').notNull(),
    signatureOk: bool('signature_ok').notNull(),
    payload: text('payload').notNull(),
    processedAt: integer('processed_at'),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('webhook_events_provider_event').on(t.provider, t.eventId),
    oneOf(t.provider, WebhookProvider.options),
  ],
);

/** `response` is null while the first request is still running. Kept 24 h. */
export const idempotencyKeys = sqliteTable(
  'idempotency_keys',
  {
    key: text('key').notNull(),
    userId: text('user_id').notNull(),
    route: text('route').notNull(),
    requestHash: text('request_hash').notNull(),
    statusCode: integer('status_code'),
    contentType: text('content_type'),
    response: text('response'),
    ...timestamps,
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.key] }),
    index('idempotency_keys_created_idx').on(t.createdAt),
  ],
);

/** Append-only. */
export const auditLogs = sqliteTable(
  'audit_logs',
  {
    id: id(),
    adminId: text('admin_id').notNull(),
    action: text('action').notNull(),
    entity: text('entity').notNull(),
    entityId: text('entity_id').notNull(),
    before: json<unknown>('before'),
    after: json<unknown>('after'),
    at: integer('at').notNull(),
    ...timestamps,
  },
  (t) => [index('audit_logs_entity_idx').on(t.entity, t.entityId)],
);

export const adminUsers = sqliteTable(
  'admin_users',
  {
    id: id(),
    email: text('email').notNull().unique(),
    role: text('role', { enum: tuple(AdminRole) }).notNull(),
    ...timestamps,
  },
  (t) => [oneOf(t.role, AdminRole.options)],
);

export const featureFlags = sqliteTable('feature_flags', {
  key: text('key').primaryKey(),
  value: json<unknown>('value').notNull(),
  ...timestamps,
});
