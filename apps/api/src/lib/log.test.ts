import { describe, expect, it, vi } from 'vitest';
import { log, redact } from './log';

describe('redact', () => {
  it('hides sensitive keys at any depth', () => {
    expect(
      redact({
        phone_e164: '+919876543210',
        booking: { flatEnc: 'x', gate_notes_enc: 'y', guests: 6 },
        otp: '1234',
        code: '482913',
        refreshToken: 't',
        pan: 'ABCDE1234F',
        lat: 23.03,
      }),
    ).toEqual({
      phone_e164: '[redacted]',
      booking: { flatEnc: '[redacted]', gate_notes_enc: '[redacted]', guests: 6 },
      otp: '[redacted]',
      code: '[redacted]',
      refreshToken: '[redacted]',
      pan: '[redacted]',
      lat: '[redacted]',
    });
  });

  it('scrubs phone numbers and UPI handles inside free text', () => {
    expect(redact('call 98765 43210 or +91 9876543210, pay ravi@okaxis')).toBe(
      'call 98765 43210 or [phone], pay [handle]',
    );
  });

  it('keeps booking codes and amounts', () => {
    expect(redact({ bookingCode: 'SZ-1042', amountPaise: 1_080_000 })).toEqual({
      bookingCode: 'SZ-1042',
      amountPaise: 1_080_000,
    });
  });
});

describe('log', () => {
  it('writes one redacted JSON line', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    log.info('otp sent to 9876543210', { phone: '9876543210', attempt: 1 });
    expect(JSON.parse(spy.mock.calls[0]![0] as string)).toEqual({
      level: 'info',
      msg: 'otp sent to [phone]',
      phone: '[redacted]',
      attempt: 1,
    });
    spy.mockRestore();
  });
});
