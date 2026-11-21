import { and, asc, desc, eq, inArray, lt, or } from 'drizzle-orm';
import type { Db } from '../../db';
import {
  availability,
  bookings,
  chefCuisines,
  chefFoodRules,
  chefOccasions,
  chefProofs,
  chefs,
  cookingDays,
  dishes,
  menuAddons,
  menuBands,
  menuCourses,
  menuOptions,
  reviews,
  searchSynonyms,
  setMenus,
  users,
} from '../../db/schema';
import { CHECKOUT_LOCK_MS } from '../../config/policy';

/** Everything the rail needs for every live chef, in one batch. Fine at beta scale (tens of chefs). */
export async function loadLiveChefs(db: Db) {
  const [liveChefs, cuisines, menus, bands, dishNames] = await db.batch([
    db.select().from(chefs).where(eq(chefs.status, 'live')),
    db
      .select({ chefId: chefCuisines.chefId, cuisine: chefCuisines.cuisine })
      .from(chefCuisines)
      .innerJoin(chefs, eq(chefs.id, chefCuisines.chefId))
      .where(eq(chefs.status, 'live')),
    db.select().from(setMenus).where(eq(setMenus.isLive, true)),
    db
      .select({
        menuId: menuBands.menuId,
        minGuests: menuBands.minGuests,
        maxGuests: menuBands.maxGuests,
        pricePerGuestPaise: menuBands.pricePerGuestPaise,
      })
      .from(menuBands)
      .innerJoin(setMenus, eq(setMenus.id, menuBands.menuId))
      .where(eq(setMenus.isLive, true)),
    db
      .select({ chefId: dishes.chefId, name: dishes.name })
      .from(dishes)
      .where(eq(dishes.reviewStatus, 'approved')),
  ]);
  return { liveChefs, cuisines, menus, bands, dishNames };
}

export async function synonymsOf(db: Db, term: string) {
  const rows = await db
    .select()
    .from(searchSynonyms)
    .where(or(eq(searchSynonyms.term, term), eq(searchSynonyms.synonym, term)));
  return rows.flatMap((r) => [r.term, r.synonym]);
}

/** Inputs for availability rules for many chefs on one date. */
export async function loadSlotInputs(db: Db, chefIds: string[], date: string, now: number) {
  if (chefIds.length === 0) return { weekly: [], overrides: [], held: [] };
  const [weekly, overrides, held] = await db.batch([
    db.select().from(cookingDays).where(inArray(cookingDays.chefId, chefIds)),
    db
      .select()
      .from(availability)
      .where(and(inArray(availability.chefId, chefIds), eq(availability.date, date))),
    db
      .select({
        chefId: bookings.chefId,
        slot: bookings.slot,
        state: bookings.state,
        createdAt: bookings.createdAt,
      })
      .from(bookings)
      .where(
        and(
          inArray(bookings.chefId, chefIds),
          eq(bookings.date, date),
          inArray(bookings.state, ['payment_pending', 'requested', 'confirmed', 'in_progress']),
        ),
      ),
  ]);
  return {
    weekly,
    overrides,
    held: held.filter(
      (b) => b.state !== 'payment_pending' || b.createdAt >= now - CHECKOUT_LOCK_MS,
    ),
  };
}

export async function loadProfile(db: Db, slug: string) {
  const chef = await db
    .select()
    .from(chefs)
    .where(and(eq(chefs.slug, slug), eq(chefs.status, 'live')))
    .get();
  if (!chef) return null;
  const [cuisines, rules, occasions, proofs] = await db.batch([
    db.select().from(chefCuisines).where(eq(chefCuisines.chefId, chef.id)),
    db.select().from(chefFoodRules).where(eq(chefFoodRules.chefId, chef.id)),
    db.select().from(chefOccasions).where(eq(chefOccasions.chefId, chef.id)),
    db
      .select()
      .from(chefProofs)
      .where(and(eq(chefProofs.chefId, chef.id), eq(chefProofs.status, 'ok'))),
  ]);
  return { chef, cuisines, rules, occasions, proofs };
}

export async function isLiveChef(db: Db, chefId: string) {
  const row = await db
    .select({ id: chefs.id })
    .from(chefs)
    .where(and(eq(chefs.id, chefId), eq(chefs.status, 'live')))
    .get();
  return row !== undefined;
}

export async function loadMenus(db: Db, chefId: string) {
  const liveMenus = and(eq(setMenus.chefId, chefId), eq(setMenus.isLive, true));
  const [menus, bands, courses, options, addons] = await db.batch([
    db.select().from(setMenus).where(liveMenus).orderBy(asc(setMenus.sort)),
    db
      .select({ band: menuBands })
      .from(menuBands)
      .innerJoin(setMenus, eq(setMenus.id, menuBands.menuId))
      .where(liveMenus)
      .orderBy(asc(menuBands.minGuests)),
    db
      .select({ course: menuCourses })
      .from(menuCourses)
      .innerJoin(setMenus, eq(setMenus.id, menuCourses.menuId))
      .where(liveMenus)
      .orderBy(asc(menuCourses.position)),
    db
      .select({ option: menuOptions, dishName: dishes.name })
      .from(menuOptions)
      .innerJoin(menuCourses, eq(menuCourses.id, menuOptions.courseId))
      .innerJoin(setMenus, eq(setMenus.id, menuCourses.menuId))
      .innerJoin(dishes, eq(dishes.id, menuOptions.dishId))
      .where(liveMenus)
      .orderBy(asc(menuOptions.position)),
    db
      .select({ addon: menuAddons })
      .from(menuAddons)
      .innerJoin(setMenus, eq(setMenus.id, menuAddons.menuId))
      .where(liveMenus),
  ]);
  return { menus, bands, courses, options, addons };
}

export async function loadReviews(
  db: Db,
  chefId: string,
  limit: number,
  after?: { createdAt: number; id: string },
) {
  return db
    .select({ review: reviews, guestName: users.name, guests: bookings.guests })
    .from(reviews)
    .innerJoin(bookings, eq(bookings.id, reviews.bookingId))
    .innerJoin(users, eq(users.id, bookings.guestId))
    .where(
      and(
        eq(bookings.chefId, chefId),
        eq(reviews.authorSide, 'guest'),
        eq(reviews.isPrivate, false),
        after
          ? or(
              lt(reviews.createdAt, after.createdAt),
              and(eq(reviews.createdAt, after.createdAt), lt(reviews.id, after.id)),
            )
          : undefined,
      ),
    )
    .orderBy(desc(reviews.createdAt), desc(reviews.id))
    .limit(limit + 1);
}
