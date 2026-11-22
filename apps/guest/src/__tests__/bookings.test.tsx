import {
  getMyBooking,
  listMyBookings,
  type BookingDetail,
  type BookingSummary,
} from '@senzo/api-client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import Bookings from '../app/(tabs)/bookings';
import LiveBooking from '../app/booking/[id]/index';
import { stageOf, timeLabel } from '../features/bookings/stage';

jest.mock('@senzo/api-client', () => ({
  ...jest.requireActual('@senzo/api-client'),
  listMyBookings: jest.fn(),
  getMyBooking: jest.fn(),
}));
jest.mock('../lib/useOnline', () => ({ useOnline: () => true }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), navigate: jest.fn() },
  useLocalSearchParams: () => ({ id: 'bk_sz1051' }),
}));

const summary = (over: Partial<BookingSummary>): BookingSummary => ({
  id: 'bk_sz1051',
  code: 'SZ-1051',
  state: 'confirmed',
  subStatus: null,
  date: '2026-12-19',
  slot: 'dinner',
  startsAt: '2026-12-19T14:00:00.000Z',
  guests: 6,
  chef: { id: 'chef_ananya', slug: 'ananya-mehta', displayName: 'Ananya Mehta' },
  menuName: 'Gujarati Classic',
  totalPaise: 1_097_600,
  otp: { kind: 'start', code: '4821' },
  ...over,
});

const detail = (over: Partial<BookingDetail>): BookingDetail => ({
  ...summary({}),
  foodRule: 'regular',
  groceriesBy: 'chef',
  etaMinutes: null,
  onTheWayAt: null,
  startedAt: null,
  doneAt: null,
  completedAt: null,
  cancelledBy: null,
  address: { label: 'home', line1: 'Prahlad Nagar', area: 'Prahlad Nagar' },
  items: [{ course: 'Main 1', dishName: 'Deconstructed Undhiyu' }],
  price: {
    menuTotalPaise: 1_080_000,
    convenienceFeePaise: 14_900,
    feeGstPaise: 2_700,
    promoPaise: 0,
    walletPaise: 0,
    totalPaise: 1_097_600,
  },
  ...over,
});

async function renderWithQuery(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  return await render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('My bookings (G11)', () => {
  it('shows the start code on a confirmed booking and the refund on a declined one', async () => {
    jest.mocked(listMyBookings).mockImplementation(async (params) =>
      params?.scope === 'past'
        ? {
            items: [summary({ id: 'bk_sz1042', code: 'SZ-1042', state: 'paid_out', otp: null })],
            nextCursor: null,
          }
        : {
            items: [
              summary({}),
              summary({
                id: 'bk_sz1050',
                code: 'SZ-1050',
                state: 'declined',
                otp: null,
                chef: { id: 'chef_rohan', slug: 'rohan-kapoor', displayName: 'Rohan Kapoor' },
                totalPaise: 1_337_600,
              }),
            ],
            nextCursor: null,
          },
    );
    await renderWithQuery(<Bookings />);
    expect(await screen.findByText('4821', {}, { timeout: 5000 })).toBeTruthy();
    expect(screen.getByText('₹10,976 paid')).toBeTruthy();
    expect(screen.getByText('₹13,376 refunded in full')).toBeTruthy();
    expect(screen.getByText('Past')).toBeTruthy();
  });

  it('points a guest with no bookings to the chefs', async () => {
    jest.mocked(listMyBookings).mockResolvedValue({ items: [], nextCursor: null });
    await renderWithQuery(<Bookings />);
    expect(await screen.findByText('No bookings yet', {}, { timeout: 5000 })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Find a chef' })).toBeTruthy();
  });
});

describe('Live booking (G12)', () => {
  it('shows the ETA while the chef is on the way', async () => {
    const onTheWayAt = '2026-12-19T13:00:00.000Z';
    jest
      .mocked(getMyBooking)
      .mockResolvedValue(detail({ subStatus: 'on_the_way', etaMinutes: 30, onTheWayAt }));
    await renderWithQuery(<LiveBooking />);
    expect(
      await screen.findByText('Ananya Mehta is on the way', {}, { timeout: 5000 }),
    ).toBeTruthy();
    const arrive = timeLabel(Date.parse(onTheWayAt) + 30 * 60_000);
    expect(
      screen.getByText(`Arriving around ${arrive}. Keep this code ready for the door.`),
    ).toBeTruthy();
    expect(screen.getByText('Start OTP')).toBeTruthy();
  });

  it('shows the finish code and says the chef is paid 24 hours later', async () => {
    jest.mocked(getMyBooking).mockResolvedValue(
      detail({
        state: 'in_progress',
        subStatus: 'awaiting_finish',
        otp: { kind: 'finish', code: '7395' },
      }),
    );
    await renderWithQuery(<LiveBooking />);
    expect(await screen.findByText('7395', {}, { timeout: 5000 })).toBeTruthy();
    expect(screen.getByText('Finish OTP')).toBeTruthy();
    expect(screen.getByText(/paid 24 hours later/)).toBeTruthy();
    expect(screen.getByText('₹10,976')).toBeTruthy();
  });

  it('offers a retry when the booking fails to load', async () => {
    jest.mocked(getMyBooking).mockRejectedValue(new Error('offline'));
    await renderWithQuery(<LiveBooking />);
    expect(
      await screen.findByRole('button', { name: 'Try again' }, { timeout: 5000 }),
    ).toBeTruthy();
  });
});

describe('stageOf', () => {
  it('maps states and sub-statuses to what the guest sees', () => {
    expect(stageOf({ state: 'requested', subStatus: null })).toBe('waiting');
    expect(stageOf({ state: 'confirmed', subStatus: 'possible_no_show' })).toBe('booked');
    expect(stageOf({ state: 'in_progress', subStatus: null })).toBe('cooking');
    expect(stageOf({ state: 'refunded', subStatus: null })).toBe('in_review');
    expect(stageOf({ state: 'expired', subStatus: null })).toBe('cancelled');
  });
});
