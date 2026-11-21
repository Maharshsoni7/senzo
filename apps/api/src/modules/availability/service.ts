import type { Slot } from '@senzo/schemas';
import { and, eq, gte, inArray, lte, or } from 'drizzle-orm';
import type { Db } from '../../db';
import { availability, bookings, chefs, cookingDays } from '../../db/schema';
import { CHECKOUT_LOCK_MS } from '../../config/policy';
import { AppError } from '../../lib/errors';
import { monthAvailability, slotStatus, type AvailabilityInput } from './rules';

async function load(db: Db, chefId: string, from: string, to: string, now: number) {
  const [[chef], weekly, overrides, held] = await db.batch([
    db.select({ status: chefs.status }).from(chefs).where(eq(chefs.id, chefId)),
    db.select().from(cookingDays).where(eq(cookingDays.chefId, chefId)),
    db
      .select()
      .from(availability)
      .where(
        and(
          eq(availability.chefId, chefId),
          gte(availability.date, from),
          lte(availability.date, to),
        ),
      ),
    db
      .select({ date: bookings.date, slot: bookings.slot })
      .from(bookings)
      .where(
        and(
          eq(bookings.chefId, chefId),
          gte(bookings.date, from),
          lte(bookings.date, to),
          or(
            inArray(bookings.state, ['requested', 'confirmed', 'in_progress']),
            and(
              eq(bookings.state, 'payment_pending'),
              gte(bookings.createdAt, now - CHECKOUT_LOCK_MS),
            ),
          ),
        ),
      ),
  ]);
  if (!chef) throw new AppError('NOT_FOUND', 404, 'Chef not found');

  return {
    chefLive: chef.status === 'live',
    weekly: new Map(weekly.map((d) => [d.weekday, d.slots])),
    overrides: new Map(overrides.map((o) => [`${o.date}:${o.slot}`, o.state])),
    busy: new Set(held.map((b) => `${b.date}:${b.slot}`)),
    now,
  } satisfies Omit<AvailabilityInput, 'month'>;
}

export async function chefMonth(db: Db, chefId: string, month: string, now = Date.now()) {
  const inputs = await load(db, chefId, `${month}-01`, `${month}-31`, now);
  return { chefId, month, days: monthAvailability({ ...inputs, month }) };
}

/** Throws SLOT_TAKEN or SLOT_UNAVAILABLE unless the chef can take this date and slot. */
export async function assertSlotOpen(
  db: Db,
  chefId: string,
  date: string,
  slot: Slot,
  now = Date.now(),
) {
  const status = slotStatus(date, slot, await load(db, chefId, date, date, now));
  if (status === 'booked')
    throw new AppError('SLOT_TAKEN', 409, 'The chef is booked for this slot');
  if (status === 'off')
    throw new AppError('SLOT_UNAVAILABLE', 409, 'The chef isn’t cooking at this time');
}
