/* eslint-disable @typescript-eslint/no-require-imports -- Node test runner entry point. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { findBrokenText } = require('../scripts/check-data-encoding.cjs');

test('committed public data has no broken Korean characters', () => {
    const broken = findBrokenText(path.join(__dirname, '../public/data'));
    assert.deepEqual(broken.map(item => `${item.file}: ${item.count}`), []);
});

test('the check flags U+FFFD in a data file', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'yourpick-enc-'));
    try {
        fs.writeFileSync(path.join(dir, 'ok.json'), JSON.stringify([{ name: '동그라미유치원' }]));
        fs.writeFileSync(path.join(dir, 'bad.json'), JSON.stringify([{ name: '동���라미유치원' }]));
        assert.deepEqual(findBrokenText(dir).map(item => [item.file, item.count]), [['bad.json', 3]]);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});


const { compareCounts } = require('../scripts/check-data-counts.cjs');

test('count check stops a refresh that empties or shrinks a region', () => {
    const baseline = { 'a.json': 100, 'b.json': 4, 'c.json': 50 };
    assert.deepEqual(compareCounts({ 'a.json': 98, 'b.json': 3, 'c.json': 51 }, baseline).problems, []);
    assert.deepEqual(compareCounts({ 'a.json': 98, 'b.json': 0, 'c.json': 51 }, baseline).problems, ['b.json: 4 → 0']);
    assert.deepEqual(compareCounts({ 'a.json': 60, 'b.json': 4, 'c.json': 50 }, baseline).problems,
        ['a.json: 100 → 60', 'total: 154 → 114']);
    assert.deepEqual(compareCounts({ 'a.json': 100, 'b.json': 4, 'c.json': 50, 'new.json': 0 }, baseline).problems,
        ['new.json: new region with 0 facilities']);
});
