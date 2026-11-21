import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, configureApiClient } from './fetcher';
import { logout, verifyOtp } from './generated/senzo';

const fetchMock = vi.fn<typeof fetch>();
vi.stubGlobal('fetch', fetchMock);

afterEach(() => fetchMock.mockReset());

describe('senzoFetch', () => {
  it('prefixes the base URL and sends the bearer token', async () => {
    configureApiClient({ baseUrl: 'https://api.test', getAccessToken: () => 'tok' });
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await logout();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.test/v1/auth/logout');
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer tok');
  });

  it('turns problem+json into an ApiError with the stable code', async () => {
    configureApiClient({ baseUrl: '' });
    fetchMock.mockResolvedValue(
      Response.json(
        {
          type: 't',
          title: 'OTP_INVALID',
          status: 422,
          code: 'OTP_INVALID',
          detail: '4 tries left',
        },
        { status: 422 },
      ),
    );
    const err = await verifyOtp({
      phone: '9876543210',
      code: '000000',
      device: { platform: 'android', app: 'guest' },
    }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 422, code: 'OTP_INVALID', message: '4 tries left' });
  });
});
