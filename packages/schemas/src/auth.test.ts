import { describe, expect, it } from 'vitest';
import { PhoneIN } from './auth';

describe('PhoneIN', () => {
  it.each(['9876543210', '+919876543210', '919876543210', '98765 43210', '+91-98765-43210'])(
    'normalises %s',
    (input) => {
      expect(PhoneIN.parse(input)).toBe('+919876543210');
    },
  );

  it.each(['5876543210', '987654321', '+14155550100', 'abc'])('rejects %s', (input) => {
    expect(PhoneIN.safeParse(input).success).toBe(false);
  });
});
