import {
  MessageKind,
  NotificationChannel,
  ReportCategory,
  ReportOutcome,
  ReportStatus,
  Side,
} from '@senzo/schemas';
import { sql } from 'drizzle-orm';
import { check, index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { bool, id, json, oneOf, timestamps, tuple } from '../columns';
import { bookings } from './bookings';
import { chefs } from './chefs';
import { menuRequests } from './discovery';
import { users } from './identity';

export const threads = sqliteTable(
  'threads',
  {
    id: id(),
    bookingId: text('booking_id').references(() => bookings.id),
    requestId: text('request_id').references(() => menuRequests.id),
    guestId: text('guest_id')
      .notNull()
      .references(() => users.id),
    chefId: text('chef_id')
      .notNull()
      .references(() => chefs.id),
    ...timestamps,
  },
  (t) => [
    index('threads_booking_idx').on(t.bookingId),
    check('threads_subject', sql`${t.bookingId} IS NOT NULL OR ${t.requestId} IS NOT NULL`),
  ],
);

export type MessageFlags = { phone?: boolean; upi?: boolean; cash?: boolean };

export const messages = sqliteTable(
  'messages',
  {
    id: id(),
    threadId: text('thread_id')
      .notNull()
      .references(() => threads.id),
    senderId: text('sender_id').references(() => users.id),
    kind: text('kind', { enum: tuple(MessageKind) }).notNull(),
    body: text('body'),
    menuCard: json<unknown>('menu_card'),
    flags: json<MessageFlags>('flags').notNull().default({}),
    readAt: integer('read_at'),
    ...timestamps,
  },
  (t) => [index('messages_thread_idx').on(t.threadId), oneOf(t.kind, MessageKind.options)],
);

export const callSessions = sqliteTable(
  'call_sessions',
  {
    id: id(),
    bookingId: text('booking_id')
      .notNull()
      .references(() => bookings.id),
    exotelRef: text('exotel_ref').unique(),
    fromSide: text('from_side', { enum: tuple(Side) }).notNull(),
    startedAt: integer('started_at'),
    durationS: integer('duration_s'),
    ...timestamps,
  },
  (t) => [index('call_sessions_booking_idx').on(t.bookingId), oneOf(t.fromSide, Side.options)],
);

export const notifications = sqliteTable(
  'notifications',
  {
    id: id(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    event: text('event').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    deepLink: text('deep_link'),
    channel: text('channel', { enum: tuple(NotificationChannel) }).notNull(),
    sentAt: integer('sent_at'),
    readAt: integer('read_at'),
    ...timestamps,
  },
  (t) => [
    index('notifications_user_idx').on(t.userId),
    oneOf(t.channel, NotificationChannel.options),
  ],
);

export type QuietHours = { from: string; to: string };

export const notificationPrefs = sqliteTable('notification_prefs', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id),
  marketingOptIn: bool('marketing_opt_in').notNull().default(false),
  quietHours: json<QuietHours>('quiet_hours'),
  ...timestamps,
});

export const reviews = sqliteTable(
  'reviews',
  {
    id: id(),
    bookingId: text('booking_id')
      .notNull()
      .references(() => bookings.id),
    authorSide: text('author_side', { enum: tuple(Side) }).notNull(),
    stars: integer('stars').notNull(),
    tags: json<string[]>('tags').notNull().default([]),
    text: text('text'),
    isPrivate: bool('is_private').notNull().default(false),
    doNotMatch: bool('do_not_match').notNull().default(false),
    ...timestamps,
  },
  (t) => [
    index('reviews_booking_idx').on(t.bookingId),
    oneOf(t.authorSide, Side.options),
    check('stars_range', sql`${t.stars} BETWEEN 1 AND 5`),
  ],
);

export const reports = sqliteTable(
  'reports',
  {
    id: id(),
    code: text('code').notNull().unique(),
    bookingId: text('booking_id')
      .notNull()
      .references(() => bookings.id),
    reporterId: text('reporter_id')
      .notNull()
      .references(() => users.id),
    category: text('category', { enum: tuple(ReportCategory) }).notNull(),
    details: text('details'),
    photoKeys: json<string[]>('photo_keys').notNull().default([]),
    status: text('status', { enum: tuple(ReportStatus) })
      .notNull()
      .default('open'),
    outcome: text('outcome', { enum: tuple(ReportOutcome) }),
    resolvedBy: text('resolved_by'),
    ...timestamps,
  },
  (t) => [
    index('reports_booking_idx').on(t.bookingId),
    oneOf(t.category, ReportCategory.options),
    oneOf(t.status, ReportStatus.options),
    oneOf(t.outcome, ReportOutcome.options),
  ],
);

export const sosEvents = sqliteTable(
  'sos_events',
  {
    id: id(),
    bookingId: text('booking_id')
      .notNull()
      .references(() => bookings.id),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    lat: real('lat'),
    lng: real('lng'),
    at: integer('at').notNull(),
    handledBy: text('handled_by'),
    ...timestamps,
  },
  (t) => [index('sos_events_booking_idx').on(t.bookingId)],
);
