import {
  acceptBooking,
  ApiError,
  getPartnerBooking,
  listPartnerBookings,
  startJob,
  type PartnerBookingDetail,
  type PartnerBookingSummary,
} from '@senzo/api-client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import type { ReactElement } from 'react';
import Home from '../app/(tabs)/index';
import StartScreen from '../app/job/[id]/start';
import Finish from '../app/job/[id]/finish';
import Request from '../app/request/[id]';
import { screenFor, timeLeft } from '../features/jobs/format';

jest.mock('@senzo/api-client', () => ({
  ...jest.requireActual('@senzo/api-client'),
  listPartnerBookings: jest.fn(),
  getPartnerBooking: jest.fn(),
  acceptBooking: jest.fn(),
  startJob: jest.fn(),
}));
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));
jest.mock('../lib/useOnline', () => ({ useOnline: () => true }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), navigate: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({ id: 'bk_sz1052' }),
}));

const summary = (over: Partial<PartnerBookingSummary> = {}): PartnerBookingSummary => ({
  id: 'bk_sz1052',
  code: 'SZ-1052',
  state: 'requested',
  subStatus: null,
  date: '2026-12-20',
  slot: 'lunch',
  startsAt: '2026-12-20T07:00:00.000Z',
  arriveBy: '2026-12-20T05:00:00.000Z',
  acceptBy: new Date(Date.now() + 102 * 60_000).toISOString(),
  guests: 8,
  guestName: 'Krupa S.',
  area: 'Satellite',
  menuName: 'Gujarati Classic',
  foodRule: 'jain',
  menuTotalPaise: 1_440_000,
  feesPaise: 254_880,
  earningsPaise: 1_185_120,
  ...over,
});

const detail = (over: Partial<PartnerBookingDetail> = {}): PartnerBookingDetail => ({
  ...summary(),
  groceriesBy: 'chef',
  etaMinutes: null,
  allergiesAckAt: null,
  startedAt: null,
  doneAt: null,
  completedAt: null,
  items: [],
  foodProfile: { allergies: ['peanut'], jainCount: 4, noOnionGarlic: false, notes: null },
  kitchen: null,
  address: {
    unlocked: false,
    area: 'Satellite',
    city: 'Ahmedabad',
    line1: null,
    pincode: null,
    lat: null,
    lng: null,
  },
  ...over,
});

async function renderWithQuery(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  return await render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}
const wait = { timeout: 5000 };

beforeEach(() => jest.clearAllMocks());

describe('Chef home (C04)', () => {
  it('shows a request with its reply deadline and earnings, and the next job', async () => {
    jest.mocked(listPartnerBookings).mockImplementation(async (params) =>
      params?.scope === 'requests'
        ? { items: [summary()], nextCursor: null }
        : {
            items: [
              summary({
                id: 'bk_sz1051',
                code: 'SZ-1051',
                state: 'confirmed',
                guestName: 'Rahul D.',
                acceptBy: null,
              }),
            ],
            nextCursor: null,
          },
    );
    await renderWithQuery(<Home />);
    expect(await screen.findByText(/Krupa S\. ·/, {}, wait)).toBeTruthy();
    expect(screen.getByText(/Reply in 1h 4\dm/)).toBeTruthy();
    expect(screen.getByText('₹11,851.20')).toBeTruthy();
    expect(screen.getByText(/Rahul D\./)).toBeTruthy();
    expect(screen.getByText('On my way →')).toBeTruthy();
  });

  it('tells a guest account it isn’t a partner', async () => {
    jest.mocked(listPartnerBookings).mockRejectedValue(new ApiError(403, undefined));
    await renderWithQuery(<Home />);
    expect(
      await screen.findByText("This number isn't a Senzo Partner account", {}, wait),
    ).toBeTruthy();
  });
});

describe('Booking request (C05)', () => {
  it('keeps Accept disabled until the allergies are acknowledged', async () => {
    jest.mocked(getPartnerBooking).mockResolvedValue(detail());
    jest
      .mocked(acceptBooking)
      .mockResolvedValue(detail({ state: 'confirmed', allergiesAckAt: '2026-11-22T06:00:00Z' }));
    await renderWithQuery(<Request />);
    // On the ticket and again in the tick box.
    expect(await screen.findAllByText(/Allergies: peanut · 4 guests Jain/, {}, wait)).toHaveLength(
      2,
    );

    const accept = screen.getByRole('button', { name: 'Accept' });
    expect(accept).toBeDisabled();
    await fireEvent.press(screen.getByRole('checkbox'));
    expect(accept).toBeEnabled();
    await fireEvent.press(accept);
    expect(await screen.findByText("Accepted — it's in your calendar", {}, wait)).toBeTruthy();
    expect(acceptBooking).toHaveBeenCalledWith('bk_sz1052', { allergiesAck: true });
  });
});

