import { percentOf, type FoodRule, type GroceriesBy, type JainFlag } from '@senzo/schemas';
import { FEES } from '../../config/fees';
import { AppError } from '../../lib/errors';

export type MenuForQuote = {
  id: string;
  chefId: string;
  bookable: boolean;
  chefMaxGuests: number | null;
  minBookingPaise: number;
  grocerySavingPaise: number;
  offersJain: boolean;
  offersNog: boolean;
  bands: { minGuests: number; maxGuests: number; pricePerGuestPaise: number }[];
  courses: {
    id: string;
    name: string;
    position: number;
    options: {
      id: string;
      dishName: string;
      extraPaise: number;
      jainFlag: JainFlag;
      needsOven: boolean;
      ovenAltText: string | null;
      position: number;
    }[];
  }[];
  addons: { id: string; name: string; pricePerGuestPaise: number }[];
};

export type PromoForQuote = {
  code: string;
  kind: 'flat' | 'percent';
  amountPaise: number | null;
  percentBps: number | null;
};

export type QuoteInput = {
  guests: number;
  foodRule: FoodRule;
  optionIds: string[];
  addonIds: string[];
  groceriesBy: GroceriesBy;
  kitchen: { gas: boolean; oven: boolean };
  promo?: PromoForQuote | null;
};

export type QuoteWarning = {
  code: 'JAIN_SWAPPED' | 'NO_OVEN_ALTERNATIVE' | 'INDUCTION_ADDED' | 'BELOW_CHEF_MINIMUM';
  message: string;
};

export type QuoteItem = {
  course: string;
  optionId: string;
  dishName: string;
  extraPaise: number;
  jainVersion: boolean;
  servedAs: string | null;
  swappedFrom: string | null;
};

export function priceQuote(menu: MenuForQuote, input: QuoteInput) {
  if (!menu.bookable) throw new AppError('NOT_FOUND', 404, 'Menu is not available');
  if (
    (input.foodRule === 'jain' && !menu.offersJain) ||
    (input.foodRule === 'no_onion_garlic' && !menu.offersNog)
  ) {
    throw new AppError('FOOD_RULE_UNAVAILABLE', 422, 'This menu is not offered for that food rule');
  }

  const { guests } = input;
  const band = menu.bands.find((b) => guests >= b.minGuests && guests <= b.maxGuests);
  if (!band || (menu.chefMaxGuests !== null && guests > menu.chefMaxGuests)) {
    throw new AppError('GUESTS_OUT_OF_RANGE', 422, guestRange(menu));
  }

  const warnings: QuoteWarning[] = [];
  const items = pickDishes(menu, input, warnings);
  const addons = pickAddons(menu, input.addonIds);

  const groceriesSavingPerGuestPaise = input.groceriesBy === 'guest' ? menu.grocerySavingPaise : 0;
  const perGuestPaise =
    band.pricePerGuestPaise +
    sum(items.map((i) => i.extraPaise)) +
    sum(addons.map((a) => a.pricePerGuestPaise)) -
    groceriesSavingPerGuestPaise;

  const oneOffs: { kind: 'induction'; amountPaise: number }[] = [];
  if (!input.kitchen.gas) {
    oneOffs.push({ kind: 'induction', amountPaise: FEES.inductionPaise });
    warnings.push({
      code: 'INDUCTION_ADDED',
      message: 'No gas or induction: the chef brings an induction (one-off charge)',
    });
  }

  const menuTotalPaise = perGuestPaise * guests + sum(oneOffs.map((o) => o.amountPaise));
  const meetsMinimum = menuTotalPaise >= menu.minBookingPaise;
  if (!meetsMinimum) {
    warnings.push({
      code: 'BELOW_CHEF_MINIMUM',
      message: 'Below the chef’s minimum booking; add guests or dishes',
    });
  }

  const convenienceFeePaise = FEES.convenienceFeePaise;
  const rawFeeGst = percentOf(convenienceFeePaise, FEES.convenienceFeeGstBps);
  const convenienceFeeGstPaise = FEES.roundConvenienceGstToRupee
    ? Math.round(rawFeeGst / 100) * 100
    : rawFeeGst;

  const beforePromo = menuTotalPaise + convenienceFeePaise + convenienceFeeGstPaise;
  const promoPaise = input.promo
    ? Math.min(promoDiscount(input.promo, menuTotalPaise), beforePromo)
    : 0;

  const platformFeePaise = percentOf(menuTotalPaise, FEES.platformFeeBps);
  const platformFeeGstPaise = percentOf(platformFeePaise, FEES.platformFeeGstBps);

  return {
    menuId: menu.id,
    chefId: menu.chefId,
    guests,
    foodRule: input.foodRule,
    groceriesBy: input.groceriesBy,
    band,
    items,
    addons,
    perGuestPaise,
    groceriesSavingPerGuestPaise,
    oneOffs,
    menuTotalPaise,
    minimumPaise: menu.minBookingPaise,
    bookable: meetsMinimum,
    convenienceFeePaise,
    convenienceFeeGstPaise,
    promo: input.promo ? { code: input.promo.code, discountPaise: promoPaise } : null,
    totalPaise: beforePromo - promoPaise,
    warnings,
    chef: {
      platformFeePaise,
      platformFeeGstPaise,
      earningsPaise: menuTotalPaise - platformFeePaise - platformFeeGstPaise,
    },
  };
}

