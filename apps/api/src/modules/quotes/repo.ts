import { and, eq, gte, lte } from 'drizzle-orm';
import type { Db } from '../../db';
import {
  chefs,
  dishes,
  menuAddons,
  menuBands,
  menuCourses,
  menuOptions,
  promoCodes,
  setMenus,
} from '../../db/schema';
import type { MenuForQuote, PromoForQuote } from './engine';

export async function loadMenuForQuote(db: Db, menuId: string): Promise<MenuForQuote | null> {
  const [[head], bands, courses, options, addons] = await db.batch([
    db
      .select({ menu: setMenus, chefStatus: chefs.status, chefMaxGuests: chefs.maxGuests })
      .from(setMenus)
      .innerJoin(chefs, eq(chefs.id, setMenus.chefId))
      .where(eq(setMenus.id, menuId)),
    db.select().from(menuBands).where(eq(menuBands.menuId, menuId)),
    db.select().from(menuCourses).where(eq(menuCourses.menuId, menuId)),
    db
      .select({ option: menuOptions, dishName: dishes.name })
      .from(menuOptions)
      .innerJoin(menuCourses, eq(menuCourses.id, menuOptions.courseId))
      .innerJoin(dishes, eq(dishes.id, menuOptions.dishId))
      .where(eq(menuCourses.menuId, menuId)),
    db.select().from(menuAddons).where(eq(menuAddons.menuId, menuId)),
  ]);
  if (!head) return null;

  const { menu } = head;
  return {
    id: menu.id,
    chefId: menu.chefId,
    bookable: menu.isLive && head.chefStatus === 'live',
    chefMaxGuests: head.chefMaxGuests,
    minBookingPaise: menu.minBookingPaise,
    grocerySavingPaise: menu.grocerySavingPaise,
    offersJain: menu.offersJain,
    offersNog: menu.offersNog,
    bands,
    courses: courses.map((c) => ({
      id: c.id,
      name: c.name,
      position: c.position,
      options: options
        .filter(({ option }) => option.courseId === c.id)
        .map(({ option, dishName }) => ({ ...option, dishName })),
    })),
    addons,
  };
}

export async function findActivePromo(
  db: Db,
  code: string,
  now: number,
): Promise<PromoForQuote | null> {
  const promo = await db
    .select()
    .from(promoCodes)
    .where(
      and(eq(promoCodes.code, code), lte(promoCodes.validFrom, now), gte(promoCodes.validTo, now)),
    )
    .get();
  return promo ?? null;
}
