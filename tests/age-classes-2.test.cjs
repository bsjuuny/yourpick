/* eslint-disable @typescript-eslint/no-require-imports -- Node.js CommonJS entry point. */
// 연령반 2단계: 상태 이름, 원아·정원 이력, 재원 기간·혼합반 선호, 소통 질문, API 키 오류 감지.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const cache = {};
function load(rel) {
    const file = path.resolve(__dirname, '../src/utils', `${rel}.ts`);
    if (cache[file]) return cache[file];
    const out = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
    const mod = { exports: {} };
    cache[file] = mod.exports;
    new Function('exports', 'require', 'module', out)(mod.exports, (name) => (name.startsWith('./') ? load(name.slice(2)) : require(name)), mod);
    return mod.exports;
}
const a = load('ageClasses');
const f = load('fitConditions');
const q = load('preEntryQuestions');
const collector = require('../scripts/fetch-data.js');
const historyBuilder = require('../scripts/build-class-history.js');
const NOW = new Date('2026-11-17T12:00:00+09:00');

function kinder(byAge = {}, mixed = []) {
    const full = {};
    for (const age of [3, 4, 5]) full[age] = byAge[age] ?? { classes: 0, children: 0, capacity: 0 };
    return {
        id: 'k', name: '유치원', source: '유치원', type: '사립', address: '', phone: '', capacity: 60, currentPupils: 50,
        operatingHours: '', hasSchoolBus: false, expenseLevel: '', ageRange: '만 3세 ~ 5세', tags: [],
        ageClasses: { basis: { kind: 'disclosure', key: '20262', label: '2026년 2차 공시' }, byAge: full, mixed, special: { classes: 0, children: 0 } },
    };
}
const daycare = (byAge = {}, mixed = []) => {
    const full = {};
    for (let age = 0; age <= 5; age++) full[age] = byAge[age] ?? { classes: 0, children: 0 };
    return { ...kinder(), id: 'd', source: '어린이집', ageRange: '만 0세 ~ 만 5세', ageClasses: { basis: { kind: 'date', key: '2026-11-17', label: '2026-11-17 기준' }, byAge: full, mixed, special: { classes: 0, children: 0 } } };
};
const cond = (patch = {}) => ({ ...f.DEFAULT_CONDITIONS, ...patch });

test('operation status uses the spec names; mixed classes are "운영 확인", not a negative state', () => {
    const k = kinder({ 3: { classes: 1, children: 10, capacity: 16 } }, [{ label: '혼합반', ages: [3, 4, 5], classes: 1, children: 20, capacity: 25 }]);
    assert.equal(a.operationStatus(a.ageClassStatus(k, 3), false), '운영 확인');
    assert.equal(a.operationStatus(a.ageClassStatus(k, 4), false), '운영 확인'); // 혼합반
    assert.equal(a.operationStatus(a.ageClassStatus(k, 3), true), '운영계획 확인 필요');
    const none = kinder({ 3: { classes: 1, children: 10, capacity: 16 } });
    assert.equal(a.operationStatus(a.ageClassStatus(none, 4), false), '해당 연령반 미운영 확인');
    assert.equal(a.operationStatus(a.ageClassStatus({ ...none, ageClasses: undefined }, 4), false), '정보 부족');
    assert.equal(a.operationStatus(a.ageClassStatus(daycare({}, [{ label: '혼합반(연령 범위 미공시)', ages: null, classes: 1, children: 3 }]), 2), false), '정보 부족');
    assert.equal(a.CHANGE_LABEL['줄어듦'], '학급 축소 확인');
});

test('history compares pupils and totals only where both ends are known', () => {
    const d = daycare({ 0: { classes: 1, children: 3 } });
    const e = (from, classes, children, capacity, pupils) => ({ from, to: from, basis: null, classes, children, capacity, pupils, mixed: 0, special: 0, origin: 'collect' });
    const h = a.compareHistory(d, [
        e('2026-03-31', [2, 1, 0, 0, 0, 0], [5, 4, null, null, null, null], 40, 30),
        e('2026-11-17', [1, 1, 0, 0, 0, 0], [3, 4, 2, null, null, null], 40, 25),
    ]);
    assert.deepEqual(h.changes.map(c => [c.age, a.CHANGE_LABEL[c.kind]]), [[0, '학급 축소 확인']]);
    assert.deepEqual(h.pupilChanges.map(c => [c.label, c.before, c.after]), [['만 0세 단독반 원아', 5, 3]]); // 만 2세는 처음이 모름 → 비교 안 함
    assert.deepEqual(h.totalChanges.map(c => [c.label, c.before, c.after]), [['전체 현원', 30, 25]]);
    // 예전 스냅샷은 반이 없던 연령의 원아 수를 0이 아니라 모름으로 남긴다
    const legacy = historyBuilder.entryFromLegacy({ id: '11620000001', source: '어린이집', capacity: 40, currentPupils: 30, ageBreakdown: { 0: { classes: 1, children: 3, ratio: 3 } } }, '2026-03-31');
    assert.deepEqual(legacy.children, [3, null, null, null, null, null]);
    assert.equal(legacy.capacity, 40);
});

