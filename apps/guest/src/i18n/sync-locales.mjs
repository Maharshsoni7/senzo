// Copies new English keys into gu/hi so every key exists; untranslated values are listed in _todo.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const read = (f) => JSON.parse(readFileSync(join(dir, f), 'utf8'));
const en = read('en.json');

function merge(source, target, path, todo) {
  const out = {};
  for (const [k, v] of Object.entries(source)) {
    const p = path ? `${path}.${k}` : k;
    if (typeof v === 'object') out[k] = merge(v, target?.[k] ?? {}, p, todo);
    else if (typeof target?.[k] === 'string' && !todo.prev.has(p)) out[k] = target[k];
    else {
      out[k] = v;
      todo.keys.push(p);
    }
  }
  return out;
}

for (const lang of ['gu', 'hi']) {
  let current = {};
  try {
    current = read(`${lang}.json`);
  } catch {
    // First run: no file yet.
  }
  const todo = { keys: [], prev: new Set(current._todo ?? []) };
  const merged = merge(en, current, '', todo);
  writeFileSync(
    join(dir, `${lang}.json`),
    JSON.stringify({ _todo: todo.keys, ...merged }, null, 2) + '\n',
  );
  console.log(`${lang}: ${todo.keys.length} keys to translate`);
}
