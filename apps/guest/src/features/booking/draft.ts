import { create } from 'zustand';

export type FoodRule = 'regular' | 'jain' | 'no_onion_garlic';
export type Slot = 'lunch' | 'dinner' | 'late';

export type Kitchen = { gas: boolean; oven: boolean; mixer: boolean; fridge: boolean };

/**
 * One booking draft from G22 → G08 → G09 (docs/screens.md → Known gaps: the mockup
 * screens each kept their own demo state). Prices always come from POST /quotes.
 */
export type Draft = {
  chefId: string | null;
  chefSlug: string | null;
  chefName: string | null;
  menuId: string | null;
  guests: number;
  foodRule: FoodRule;
  /** courseId → optionId; missing courses use the first option. */
  options: Record<string, string>;
  addons: string[];
  groceriesBy: 'chef' | 'guest';
  kitchen: Kitchen;
  date: string | null;
  slot: Slot | null;
};

const FRESH: Omit<Draft, 'chefId' | 'chefSlug' | 'chefName' | 'menuId'> = {
  guests: 6,
  foodRule: 'regular',
  options: {},
  addons: [],
  groceriesBy: 'chef',
  kitchen: { gas: true, oven: true, mixer: true, fridge: true },
  date: null,
  slot: null,
};

type Actions = {
  startMenu: (
    chef: { id: string; slug: string; name: string },
    menuId: string,
    minGuests: number,
  ) => void;
  set: (patch: Partial<Draft>) => void;
  pickOption: (courseId: string, optionId: string) => void;
  toggleAddon: (addonId: string) => void;
};

export const useDraft = create<Draft & Actions>((set, get) => ({
  chefId: null,
  chefSlug: null,
  chefName: null,
  menuId: null,
  ...FRESH,
  startMenu: (chef, menuId, minGuests) => {
    if (get().menuId === menuId) return;
    set({
      ...FRESH,
      guests: Math.max(FRESH.guests, minGuests),
      chefId: chef.id,
      chefSlug: chef.slug,
      chefName: chef.name,
      menuId,
    });
  },
  set: (patch) => set(patch),
  pickOption: (courseId, optionId) =>
    set((d) => ({ options: { ...d.options, [courseId]: optionId } })),
  toggleAddon: (id) =>
    set((d) => ({
      addons: d.addons.includes(id) ? d.addons.filter((a) => a !== id) : [...d.addons, id],
    })),
}));
