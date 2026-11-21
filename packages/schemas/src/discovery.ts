import { z } from 'zod';
import { CuisineLevel, FoodRule, JainFlag, MenuKind, ProofKind, Slot } from './enums';
import { Paise } from './money';

const csvOrArray = z
  .union([z.string(), z.array(z.string())])
  .transform((v) => (Array.isArray(v) ? v : v.split(',')).map((s) => s.trim()).filter(Boolean));

export const ChefListQuery = z
  .object({
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
    q: z.string().trim().max(60).optional(),
    rule: FoodRule.exclude(['regular']).optional(),
    cuisine: csvOrArray.optional(),
    guests: z.coerce.number().int().min(1).max(100).optional(),
    date: z.iso.date().optional(),
    slot: Slot.optional(),
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .refine((v) => (v.lat === undefined) === (v.lng === undefined), {
    message: 'Send lat and lng together',
    path: ['lat'],
  })
  .refine((v) => (v.date === undefined) === (v.slot === undefined), {
    message: 'Send date and slot together',
    path: ['date'],
  });
export type ChefListQuery = z.infer<typeof ChefListQuery>;

export const ChefCard = z
  .object({
    id: z.string(),
    slug: z.string(),
    displayName: z.string(),
    headline: z.string().nullable(),
    cuisines: z.array(z.string()),
    ratingAvg: z.number().nullable(),
    ratingCount: z.number().int(),
    /** Lowest per-guest band price (for `guests` if given) across live menus. */
    fromPricePaise: Paise,
    distanceKm: z.number().nullable(),
    offersJain: z.boolean(),
  })
  .meta({ id: 'ChefCard' });

export const ChefList = z
  .object({ items: z.array(ChefCard), nextCursor: z.string().nullable() })
  .meta({ id: 'ChefList' });

export const ChefProfile = z
  .object({
    id: z.string(),
    slug: z.string(),
    displayName: z.string(),
    headline: z.string().nullable(),
    bio: z.string().nullable(),
    yearsCooking: z.number().int().nullable(),
    jobsDone: z.number().int(),
    maxGuests: z.number().int().nullable(),
    hasHelper: z.boolean(),
    cuisines: z.array(z.object({ cuisine: z.string(), level: CuisineLevel })),
    foodRules: z.array(z.string()),
    occasions: z.array(z.string()),
    /** Verified proofs only; unverified ones are never shown (E2). */
    proofs: z.array(
      z.object({ kind: ProofKind, title: z.string(), detail: z.string().nullable() }),
    ),
    /** Signature dishes that passed ops review. */
    specialties: z.array(
      z.object({ name: z.string(), course: z.string(), description: z.string().nullable() }),
    ),
    reviews: z.object({
      ratingAvg: z.number().nullable(),
      ratingCount: z.number().int(),
    }),
  })
  .meta({ id: 'ChefProfile' });

export const ChefMenu = z
  .object({
    id: z.string(),
    name: z.string(),
    summary: z.string().nullable(),
    kind: MenuKind,
    minBookingPaise: Paise,
    grocerySavingPaise: Paise,
    offersJain: z.boolean(),
    offersNog: z.boolean(),
    bands: z.array(
      z.object({
        minGuests: z.number().int(),
        maxGuests: z.number().int(),
        pricePerGuestPaise: Paise,
      }),
    ),
    courses: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        options: z.array(
          z.object({
            id: z.string(),
            dishName: z.string(),
            extraPaise: Paise,
            jainFlag: JainFlag,
            needsOven: z.boolean(),
            ovenAltText: z.string().nullable(),
          }),
        ),
      }),
    ),
    addons: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        pricePerGuestPaise: Paise,
        note: z.string().nullable(),
      }),
    ),
  })
  .meta({ id: 'ChefMenu' });

export const ChefMenus = z.object({ items: z.array(ChefMenu) }).meta({ id: 'ChefMenus' });

export const ChefReview = z
  .object({
    id: z.string(),
    /** "Rahul D." — first name and initial only. */
    author: z.string(),
    stars: z.number().int(),
    text: z.string().nullable(),
    tags: z.array(z.string()),
    guests: z.number().int(),
    createdAt: z.iso.datetime(),
  })
  .meta({ id: 'ChefReview' });

export const ChefReviews = z
  .object({ items: z.array(ChefReview), nextCursor: z.string().nullable() })
  .meta({ id: 'ChefReviews' });
