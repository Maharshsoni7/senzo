import { useDraft } from './draft';

const ananya = { id: 'chef_ananya', slug: 'ananya-mehta', name: 'Ananya Mehta' };

describe('booking draft', () => {
  beforeEach(() => useDraft.getState().startMenu(ananya, 'menu_reset', 2));

  it('starts a fresh draft for a new menu, at least the menu minimum', () => {
    useDraft.getState().set({ guests: 9, addons: ['a1'] });
    useDraft.getState().startMenu(ananya, 'menu_festive_thali', 8);
    expect(useDraft.getState()).toMatchObject({
      menuId: 'menu_festive_thali',
      guests: 8,
      addons: [],
    });
  });

  it('keeps choices when the same menu is opened again', () => {
    useDraft.getState().startMenu(ananya, 'menu_gujarati_classic', 2);
    useDraft.getState().set({ guests: 9 });
    useDraft.getState().startMenu(ananya, 'menu_gujarati_classic', 2);
    expect(useDraft.getState().guests).toBe(9);
  });

  it('keeps one dish per course and toggles add-ons', () => {
    const d = useDraft.getState();
    d.pickOption('course_starter', 'opt_dhokla');
    d.pickOption('course_starter', 'opt_paneer');
    d.toggleAddon('addon_jalebi');
    d.toggleAddon('addon_chaas');
    d.toggleAddon('addon_jalebi');
    expect(useDraft.getState()).toMatchObject({
      options: { course_starter: 'opt_paneer' },
      addons: ['addon_chaas'],
    });
  });
});
