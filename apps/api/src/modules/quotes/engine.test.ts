import { describe, expect, it } from 'vitest';
import * as seed from '../../../seed/data';
import { priceQuote, type MenuForQuote, type QuoteInput } from './engine';

// Gujarati Classic from the seed (G22 mockup).
const menu: MenuForQuote = {
  id: 'menu_gujarati_classic',
  chefId: 'chef_ananya',
  bookable: true,
  chefMaxGuests: 40,
  minBookingPaise: 400_000,
  grocerySavingPaise: 25_000,
  offersJain: true,
  offersNog: true,
  bands: seed.menuBands.filter((b) => b.menuId === 'menu_gujarati_classic'),
  courses: seed.menuCourses.map((c) => ({
    id: c.id!,
    name: c.name,
    position: c.position,
    options: seed.menuOptions
      .filter((o) => o.courseId === c.id)
      .map((o) => ({
        id: o.id!,
        dishName: seed.dishes.find((d) => d.id === o.dishId)!.name,
        extraPaise: o.extraPaise ?? 0,
        jainFlag: o.jainFlag ?? 'ok',
        needsOven: o.needsOven ?? false,
        ovenAltText: o.ovenAltText ?? null,
        position: o.position,
      })),
  })),
  addons: seed.menuAddons.map((a) => ({
    id: a.id!,
    name: a.name,
    pricePerGuestPaise: a.pricePerGuestPaise,
  })),
};

const base: QuoteInput = {
  guests: 6,
  foodRule: 'regular',
  optionIds: [],
  addonIds: [],
  groceriesBy: 'chef',
  kitchen: { gas: true, oven: true },
};
const quote = (over: Partial<QuoteInput> = {}) => priceQuote(menu, { ...base, ...over });

describe('priceQuote', () => {
  it('reproduces SZ-1042: 6 guests, defaults, guest pays ₹10,976', () => {
    const q = quote();
    expect(q.perGuestPaise).toBe(180_000);
    expect(q.menuTotalPaise).toBe(1_080_000);
    expect(q.convenienceFeePaise).toBe(14_900);
    expect(q.convenienceFeeGstPaise).toBe(2_700);
    expect(q.totalPaise).toBe(1_097_600);
    expect(q.bookable).toBe(true);
    expect(q.items.map((i) => i.dishName)).toEqual([
      'Khandvi Tacos',
      'Patra',
      'Deconstructed Undhiyu',
      'Gujarati Dal',
      'Phulka & Jeera Rice',
      'Kesar Shrikhand Tart',
    ]);
  });

  it('takes 15% platform fee plus 18% GST on it from the chef (Q2 default)', () => {
    expect(quote().chef).toEqual({
      platformFeePaise: 162_000,
      platformFeeGstPaise: 29_160,
      earningsPaise: 888_840,
    });
  });

  it.each([
    [2, 220_000],
    [4, 220_000],
    [5, 180_000],
    [10, 180_000],
    [11, 150_000],
    [20, 150_000],
  ])('prices %i guests from the right band', (guests, perGuest) => {
    expect(quote({ guests }).perGuestPaise).toBe(perGuest);
  });

  it.each([1, 21])('rejects %i guests outside every band', (guests) => {
    expect(() => quote({ guests })).toThrow(
      expect.objectContaining({ code: 'GUESTS_OUT_OF_RANGE' }),
    );
  });

  it('caps guests at the chef’s capacity', () => {
    expect(() => priceQuote({ ...menu, chefMaxGuests: 8 }, { ...base, guests: 10 })).toThrow(
      expect.objectContaining({
        code: 'GUESTS_OUT_OF_RANGE',
        detail: 'This menu is for 2–8 guests',
      }),
    );
  });

  it('adds dish upgrades and add-ons per guest', () => {
    const q = quote({
      optionIds: ['opt_gc_paneer_tikka', 'opt_gc_mango_rasmalai'],
      addonIds: ['addon_gc_live_jalebi', 'addon_gc_live_jalebi'],
    });
    expect(q.perGuestPaise).toBe(180_000 + 15_000 + 10_000 + 12_000);
    expect(q.addons).toHaveLength(1);
  });

  it('takes the grocery saving off when the guest buys', () => {
    const q = quote({ groceriesBy: 'guest' });
    expect(q.groceriesSavingPerGuestPaise).toBe(25_000);
    expect(q.perGuestPaise).toBe(155_000);
  });

  it('is not bookable below the chef minimum, but still prices', () => {
    expect(quote({ guests: 2 }).bookable).toBe(true);
    const q = quote({ guests: 2, groceriesBy: 'guest' });
    expect(q.menuTotalPaise).toBe(390_000);
    expect(q.bookable).toBe(false);
    expect(q.warnings.map((w) => w.code)).toContain('BELOW_CHEF_MINIMUM');
  });

  it('swaps not-Jain dishes for the first Jain-safe option in Jain mode', () => {
    const q = quote({ foodRule: 'jain', optionIds: ['opt_gc_batata_vada'] });
    const starter2 = q.items.find((i) => i.course === 'Starter 2')!;
    expect(starter2).toMatchObject({ dishName: 'Patra', swappedFrom: 'Batata Vada' });
    expect(q.warnings.map((w) => w.code)).toEqual(['JAIN_SWAPPED']);
    expect(q.perGuestPaise).toBe(quote().perGuestPaise);
  });

  it('keeps not-Jain dishes outside Jain mode and marks Jain versions', () => {
    expect(quote({ optionIds: ['opt_gc_batata_vada'] }).items[1]!.dishName).toBe('Batata Vada');
    const undhiyu = quote({ foodRule: 'jain' }).items.find((i) => i.course === 'Main 1')!;
    expect(undhiyu.jainVersion).toBe(true);
  });

  it('serves oven dishes another way when there is no oven', () => {
    const tart = quote({ kitchen: { gas: true, oven: false } }).items.at(-1)!;
    expect(tart.servedAs).toBe('Served as shrikhand cups');
  });

  it('adds a one-off induction when there is no gas', () => {
    const q = quote({ kitchen: { gas: false, oven: true } });
    expect(q.oneOffs).toEqual([{ kind: 'induction', amountPaise: 20_000 }]);
    expect(q.menuTotalPaise).toBe(1_080_000 + 20_000);
  });

  it('applies a flat promo to what the guest pays, not to the chef', () => {
    const q = quote({
      promo: { code: 'FIRSTFEAST', kind: 'flat', amountPaise: 50_000, percentBps: null },
    });
    expect(q.promo).toEqual({ code: 'FIRSTFEAST', discountPaise: 50_000 });
    expect(q.totalPaise).toBe(1_047_600);
    expect(q.chef.earningsPaise).toBe(888_840);
  });

  it('rejects options from another menu or two dishes for one course', () => {
    expect(() => quote({ optionIds: ['opt_other'] })).toThrow(
      expect.objectContaining({ code: 'VALIDATION_FAILED' }),
    );
    expect(() => quote({ optionIds: ['opt_gc_dhokla', 'opt_gc_khandvi_tacos'] })).toThrow(
      expect.objectContaining({ code: 'VALIDATION_FAILED' }),
    );
  });

  it('refuses a food rule the menu does not offer', () => {
    expect(() =>
      priceQuote({ ...menu, offersNog: false }, { ...base, foodRule: 'no_onion_garlic' }),
    ).toThrow(expect.objectContaining({ code: 'FOOD_RULE_UNAVAILABLE' }));
  });
});
