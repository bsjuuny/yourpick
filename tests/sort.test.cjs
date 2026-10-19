/* eslint-disable @typescript-eslint/no-require-imports -- Node.js CommonJS entry point. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
// Exercise the actual UI comparator without adding a test-only runtime dependency.
const input = fs.readFileSync(require.resolve('../src/utils/institutionSort.ts'), 'utf8');
const compiled = ts.transpileModule(input, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const mod = { exports: {} };
new Function('exports', 'require', 'module', compiled)(mod.exports, require, mod);
const { compareInstitutions } = mod.exports;
const records = [
    { id: 'b', source: '어린이집', name: '나어린이집', latitude: 33, longitude: 125, capacity: 100 },
    { id: 'a', source: '유치원', name: '가유치원', latitude: null, longitude: null, capacity: 10 },
    { id: 'c', source: '어린이집', name: '다어린이집', latitude: 39, longitude: 130, capacity: 100 },
];
test('name ordering includes unknown locations and does not depend on latitude', () => {
    assert.deepEqual([...records].sort((a, b) => compareInstitutions(a, b, 'name')).map(x => x.id), ['a', 'b', 'c']);
});
test('capacity ordering is descending with deterministic name/id ties', () => {
    assert.deepEqual([...records].sort((a, b) => compareInstitutions(a, b, 'capacity')).map(x => x.id), ['b', 'c', 'a']);
    assert.ok(compareInstitutions({ ...records[0], id: '1' }, { ...records[0], id: '2' }, 'name') < 0);
});
