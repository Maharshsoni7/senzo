import type { ChefListQuery, Slot } from '@senzo/schemas';
import type { Db } from '../../db';
import { AppError } from '../../lib/errors';
import { distanceKm } from '../../lib/geo';
import { slotStatus } from '../availability/rules';
import { score } from './rank';
import * as repo from './repo';

const encodeCursor = (s: string) => btoa(s).replace(/=+$/, '');
const decodeCursor = (s: string) => {
  try {
    return atob(s);
  } catch {
    throw new AppError('VALIDATION_FAILED', 400, 'Bad cursor', { cursor: ['Bad cursor'] });
  }
};

export async function listChefs(db: Db, q: ChefListQuery, now = Date.now()) {
  const { liveChefs, cuisines, menus, bands, dishNames } = await repo.loadLiveChefs(db);

  const terms = q.q ? [q.q.toLowerCase(), ...(await repo.synonymsOf(db, q.q.toLowerCase()))] : [];
  const wantCuisines = q.cuisine?.map((c) => c.toLowerCase());

  const candidates = liveChefs.flatMap((chef) => {
    const chefCuisineNames = cuisines.filter((c) => c.chefId === chef.id).map((c) => c.cuisine);
    const chefMenus = menus.filter(
      (m) =>
        m.chefId === chef.id &&
        (q.rule !== 'jain' || m.offersJain) &&
        (q.rule !== 'no_onion_garlic' || m.offersNog),
    );
    const prices = chefMenus.flatMap((m) =>
      bands
        .filter((b) => b.menuId === m.id)
        .filter(
          (b) => q.guests === undefined || (q.guests >= b.minGuests && q.guests <= b.maxGuests),
        )
        .map((b) => b.pricePerGuestPaise),
    );
    if (prices.length === 0) return [];
    if (q.guests !== undefined && chef.maxGuests !== null && q.guests > chef.maxGuests) return [];

    if (wantCuisines && !chefCuisineNames.some((c) => wantCuisines.includes(c.toLowerCase()))) {
      return [];
    }
    if (terms.length > 0) {
      const haystack = [
        chef.displayName,
        chef.headline ?? '',
        ...chefCuisineNames,
        ...dishNames.filter((d) => d.chefId === chef.id).map((d) => d.name),
      ]
        .join(' ')
        .toLowerCase();
      if (!terms.some((t) => haystack.includes(t))) return [];
    }

    let distance: number | null = null;
    if (
      q.lat !== undefined &&
      q.lng !== undefined &&
      chef.baseLat !== null &&
      chef.baseLng !== null
    ) {
      distance = distanceKm(q.lat, q.lng, chef.baseLat, chef.baseLng);
      if (chef.serviceRadiusKm !== null && distance > chef.serviceRadiusKm) return [];
    }

    return [
      {
        chef,
        card: {
          id: chef.id,
          slug: chef.slug,
          displayName: chef.displayName,
          headline: chef.headline,
          cuisines: chefCuisineNames,
          ratingAvg: chef.ratingAvg,
          ratingCount: chef.ratingCount,
          fromPricePaise: Math.min(...prices),
          distanceKm: distance === null ? null : Math.round(distance * 10) / 10,
          offersJain: chefMenus.some((m) => m.offersJain),
        },
      },
    ];
  });

  const available =
    q.date && q.slot
      ? await openOn(
          db,
          candidates.map((c) => c.chef.id),
          q.date,
          q.slot,
          now,
        )
      : null;

  const ranked = candidates
    .filter((c) => available === null || available.has(c.chef.id))
    .map((c) => ({ ...c, score: score({ ...c.chef, distanceKm: c.card.distanceKm }) }))
    .sort((a, b) => b.score - a.score || a.chef.id.localeCompare(b.chef.id));

  const offset = q.cursor ? Number(decodeCursor(q.cursor)) || 0 : 0;
  const page = ranked.slice(offset, offset + q.limit);
  const next = offset + q.limit < ranked.length ? encodeCursor(String(offset + q.limit)) : null;
  return { items: page.map((c) => c.card), nextCursor: next };
}

