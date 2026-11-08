// The SDK flies the golden scenarios (tests/golden/scenarios.mjs) to the same numbers the physics produced when they were recorded.
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { scenarios } from './golden/scenarios.mjs';
import { api } from './golden/adapter.mjs';

const golden = JSON.parse(fs.readFileSync(new URL('./golden/golden.json', import.meta.url), 'utf8'));
const now = JSON.parse(JSON.stringify(scenarios(api)));
for (const name of Object.keys(golden)) test(`golden: ${name}`, () => assert.deepEqual(now[name], golden[name]));
