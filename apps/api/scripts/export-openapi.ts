import { writeFileSync } from 'node:fs';
import { OPENAPI_CONFIG, createApp } from '../src/app';

const out = process.argv[2] ?? 'openapi.json';
const doc = createApp().getOpenAPI31Document(OPENAPI_CONFIG);
writeFileSync(out, JSON.stringify(doc, null, 2) + '\n');
console.log(`OpenAPI written to ${out} (${Object.keys(doc.paths ?? {}).length} paths)`);
