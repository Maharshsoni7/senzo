const encoder = new TextEncoder();

async function hmacBytes(secret: string, message: string) {
  if (!secret) throw new Error('HMAC secret not set (OTP_PEPPER?)');
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(message)));
}

export async function hmacSha256(secret: string, message: string) {
  return toBase64Url(await hmacBytes(secret, message));
}

/** n digits keyed on `message`; the same inputs always give the same code. */
export async function hmacDigits(secret: string, message: string, n: number) {
  const bytes = await hmacBytes(secret, message);
  const value = new DataView(bytes.buffer).getUint32(0);
  // Modulo bias is under 1e-5 for n ≤ 4.
  return String(value % 10 ** n).padStart(n, '0');
}

export function randomToken(bytes = 32) {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(bytes)));
}

/** Uniform n-digit code; rejection sampling avoids modulo bias. */
export function randomDigits(n: number) {
  const max = 10 ** n;
  const limit = Math.floor(0x1_0000_0000 / max) * max;
  const buf = new Uint32Array(1);
  do crypto.getRandomValues(buf);
  while (buf[0]! >= limit);
  return String(buf[0]! % max).padStart(n, '0');
}

/** Constant-time compare for equal-length strings. */
export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function toBase64Url(bytes: Uint8Array) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}
