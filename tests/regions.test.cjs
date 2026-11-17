/* eslint-disable @typescript-eslint/no-require-imports -- Node test runner entry point. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// 전국 확대(2026-11-17): 지역 목록·기관 데이터·경계·행정동이 서로 빠짐없이 맞아야 한다.
const root = path.resolve(__dirname, '..');
const regions = JSON.parse(fs.readFileSync(path.join(root, 'public/data/regions.json'), 'utf8'));
const boundaries = require('../scripts/geo/municipalities.json');
const dongs = JSON.parse(fs.readFileSync(path.join(root, 'public/data/dongs.json'), 'utf8'));
const validator = fs.readFileSync(path.join(root, 'scripts/geo/validate-coordinates.js'), 'utf8');

const ALL_SIDO = ['11', '26', '27', '28', '12', '30', '31', '36', '41', '51', '43', '44', '52', '47', '48', '50'];

test('every 시도 in the country is listed (전남·광주는 전남광주통합특별시 12)', () => {
    assert.deepEqual(regions.map(s => s.sidoCode).sort(), [...ALL_SIDO].sort());
});

test('region codes are unique and every region has data, boundary and dongs', () => {
    const codes = regions.flatMap(s => s.sggList.map(g => g.sggCode));
    assert.equal(new Set(codes).size, codes.length, 'duplicate sggCode');
    const missing = [];
    for (const s of regions) {
        for (const g of s.sggList) {
            for (const suffix of ['', '_childcare']) {
                if (!fs.existsSync(path.join(root, 'public/data', `${s.sidoCode}_${g.sggCode}${suffix}.json`))) missing.push(`data ${s.sidoCode}_${g.sggCode}${suffix}`);
            }
            if (!boundaries[g.sggCode]) missing.push(`boundary ${g.sggCode} ${g.sggName}`);
            if (!dongs[g.sggCode] || dongs[g.sggCode].length === 0) missing.push(`dongs ${g.sggCode} ${g.sggName}`);
        }
    }
    assert.deepEqual(missing, []);
});

test('every listed 시도 has an address alias for the coordinate check', () => {
    for (const s of regions) assert.ok(validator.includes(`'${s.sidoCode}': [`), `alias for ${s.sidoCode}`);
});

test('dong list has no keys for regions that are not listed', () => {
    const codes = new Set(regions.flatMap(s => s.sggList.map(g => g.sggCode)));
    assert.deepEqual(Object.keys(dongs).filter(k => !codes.has(k)), []);
});

test('[Codex#5-1] daycare-unavailable flag is only on 계룡시 and its daycare file is an empty list', () => {
    const flagged = regions.flatMap(s => s.sggList.filter(g => g.childcareUnavailable).map(g => `${s.sidoCode}_${g.sggCode}`));
    assert.deepEqual(flagged, ['44_44250']);
    for (const key of flagged) {
        assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, 'public/data', `${key}_childcare.json`), 'utf8')), []);
    }
    const { regionFiles, unavailableChildcareFiles } = require('../scripts/check-data-counts.cjs');
    assert.ok(regionFiles(regions).includes('44_44250_childcare.json'), 'the file is still read and checked');
    assert.deepEqual([...unavailableChildcareFiles(regions)], ['44_44250_childcare.json']);
});
