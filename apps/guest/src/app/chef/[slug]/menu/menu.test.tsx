import { createQuote, getChefMenus, type ChefMenus, type Quote } from '@senzo/api-client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react-native';
import { useDraft } from '../../../../features/booking/draft';
import MenuDetail from './[menuId]';

jest.mock('@senzo/api-client', () => ({
  ...jest.requireActual('@senzo/api-client'),
  getChefMenus: jest.fn(),
  createQuote: jest.fn(),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({ slug: 'ananya-mehta', menuId: 'menu_gc' }),
}));

const menus: ChefMenus = {
  items: [
    {
      id: 'menu_gc',
      name: 'Gujarati Classic',
      summary: null,
      kind: 'event',
      minBookingPaise: 400_000,
      grocerySavingPaise: 25_000,
      offersJain: true,
      offersNog: true,
      bands: [{ minGuests: 2, maxGuests: 20, pricePerGuestPaise: 180_000 }],
      courses: [],
      addons: [],
    },
  ],
};

const quote = (over: Partial<Quote>): Quote => ({
  menuId: 'menu_gc',
  chefId: 'chef_ananya',
  guests: 6,
  foodRule: 'regular',
  groceriesBy: 'chef',
  band: { minGuests: 2, maxGuests: 20, pricePerGuestPaise: 180_000 },
  items: [],
  addons: [],
  perGuestPaise: 180_000,
  groceriesSavingPerGuestPaise: 0,
  oneOffs: [],
  menuTotalPaise: 1_080_000,
  minimumPaise: 400_000,
  bookable: true,
  convenienceFeePaise: 14_900,
  convenienceFeeGstPaise: 2_700,
  promo: null,
  totalPaise: 1_097_600,
  warnings: [],
  ...over,
});

async function renderMenu() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return await render(
    <QueryClientProvider client={client}>
      <MenuDetail />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  jest.mocked(getChefMenus).mockResolvedValue(menus);
  useDraft
    .getState()
    .startMenu(
      { id: 'chef_ananya', slug: 'ananya-mehta', name: 'Ananya Mehta' },
      `m${Math.random()}`,
      2,
    );
  useDraft.setState({ menuId: 'menu_gc' });
});

describe('Menu detail (G22)', () => {
  it('shows the server price and lets the guest pick a date', async () => {
    jest.mocked(createQuote).mockResolvedValue(quote({}));
    await renderMenu();
    expect(await screen.findByText('₹1,800 per guest', {}, { timeout: 5000 })).toBeTruthy();
    expect(screen.getByText('Total ₹10,976')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Pick date' })).toBeEnabled();
  });

  it('blocks "Pick date" below the chef minimum and says why', async () => {
    jest.mocked(createQuote).mockResolvedValue(
      quote({
        bookable: false,
        menuTotalPaise: 390_000,
        warnings: [{ code: 'BELOW_CHEF_MINIMUM', message: 'below' }],
      }),
    );
    await renderMenu();
    expect(await screen.findByText("Chef's minimum is ₹4,000 — add guests or dishes")).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Pick date' })).toBeDisabled();
  });
});