test('stay years limit the path; mixed preference is a preference only', () => {
    const k = kinder({ 3: { classes: 1, children: 10, capacity: 16 }, 4: { classes: 1, children: 10, capacity: 16 } });
    assert.equal(a.childPath(k, 2023, 2027, NOW, 2).years.length, 2);
    assert.equal(a.childPath(k, 2023, 2027, NOW, null).years.length, 3);
    const withMixed = kinder({}, [{ label: '혼합반', ages: [3, 4, 5], classes: 2, children: 30, capacity: 40 }]);
    const prefer = f.evaluateFit(withMixed, cond({ birthYear: 2022, entryYear: 2026, mixedPreference: 'prefer' }), NOW).find(x => x.key === 'mixed');
    const avoid = f.evaluateFit(withMixed, cond({ birthYear: 2022, entryYear: 2026, mixedPreference: 'avoid' }), NOW).find(x => x.key === 'mixed');
    assert.equal(prefer.status, 'met');
    assert.equal(avoid.status, 'unmet');
    assert.equal(avoid.need, 'preferred'); // 필수로 쓰지 않는다 → 탈락 묶음에 영향 없음
    const r = f.assessFit(withMixed, cond({ mixedPreference: 'avoid' }), null, NOW);
    assert.equal(r.group, 0);
    // 공시 평가 점수는 혼합반 선호와 무관
    assert.equal(f.objectiveScore(withMixed, cond({ mixedPreference: 'avoid' })).rankScore, f.objectiveScore(withMixed, cond()).rankScore);
});

test('pre-entry questions follow disclosed facts and unknowns, without dispute wording', () => {
    const k = kinder({ 3: { classes: 1, children: 10, capacity: 16 } });
    const qs = q.preEntryQuestions(k, { birthYear: 2023, entryYear: 2027, stayYears: null, now: NOW });
    const ids = qs.map(x => x.id);
    assert.ok(ids.includes('plan-2027') && ids.includes('plan-2028') && ids.includes('plan-2029'));
    assert.ok(ids.includes('gap-4') && ids.includes('gap-5'));
    assert.ok(!ids.includes('time-merge'), '시간대별 통합보육 질문은 어린이집만');
    assert.ok(q.preEntryQuestions(daycare({ 0: { classes: 1, children: 3 } }), { birthYear: null, entryYear: null, stayYears: null, now: NOW }).some(x => x.id === 'time-merge'));
    const generic = q.preEntryQuestions(k, { birthYear: null, entryYear: null, stayYears: null, now: NOW });
    assert.ok(generic.some(x => x.id === 'plan-general'));
    const shrinkHistory = [
        { from: '2026-03-31', to: '2026-03-31', basis: null, classes: [null, null, null, 2, 1, 1], mixed: 0, special: 0, origin: 'collect' },
        { from: '2026-11-17', to: '2026-11-17', basis: null, classes: [null, null, null, 1, 1, 1], mixed: 0, special: 0, origin: 'collect' },
    ];
    const withShrink = q.preEntryQuestions(k, { birthYear: null, entryYear: null, stayYears: null, history: shrinkHistory, now: NOW });
    assert.match(withShrink.find(x => x.id === 'merge-criteria').why, /학급 축소 확인/);
    const forbidden = /분쟁|갈등|불만|다툼|민원|위험|문제가 있었|폐반 예정/;
    const all = [];
    for (const item of [k, daycare({ 0: { classes: 1, children: 3 } }), kinder({}, [{ label: '혼합반', ages: [3, 4, 5], classes: 1, children: 20 }])]) {
        for (const ctx of [{ birthYear: 2023, entryYear: 2027, stayYears: 2 }, { birthYear: null, entryYear: null, stayYears: null }, { birthYear: 2021, entryYear: 2026, stayYears: null, history: shrinkHistory }]) {
            for (const x of q.preEntryQuestions(item, { ...ctx, now: NOW })) all.push(x.text, x.why);
        }
    }
    all.push(...q.COMMUNICATION_ITEMS.map(c => c.title), q.COMMUNICATION_SOURCE_NOTE);
    assert.deepEqual(all.filter(t => forbidden.test(t)), []);
});

test('collector stops on key/quota errors but skips regions with no results', () => {
    assert.equal(collector.classifyChildcareResponse('<item><crname>가</crname></item>').kind, 'ok');
    assert.equal(collector.classifyChildcareResponse('<errcode>INFO-200</errcode>').kind, 'no-result');
    for (const code of ['INFO-100', 'INFO-300', 'INFO-400', 'ERROR-200']) {
        assert.equal(collector.classifyChildcareResponse(`<errcode>${code}</errcode>`).kind, 'fatal', code);
    }
    assert.equal(collector.classifyChildcareResponse('<crname>INFO 어린이집</crname>').kind, 'ok');
});
