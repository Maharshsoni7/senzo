import { z } from 'zod';
import { FoodRule, GroceriesBy, Slot } from './enums';
import { Paise } from './money';

export const QuoteRequest = z
  .object({
    menuId: z.string().min(1),
    guests: z.number().int().min(1).max(100),
    foodRule: FoodRule.default('regular'),
    /** One option per course; courses left out get their first option. */
    options: z.array(z.string()).max(20).default([]),
    addons: z.array(z.string()).max(20).default([]),
    groceriesBy: GroceriesBy.default('chef'),
    kitchen: z
      .object({
        gas: z.boolean().default(true),
        oven: z.boolean().default(true),
        mixer: z.boolean().default(true),
        fridge: z.boolean().default(true),
      })
      .default({ gas: true, oven: true, mixer: true, fridge: true }),
    date: z.iso.date().optional(),
    slot: Slot.optional(),
    promo: z.string().trim().toUpperCase().min(1).optional(),
  })
  .meta({ id: 'QuoteRequest' });
export type QuoteRequest = z.infer<typeof QuoteRequest>;

export const QuoteWarningCode = z.enum([
  'JAIN_SWAPPED',
  'NO_OVEN_ALTERNATIVE',
  'INDUCTION_ADDED',
  'BELOW_CHEF_MINIMUM',
]);

export const Quote = z
  .object({
    menuId: z.string(),
    chefId: z.string(),
    guests: z.number().int(),
    foodRule: FoodRule,
    groceriesBy: GroceriesBy,
    band: z.object({
      minGuests: z.number().int(),
      maxGuests: z.number().int(),
      pricePerGuestPaise: Paise,
    }),
    items: z.array(
      z.object({
        course: z.string(),
        optionId: z.string(),
        dishName: z.string(),
        extraPaise: Paise,
        jainVersion: z.boolean(),
        servedAs: z.string().nullable(),
        swappedFrom: z.string().nullable(),
      }),
    ),
    addons: z.array(z.object({ id: z.string(), name: z.string(), pricePerGuestPaise: Paise })),
    perGuestPaise: Paise,
    groceriesSavingPerGuestPaise: Paise,
    oneOffs: z.array(z.object({ kind: z.literal('induction'), amountPaise: Paise })),
    menuTotalPaise: Paise,
    minimumPaise: Paise,
    /** False below the chef minimum; the app disables "Pick date". */
    bookable: z.boolean(),
    convenienceFeePaise: Paise,
    convenienceFeeGstPaise: Paise,
    promo: z.object({ code: z.string(), discountPaise: Paise }).nullable(),
    totalPaise: Paise,
    warnings: z.array(z.object({ code: QuoteWarningCode, message: z.string() })),
  })
  .meta({ id: 'Quote' });
export type Quote = z.infer<typeof Quote>;