async function openOn(db: Db, chefIds: string[], date: string, slot: Slot, now: number) {
  const { weekly, overrides, held } = await repo.loadSlotInputs(db, chefIds, date, now);
  return new Set(
    chefIds.filter(
      (id) =>
        slotStatus(date, slot, {
          chefLive: true,
          weekly: new Map(weekly.filter((w) => w.chefId === id).map((w) => [w.weekday, w.slots])),
          overrides: new Map(
            overrides.filter((o) => o.chefId === id).map((o) => [`${o.date}:${o.slot}`, o.state]),
          ),
          busy: new Set(held.filter((h) => h.chefId === id).map((h) => `${date}:${h.slot}`)),
          now,
        }) === 'open',
    ),
  );
}

export async function chefProfile(db: Db, slug: string) {
  const p = await repo.loadProfile(db, slug);
  if (!p) throw new AppError('NOT_FOUND', 404, 'Chef not found');
  const { chef } = p;
  return {
    id: chef.id,
    slug: chef.slug,
    displayName: chef.displayName,
    headline: chef.headline,
    bio: chef.bio,
    yearsCooking: chef.yearsCooking,
    jobsDone: chef.jobsDone,
    maxGuests: chef.maxGuests,
    hasHelper: chef.hasHelper,
    cuisines: p.cuisines.map(({ cuisine, level }) => ({ cuisine, level })),
    foodRules: p.rules.map((r) => r.rule),
    occasions: p.occasions.map((o) => o.occasion),
    proofs: p.proofs.map(({ kind, title, detail }) => ({ kind, title, detail })),
    reviews: { ratingAvg: chef.ratingAvg, ratingCount: chef.ratingCount },
  };
}

export async function chefMenus(db: Db, chefId: string) {
  if (!(await repo.isLiveChef(db, chefId))) throw new AppError('NOT_FOUND', 404, 'Chef not found');
  const { menus, bands, courses, options, addons } = await repo.loadMenus(db, chefId);
  return {
    items: menus.map((m) => ({
      id: m.id,
      name: m.name,
      summary: m.summary,
      kind: m.kind,
      minBookingPaise: m.minBookingPaise,
      grocerySavingPaise: m.grocerySavingPaise,
      offersJain: m.offersJain,
      offersNog: m.offersNog,
      bands: bands
        .filter(({ band }) => band.menuId === m.id)
        .map(({ band: { minGuests, maxGuests, pricePerGuestPaise } }) => ({
          minGuests,
          maxGuests,
          pricePerGuestPaise,
        })),
      courses: courses
        .filter(({ course }) => course.menuId === m.id)
        .map(({ course }) => ({
          id: course.id,
          name: course.name,
          options: options
            .filter(({ option }) => option.courseId === course.id)
            .map(({ option, dishName }) => ({
              id: option.id,
              dishName,
              extraPaise: option.extraPaise,
              jainFlag: option.jainFlag,
              needsOven: option.needsOven,
              ovenAltText: option.ovenAltText,
            })),
        })),
      addons: addons
        .filter(({ addon }) => addon.menuId === m.id)
        .map(({ addon: { id, name, pricePerGuestPaise, note } }) => ({
          id,
          name,
          pricePerGuestPaise,
          note,
        })),
    })),
  };
}

/** "Rahul Desai" → "Rahul D." */
export function shortName(name: string | null) {
  const [first, last] = (name ?? '').trim().split(/\s+/);
  if (!first) return 'Guest';
  return last ? `${first} ${last[0]!.toUpperCase()}.` : first;
}

export async function chefReviews(db: Db, chefId: string, limit: number, cursor?: string) {
  if (!(await repo.isLiveChef(db, chefId))) throw new AppError('NOT_FOUND', 404, 'Chef not found');
  let after: { createdAt: number; id: string } | undefined;
  if (cursor) {
    const [createdAt, id] = decodeCursor(cursor).split('|');
    if (!createdAt || !id) throw new AppError('VALIDATION_FAILED', 400, 'Bad cursor');
    after = { createdAt: Number(createdAt), id };
  }
  const rows = await repo.loadReviews(db, chefId, limit, after);
  const page = rows.slice(0, limit);
  const last = page.at(-1);
  return {
    items: page.map(({ review, guestName, guests }) => ({
      id: review.id,
      author: shortName(guestName),
      stars: review.stars,
      text: review.text,
      tags: review.tags,
      guests,
      createdAt: new Date(review.createdAt).toISOString(),
    })),
    nextCursor:
      rows.length > limit && last
        ? encodeCursor(`${last.review.createdAt}|${last.review.id}`)
        : null,
  };
}