describe('Start code (C06)', () => {
  const press = async (digits: string) => {
    for (const d of digits) await fireEvent.press(screen.getByRole('button', { name: d }));
  };

  it('reads the location once and starts the job with the code', async () => {
    jest.mocked(getPartnerBooking).mockResolvedValue(detail({ state: 'confirmed' }));
    jest.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValue({
      granted: true,
    } as never);
    jest.mocked(Location.getCurrentPositionAsync).mockResolvedValue({
      coords: { latitude: 23.03, longitude: 72.52 },
    } as never);
    jest.mocked(startJob).mockResolvedValue(detail({ state: 'in_progress' }));
    await renderWithQuery(<StartScreen />);
    await screen.findByText("You've arrived?", {}, wait);
    await press('4821');
    await screen.findByText("You've arrived?");
    expect(startJob).toHaveBeenCalledWith('bk_sz1052', { otp: '4821', lat: 23.03, lng: 72.52 });
    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/job/[id]/cooking',
      params: { id: 'bk_sz1052' },
    });
  });

  it('shows how many tries are left after a wrong code', async () => {
    jest.mocked(getPartnerBooking).mockResolvedValue(detail({ state: 'confirmed' }));
    jest.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValue({
      granted: true,
    } as never);
    jest.mocked(Location.getCurrentPositionAsync).mockResolvedValue({
      coords: { latitude: 23.03, longitude: 72.52 },
    } as never);
    jest.mocked(startJob).mockRejectedValue(
      new ApiError(422, {
        type: 'x',
        title: 'x',
        status: 422,
        code: 'OTP_INVALID',
        detail: 'Wrong code. 4 tries left',
      }),
    );
    await renderWithQuery(<StartScreen />);
    await screen.findByText("You've arrived?", {}, wait);
    await press('1111');
    expect(await screen.findByText('Wrong code. 4 tries left', {}, wait)).toBeTruthy();
  });

  it('won’t start without the location permission', async () => {
    jest.mocked(getPartnerBooking).mockResolvedValue(detail({ state: 'confirmed' }));
    jest.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValue({
      granted: false,
    } as never);
    await renderWithQuery(<StartScreen />);
    await screen.findByText("You've arrived?", {}, wait);
    await press('4821');
    expect(await screen.findByText(/Allow location/, {}, wait)).toBeTruthy();
    expect(startJob).not.toHaveBeenCalled();
  });
});

describe('Finish (C08)', () => {
  it('shows the payout receipt once the job is complete', async () => {
    jest.mocked(getPartnerBooking).mockResolvedValue(detail({ state: 'completed' }));
    await renderWithQuery(<Finish />);
    expect(await screen.findByText('Job complete!', {}, wait)).toBeTruthy();
    expect(screen.getByText(/released 24 hours from now/)).toBeTruthy();
    expect(screen.getByText('₹11,851.20')).toBeTruthy();
  });
});

describe('format', () => {
  it('opens each booking on the screen for its stage', () => {
    const at = (
      state: PartnerBookingSummary['state'],
      subStatus: PartnerBookingSummary['subStatus'] = null,
    ) => (screenFor({ id: 'b', state, subStatus }) as { pathname: string }).pathname;
    expect(at('requested')).toBe('/request/[id]');
    expect(at('confirmed')).toBe('/job/[id]/on-my-way');
    expect(at('confirmed', 'on_the_way')).toBe('/job/[id]/start');
    expect(at('in_progress')).toBe('/job/[id]/cooking');
    expect(at('in_progress', 'awaiting_finish')).toBe('/job/[id]/finish');
  });

  it('counts down to the answer deadline', () => {
    const now = Date.parse('2026-11-22T06:00:00Z');
    expect(timeLeft('2026-11-22T07:42:00Z', now)).toBe('1h 42m');
    expect(timeLeft('2026-11-22T06:20:00Z', now)).toBe('20m');
    expect(timeLeft('2026-11-22T05:00:00Z', now)).toBeNull();
  });
});
