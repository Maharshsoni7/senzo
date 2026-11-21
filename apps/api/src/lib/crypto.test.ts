import { describe, expect, it } from 'vitest';
import { hmacSha256, randomDigits, randomToken, safeEqual } from './crypto';

describe('crypto', () => {
  it('makes n-digit codes', () => {
    for (let i = 0; i < 200; i++) expect(randomDigits(6)).toMatch(/^\d{6}$/);
  });

  it('makes url-safe tokens', () => {
    expect(randomToken()).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('hashes deterministically per secret', async () => {
    expect(await hmacSha256('k', 'm')).toBe(await hmacSha256('k', 'm'));
    expect(await hmacSha256('k', 'm')).not.toBe(await hmacSha256('k2', 'm'));
  });

  it('compares safely', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'ab')).toBe(false);
  });
});
