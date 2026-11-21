import { ApiError, requestOtp } from '@senzo/api-client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import Login from '../app/(auth)/login';

jest.mock('@senzo/api-client', () => ({
  ...jest.requireActual('@senzo/api-client'),
  requestOtp: jest.fn(),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

const mockRequest = jest.mocked(requestOtp);

async function renderLogin() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return await render(
    <QueryClientProvider client={client}>
      <Login />
    </QueryClientProvider>,
  );
}

beforeEach(() => jest.clearAllMocks());

describe('Login (G02)', () => {
  it('blocks a number that is not an Indian mobile', async () => {
    await renderLogin();
    await fireEvent.changeText(screen.getByLabelText('Mobile number'), '12345');
    await fireEvent.press(screen.getByRole('button', { name: 'Send OTP' }));
    expect(screen.getByText('Enter a 10-digit Indian mobile number')).toBeTruthy();
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('sends the code in E.164 and opens verify', async () => {
    mockRequest.mockResolvedValue({ retryAfterSec: 30 });
    await renderLogin();
    await fireEvent.changeText(screen.getByLabelText('Mobile number'), '98765 43210');
    await fireEvent.press(screen.getByRole('button', { name: 'Send OTP' }));

    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith({
        pathname: '/verify',
        params: { phone: '+919876543210', wait: '30' },
      }),
    );
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({ phone: '+919876543210', channel: 'sms' }),
    );
  });

  it('shows the rate-limit message from the API', async () => {
    mockRequest.mockRejectedValue(
      new ApiError(429, { type: 't', title: 'RATE_LIMITED', status: 429, code: 'RATE_LIMITED' }),
    );
    await renderLogin();
    await fireEvent.changeText(screen.getByLabelText('Mobile number'), '9876543210');
    await fireEvent.press(screen.getByRole('button', { name: 'Send OTP' }));
    expect(
      await screen.findByText('Too many codes sent. Try again in a little while.'),
    ).toBeTruthy();
  });
});
