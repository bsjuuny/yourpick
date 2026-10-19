/* eslint-disable @typescript-eslint/no-require-imports -- Node.js CommonJS entry point. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const { parseCoordinate, contains, validateInstitutions } = require('../scripts/geo/validate-coordinates');
const { auditDirectory } = require('../scripts/audit-coordinates');
const { normalizeChildcareData, normalizeData, parseXmlItems } = require('../scripts/fetch-data');
const { readApiResponse } = require('../scripts/read-api-response');

const valid = (extra = {}) => ({ id: 'a', source: '어린이집', name: '가어린이집', sidoCode: '11', sggCode: '11620',
    address: '서울특별시 관악구 관악로 145', latitude: 37.4784, longitude: 126.9516, ...extra });
const validate = inst => validateInstitutions([inst]).institutions[0];

test('strict coordinate parsing rejects empty, partial, non-finite and wrong types', () => {
    for (const value of [undefined, null, '', ' ', '37.5oops', NaN, Infinity, 'Infinity', true, [], {}, '0x25']) assert.equal(parseCoordinate(value), null);
    assert.equal(parseCoordinate(' 37.4784 '), 37.4784);
    assert.equal(parseCoordinate(126.9516), 126.9516);
});

test('missing, swapped, zero and out-of-country coordinates never become fabricated locations', () => {
    for (const values of [[null, null], [0, 0], [126.95, 37.48], [47.5, 137], ['37bad', 127], ['', 127]]) {
        const result = validate(valid({ latitude: values[0], longitude: values[1] }));
        assert.equal(result.locationStatus, 'unconfirmed');
        assert.equal(result.latitude, null);
        assert.equal(result.longitude, null);
        assert.deepEqual(result.sourceCoordinates, { latitude: values[0], longitude: values[1] });
    }
});

test('all three reported facilities and even Seoul City Hall scope reject the known placeholder', () => {
    for (const [sidoCode, sggCode, name, address] of [
        ['29', '29140', '상무센트럴자이어린이집', '광주광역시 서구 상무대로 1'],
        ['41', '41630', '공립 디아뜰어린이집', '경기도 양주시 옥정로 1'],
        ['41', '41130', '판교테크노2어린이집', '경기도 성남시 분당구 판교로319번길 14'],
        ['11', '11140', '서울시설', '서울특별시 중구 세종대로 110'],
    ]) {
        const result = validate(valid({ sidoCode, sggCode, name, address, latitude: 37.56647, longitude: 126.977963 }));
        assert.equal(result.latitude, null);
        assert.ok(result.locationIssues.includes('known_placeholder'));
    }
});

test('regional polygons reject another district and another province', () => {
    assert.equal(validate(valid()).locationStatus, 'region_consistent');
    const wrongDistrict = validate(valid({ sggCode: '11650', address: '서울특별시 서초구 서초대로 1' }));
    assert.ok(wrongDistrict.locationIssues.includes('region_mismatch'));
    const wrongProvince = validate(valid({ sidoCode: '29', sggCode: '29140', address: '광주광역시 서구 상무대로 1' }));
    assert.ok(wrongProvince.locationIssues.includes('region_mismatch'));
});

test('address scope, missing region and corrupted Korean fail closed; short aliases work', () => {
    assert.equal(validate(valid({ address: '서울 관악구 관악로 145' })).locationStatus, 'region_consistent');
    for (const extra of [{ address: '서울특별시 서초구 서초대로 1' }, { address: '서���특별시 관악구 관악로 1' }, { sggCode: '99999' }, { sidoCode: '29' }]) {
        const result = validate(valid(extra));
        assert.equal(result.locationStatus, 'unconfirmed');
        assert.ok(result.locationIssues.includes('address_region_unconfirmed'));
    }
});

test('point containment handles polygon holes, multipolygons, islands and edges', () => {
    const square = [[0, 0], [4, 0], [4, 4], [0, 4], [0, 0]];
    const hole = [[1, 1], [2, 1], [2, 2], [1, 2], [1, 1]];
    const b = { bbox: [0, 0, 4, 4], geometry: { type: 'Polygon', coordinates: [square, hole] } };
    assert.equal(contains(b, 0.5, 0.5), true);
    assert.equal(contains(b, 1.5, 1.5), false);
    assert.equal(contains(b, 0, 2), true);
    assert.equal(contains(b, 9, 9), false);
    b.geometry = { type: 'MultiPolygon', coordinates: [[square, hole], [[[5, 5], [6, 5], [6, 6], [5, 6], [5, 5]]]] };
    b.bbox = [0, 0, 6, 6];
    assert.equal(contains(b, 5.5, 5.5), true);
});

test('shared building coordinates are retained; conflicting or unparseable addresses are quarantined', () => {
    const a = valid({ address: '서울 관악구 관악로 145 101동 101호' });
    const b = valid({ id: 'b', source: '유치원', address: '서울특별시 관악구 관악로 145 (봉천동) 2층' });
    const shared = validateInstitutions([a, b]);
    assert.equal(shared.duplicates[0].classification, 'shared_building');
    assert.ok(shared.institutions.every(x => x.locationStatus === 'region_consistent'));
    for (const address of ['서울 관악구 관악로 146', '서울 관악구 봉천동']) {
        const suspect = validateInstitutions([a, { ...b, address }]);
        assert.ok(suspect.institutions.every(x => x.latitude === null && x.locationIssues.includes('duplicate_coordinate_unconfirmed')));
        assert.deepEqual(validateInstitutions(suspect.institutions), suspect);
    }
});

test('both API normalizers reject invalid coordinates and preserve raw coordinate evidence', () => {
    const childcare = normalizeChildcareData(parseXmlItems('<item><stcode>1</stcode><crname>테스트</crname><craddr>서울 관악구 관악로 145</craddr><la>37.4784bad</la><lo>126.9516</lo></item>'), '11', '11620')[0];
    assert.equal(childcare.latitude, null);
    assert.equal(childcare.sourceCoordinates.latitude, '37.4784bad');
    const kindergarten = normalizeData([{ kindercode: 'k', addr: '서울 관악구 관악로 145', lttdcdnt: '', lngtcdnt: '126.9516' }], null, new Map(), null, null, null, '11', '11620')[0];
    assert.equal(kindergarten.latitude, null);
    const good = normalizeChildcareData([{ stcode: '2', craddr: '서울 관악구 관악로 145', la: '37.4784', lo: '126.9516' }], '11', '11620')[0];
    assert.equal(good.locationStatus, 'region_consistent');
    assert.equal(good.latitude, 37.4784);
});

test('audit detects duplicates across files and sources, persists nulls, and is idempotent', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'yourpick-geo-'));
    try {
        fs.writeFileSync(path.join(dir, '11_11620.json'), JSON.stringify([valid({ source: '유치원' })]));
        fs.writeFileSync(path.join(dir, '11_11620_childcare.json'), JSON.stringify([valid({ id: 'b', address: '서울 관악구 관악로 146' })]));
        fs.writeFileSync(path.join(dir, 'regions.json'), '{}'); // metadata must never be treated as institutions
        const before = auditDirectory(dir);
        assert.equal(before.report.suspiciousDuplicateGroups, 1);
        assert.equal(before.report.unconfirmed, 2);
        auditDirectory(dir, { write: true });
        assert.equal(auditDirectory(dir).changedFiles, 0);
        assert.deepEqual(auditDirectory(dir).report, before.report);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('UTF-8 Korean survives byte-by-byte network chunks; response errors reject', async () => {
    const response = new EventEmitter();
    response.statusCode = 200;
    const pending = readApiResponse(response);
    const original = '<craddr>광주광역시 서구 상무대로</craddr>';
    for (const byte of Buffer.from(original)) response.emit('data', Buffer.from([byte]));
    response.emit('end');
    assert.equal(await pending, original);
    const failed = new EventEmitter();
    failed.statusCode = 500;
    const rejected = readApiResponse(failed);
    failed.emit('end');
    await assert.rejects(rejected, /HTTP 500/);
});

test('all committed institution data satisfies the coordinate contract', () => {
    const { report, changedFiles } = auditDirectory(path.resolve(__dirname, '../public/data'));
    assert.equal(changedFiles, 0, 'Run npm run audit:coordinates:fix after data changes');
    assert.ok(report.total > 20000);
    assert.deepEqual(report, JSON.parse(fs.readFileSync(path.resolve(__dirname, '../docs/coordinate-audit.json'), 'utf8')), 'Committed audit report must match current data');
    const issue = report.issues.find(x => x.name === '판교테크노2어린이집');
    assert.ok(issue.reasons.includes('known_placeholder'));
    for (const x of report.issues) assert.ok(x.sourceCoordinates && x.reasons.length);
});
