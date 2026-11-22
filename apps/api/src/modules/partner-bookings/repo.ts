import { and, eq, notInArray } from 'drizzle-orm';
import type { Db } from '../../db';
import {
  addresses,
  bookingEvents,
  bookingItems,
  bookings,
  chefs,
  foodProfiles,
  kitchenChecks,
  setMenus,
  users,
} from '../../db/schema';

const columns = {
  booking: bookings,
  menuName: setMenus.name,
  guestName: users.name,
  area: addresses.area,
  requestedAt: bookingEvents.at,
};

const base = (db: Db) =>
  db
    .select(columns)
    .from(bookings)
    .innerJoin(users, eq(users.id, bookings.guestId))
    .innerJoin(addresses, eq(addresses.id, bookings.addressId))
    .leftJoin(setMenus, eq(setMenus.id, bookings.menuId))
    .leftJoin(
      bookingEvents,
      and(eq(bookingEvents.bookingId, bookings.id), eq(bookingEvents.toState, 'requested')),
    );

const visible = notInArray(bookings.state, ['payment_pending', 'expired']);

export const chefStatus = (db: Db, chefId: string) =>
  db.select({ status: chefs.status }).from(chefs).where(eq(chefs.id, chefId)).get();

/** A chef has tens of bookings at beta scale, so the list is sorted and paged in memory. */
export const chefBookings = (db: Db, chefId: string) =>
  base(db).where(and(eq(bookings.chefId, chefId), visible));

export async function chefBooking(db: Db, chefId: string, bookingId: string) {
  const rows = await base(db).where(
    and(eq(bookings.id, bookingId), eq(bookings.chefId, chefId), visible),
  );
  const row = rows[0];
  if (!row) return null;

  const [address, items, profile, kitchen] = await db.batch([
    db
      .select({
        area: addresses.area,
        city: addresses.city,
        line1: addresses.line1,
        pincode: addresses.pincode,
        lat: addresses.lat,
        lng: addresses.lng,
      })
      .from(addresses)
      .where(eq(addresses.id, row.booking.addressId)),
    db
      .select({ course: bookingItems.course, dishName: bookingItems.dishName })
      .from(bookingItems)
      .where(eq(bookingItems.bookingId, bookingId)),
    db
      .select({
        allergies: foodProfiles.allergies,
        rules: foodProfiles.rules,
        notes: foodProfiles.notes,
      })
      .from(foodProfiles)
      .where(eq(foodProfiles.userId, row.booking.guestId)),
    db
      .select({
        gas: kitchenChecks.gas,
        oven: kitchenChecks.oven,
        mixer: kitchenChecks.mixer,
        fridge: kitchenChecks.fridge,
      })
      .from(kitchenChecks)
      .where(eq(kitchenChecks.bookingId, bookingId)),
  ]);
  return {
    ...row,
    address: address[0]!,
    items,
    profile: profile[0] ?? null,
    kitchen: kitchen[0] ?? null,
  };
}
