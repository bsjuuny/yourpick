/* eslint-disable @typescript-eslint/no-require-imports -- Node.js CommonJS entry point. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
// Exercise the actual criteria module the UI uses.
const input = fs.readFileSync(require.resolve('../src/utils/selectionCriteria.ts'), 'utf8');
const compiled = ts.transpileModule(input, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const mod = { exports: {} };
new Function('exports', 'require', 'module', compiled)(mod.exports, require, mod);
const c = mod.exports;

const base = { id: 'x', name: '테스트', type: '민간', address: '', phone: '', capacity: 50, currentPupils: 40, operatingHours: '', hasSchoolBus: false, expenseLevel: '', ageRange: '', tags: [] };

test('daycare care uses legal per-class limits and flags overload', () => {
    const relaxed = c.assessCare({ ...base, source: '어린이집', ageBreakdown: { 0: { children: 3, classes: 2, ratio: 1.5 }, 2: { children: 7, classes: 1, ratio: 7 } } });
    // 10 children / (2*3 + 1*7) allowed = 77% -> 보통
    assert.equal(relaxed.level, 2);
    assert.equal(relaxed.value, '77%');
    const over = c.assessCare({ ...base, source: '어린이집', ageBreakdown: { 1: { children: 12, classes: 2, ratio: 6 } } });
    assert.equal(over.verdict, '기준 초과');
    assert.equal(over.caution, true);
});

test('kindergarten care uses children per teacher; missing data is unknown', () => {
    assert.equal(c.assessCare({ ...base, source: '유치원', childrenPerTeacher: 8 }).level, 3);
    assert.equal(c.assessCare({ ...base, source: '유치원', childrenPerTeacher: 15 }).level, 1);
    assert.equal(c.assessCare({ ...base, source: '유치원' }).level, 0);
});

test('stability reads the share of teachers under one year and estimates headcount', () => {
    const a = c.assessStability({ ...base, source: '어린이집', teacherRatio: '50% (5명/10명)', teacherTenure: { under1: 30, year1to2: 20, year2to4: 20, year4to6: 10, over6: 20 } });
    assert.equal(a.verdict, '보통');
    assert.match(a.detail, /10명 중 약 3명/);
    assert.equal(c.assessStability({ ...base, source: '어린이집', teacherTenure: { under1: 0, year1to2: 0, year2to4: 0, year4to6: 0, over6: 0 } }).level, 0);
});

test('nutritionist is not counted against small daycares', () => {
    const small = c.safetyChecks({ ...base, source: '어린이집', capacity: 40, cctvCount: 3, mealStatus: '급식 제공 (영양사 미배치)' });
    assert.deepEqual(small.map(x => x.ok), [true, null]);
    assert.equal(c.assessSafety({ ...base, source: '어린이집', capacity: 40, cctvCount: 3, mealStatus: '급식 제공 (영양사 미배치)' }).verdict, '모두 확인');
    assert.equal(c.assessSafety({ ...base, source: '어린이집', capacity: 120, cctvCount: 3, mealStatus: '급식 제공 (영양사 미배치)' }).verdict, '일부 확인');
});

test('best marker compares level first and raw values only within one unit', () => {
    const kg = { level: 3, verdict: '여유', value: '8명', rank: 8, unit: 'per-teacher' };
    const cc = { level: 3, verdict: '여유', value: '50%', rank: 0.5, unit: 'legal-usage' };
    const mid = { level: 2, verdict: '보통', value: '80%', rank: 0.8, unit: 'legal-usage' };
    assert.deepEqual(c.bestIndexes([kg, cc, mid]), [0, 1]);
    assert.deepEqual(c.bestIndexes([cc, mid]), [0]);
    assert.deepEqual(c.bestIndexes([cc, { ...cc }]), []);
    assert.deepEqual(c.bestIndexes([cc, { level: 0, verdict: '정보 없음', value: '-' }]), []);
});

test('every committed institution can be assessed without throwing', () => {
    const dir = path.resolve(__dirname, '../public/data');
    let count = 0;
    for (const file of fs.readdirSync(dir).filter(f => /^\d+_\d+(_childcare)?\.json$/.test(f))) {
        for (const item of JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'))) {
            for (const fn of [c.assessCare, c.assessStability, c.assessSafety]) {
                const a = fn(item);
                assert.ok([0, 1, 2, 3].includes(a.level), `${file} ${item.id}`);
            }
            c.lifeFacts(item);
            count++;
        }
    }
    assert.ok(count > 20000);
});

test('operating hours are shown in one format for both sources', () => {
    assert.equal(c.lifeFacts({ ...base, source: '유치원', operatingHours: '09시00분~18시00분' }).hours, '09:00 ~ 18:00');
    assert.equal(c.lifeFacts({ ...base, source: '어린이집', operatingHours: '평일기준시간 : 07:30 ~ 24:00 (야간연장)' }).hours, '07:30 ~ 24:00');
});

test('daycare care detail names the tightest class', () => {
    const a = c.assessCare({ ...base, source: '어린이집', ageBreakdown: { 0: { children: 2, classes: 1, ratio: 2 }, 2: { children: 7, classes: 1, ratio: 7 } } });
    assert.equal(a.detail, '가장 빠듯한 반: 만2세 반당 7명 (기준 7명)');
});

test('implausible class counts are not judged', () => {
    const odd = { ...base, source: '어린이집', childrenPerTeacher: 3.7, teacherRatio: '50% (3명/6명)', ageBreakdown: { 0: { children: 0, classes: 6, ratio: 0 }, 1: { children: 4, classes: 7, ratio: 0.6 }, 2: { children: 0, classes: 4, ratio: 0 } } };
    assert.equal(c.ageBreakdownReliable(odd), false);
    const a = c.assessCare(odd);
    assert.equal(a.level, 0);
    assert.equal(a.verdict, '확인 필요');
});