export type Quote = ReturnType<typeof priceQuote>;

function pickDishes(menu: MenuForQuote, input: QuoteInput, warnings: QuoteWarning[]) {
  const courseOf = new Map<string, MenuForQuote['courses'][number]>();
  for (const course of menu.courses) for (const o of course.options) courseOf.set(o.id, course);

  const picked = new Map<string, string>();
  for (const id of input.optionIds) {
    const course = courseOf.get(id);
    if (!course) throw invalid('optionIds', `Option ${id} is not on this menu`);
    if (picked.has(course.id)) throw invalid('optionIds', `Pick one dish for ${course.name}`);
    picked.set(course.id, id);
  }

  const jain = input.foodRule === 'jain';
  return [...menu.courses]
    .sort((a, b) => a.position - b.position)
    .map((course): QuoteItem => {
      const options = [...course.options].sort((a, b) => a.position - b.position);
      let option = options.find((o) => o.id === picked.get(course.id)) ?? options[0];
      if (!option) throw new AppError('INTERNAL', 500, `Course ${course.id} has no options`);

      let swappedFrom: string | null = null;
      if (jain && option.jainFlag === 'not_jain') {
        const safe = options.find((o) => o.jainFlag !== 'not_jain');
        if (!safe) {
          throw new AppError('FOOD_RULE_UNAVAILABLE', 422, `${course.name} has no Jain dish`);
        }
        swappedFrom = option.dishName;
        warnings.push({
          code: 'JAIN_SWAPPED',
          message: `${option.dishName} can’t be made Jain; swapped for ${safe.dishName}`,
        });
        option = safe;
      }

      let servedAs: string | null = null;
      if (option.needsOven && !input.kitchen.oven) {
        servedAs = option.ovenAltText;
        warnings.push({
          code: 'NO_OVEN_ALTERNATIVE',
          message: `No oven: ${option.dishName} — ${option.ovenAltText ?? 'served another way'}`,
        });
      }

      return {
        course: course.name,
        optionId: option.id,
        dishName: option.dishName,
        extraPaise: option.extraPaise,
        jainVersion: jain && option.jainFlag === 'jain_version',
        servedAs,
        swappedFrom,
      };
    });
}

function pickAddons(menu: MenuForQuote, addonIds: string[]) {
  const byId = new Map(menu.addons.map((a) => [a.id, a]));
  return [...new Set(addonIds)].map((id) => {
    const addon = byId.get(id);
    if (!addon) throw invalid('addonIds', `Add-on ${id} is not on this menu`);
    return addon;
  });
}

function promoDiscount(promo: PromoForQuote, menuTotalPaise: number) {
  return promo.kind === 'flat'
    ? (promo.amountPaise ?? 0)
    : percentOf(menuTotalPaise, promo.percentBps ?? 0);
}

function guestRange(menu: MenuForQuote) {
  const min = Math.min(...menu.bands.map((b) => b.minGuests));
  const max = Math.min(
    Math.max(...menu.bands.map((b) => b.maxGuests)),
    menu.chefMaxGuests ?? Infinity,
  );
  return `This menu is for ${min}–${max} guests`;
}

const invalid = (field: string, message: string) =>
  new AppError('VALIDATION_FAILED', 400, message, { [field]: [message] });

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
