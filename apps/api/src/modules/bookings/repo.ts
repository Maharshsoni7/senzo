import { and, desc, eq, notInArray } from 'drizzle-orm';
import type { Db } from '../../db';
import { addresses, bookingEvents, bookingItems, bookings, chefs, setMenus } from '../../db/schema';

const summaryColumns = {
  booking: bookings,
  chefSlug: chefs.slug,
  chefName: chefs.displayName,
  menuName: setMenus.name,
};

/** A guest has few bookings, so the list is sorted and paged in memory. */
export function guestBookings(db: Db, guestId: string) {
  return db
    .select(summaryColumns)
    .from(bookings)
    .innerJoin(chefs, eq(chefs.id, bookings.chefId))
    .leftJoin(setMenus, eq(setMenus.id, bookings.menuId))
    .where(
      and(
        eq(bookings.guestId, guestId),
        notInArray(bookings.state, ['payment_pending', 'expired']),
      ),
    );
}

export async function guestBooking(db: Db, guestId: string, bookingId: string) {
  const [rows, items, onTheWay] = await db.batch([
    db
      .select({
        ...summaryColumns,
        address: { label: addresses.label, line1: addresses.line1, area: addresses.area },
      })
      .from(bookings)
      .innerJoin(chefs, eq(chefs.id, bookings.chefId))
      .innerJoin(addresses, eq(addresses.id, bookings.addressId))
      .leftJoin(setMenus, eq(setMenus.id, bookings.menuId))
      .where(
        and(
          eq(bookings.id, bookingId),
          eq(bookings.guestId, guestId),
          notInArray(bookings.state, ['payment_pending', 'expired']),
        ),
      ),
    db
      .select({ course: bookingItems.course, dishName: bookingItems.dishName })
      .from(bookingItems)
      .where(eq(bookingItems.bookingId, bookingId)),
    // "On my way" is the only confirmed → confirmed event a chef makes.
    db
      .select({ at: bookingEvents.at })
      .from(bookingEvents)
      .where(
        and(
          eq(bookingEvents.bookingId, bookingId),
          eq(bookingEvents.fromState, 'confirmed'),
          eq(bookingEvents.toState, 'confirmed'),
          eq(bookingEvents.actor, 'chef'),
        ),
      )
      .orderBy(desc(bookingEvents.at))
      .limit(1),
  ]);
  const row = rows[0];
  return row ? { ...row, items, onTheWayAt: onTheWay[0]?.at ?? null } : null;
}
