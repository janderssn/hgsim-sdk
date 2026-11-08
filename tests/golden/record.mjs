// Records golden.json from the adapter given (default: the SDK). node tests/golden/record.mjs [adapter.mjs]
import fs from 'node:fs';
import { scenarios } from './scenarios.mjs';
const { api } = await import(new URL(process.argv[2] || './adapter.mjs', import.meta.url));
fs.writeFileSync(new URL('./golden.json', import.meta.url), JSON.stringify(scenarios(api)) + '\n');
console.log('recorded tests/golden/golden.json');
