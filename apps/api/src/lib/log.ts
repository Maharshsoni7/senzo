type Level = 'debug' | 'info' | 'warn' | 'error';

// Matched against keys lowercased with `_` removed.
const SENSITIVE_PARTS = [
  'phone',
  'address',
  'line1',
  'flat',
  'gatenote',
  'otp',
  'token',
  'authorization',
  'cookie',
  'secret',
  'password',
  'bank',
  'accountnumber',
  'accountenc',
  'ifsc',
  'aadhaar',
  'kyc',
  'upi',
  'email',
];
const SENSITIVE_EXACT = new Set(['code', 'pan', 'lat', 'lng', 'signature']);

const PHONE = /(?:\+?91[\s-]?)?(?<!\d)[6-9]\d{9}(?!\d)/g;
const HANDLE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)*/g;

function isSensitive(key: string) {
  const k = key.toLowerCase().replaceAll('_', '');
  return SENSITIVE_EXACT.has(k) || SENSITIVE_PARTS.some((part) => k.includes(part));
}

export function redact(value: unknown, depth = 0): unknown {
  if (typeof value === 'string') return value.replace(PHONE, '[phone]').replace(HANDLE, '[handle]');
  if (value === null || typeof value !== 'object') return value;
  if (depth > 6) return '[deep]';
  if (value instanceof Error) {
    return { name: value.name, message: redact(value.message, depth + 1) };
  }
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  return Object.fromEntries(
    Object.entries(value).map(([k, v]) => [
      k,
      isSensitive(k) ? '[redacted]' : redact(v, depth + 1),
    ]),
  );
}

function write(level: Level, msg: string, fields?: Record<string, unknown>) {
  const line = JSON.stringify({ level, msg: redact(msg), ...(redact(fields ?? {}) as object) });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const log = {
  debug: (msg: string, fields?: Record<string, unknown>) => write('debug', msg, fields),
  info: (msg: string, fields?: Record<string, unknown>) => write('info', msg, fields),
  warn: (msg: string, fields?: Record<string, unknown>) => write('warn', msg, fields),
  error: (msg: string, fields?: Record<string, unknown>) => write('error', msg, fields),
};
