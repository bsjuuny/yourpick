/* eslint-disable @typescript-eslint/no-require-imports -- Node.js CommonJS entry point. */
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
const collector = require('../scripts/fetch-data.js');
const historyBuilder = require('../scripts/build-class-history.js');
const NOW = new Date('2026-11-17T12:00:00+09:00');

const zero = { classes: 0, children: 0 };
function daycare(byAge = {}, mixed = [], basis = '2026-11-17') {
    const full = {};
    for (let age = 0; age <= 5; age++) full[age] = byAge[age] ?? { ...zero };
    return {
        id: 'd', name: '어린이집', source: '어린이집', type: '민간', address: '', phone: '', capacity: 50, currentPupils: 40,
        operatingHours: '', hasSchoolBus: false, expenseLevel: '', ageRange: '', tags: [],
        ageClasses: { basis: { kind: 'date', key: basis, label: `${basis} 기준` }, byAge: full, mixed, special: { classes: 0, children: 0 } },
    };
}
function kinder(byAge = {}, mixed = []) {
    const full = {};
    for (const age of [3, 4, 5]) full[age] = byAge[age] ?? { classes: 0, children: 0, capacity: 0 };
    return { ...daycare(), id: 'k', source: '유치원', ageClasses: { basis: { kind: 'disclosure', key: '20262', label: '2026년 2차 공시' }, byAge: full, mixed, special: { classes: 0, children: 0 } } };
}

test('collector: M5 is 유아혼합(만 3~5세), M2 영아혼합(만 0~2세), M3 range is not guessed', () => {
    const ac = collector.childcareAgeClasses({ CLASS_CNT_M2: '1', CLASS_CNT_M3: '1', CLASS_CNT_M5: '2', CHILD_CNT_M5: '30', datastdrdt: '2026-11-17' });
    assert.deepEqual(ac.mixed.map(m => [m.label, m.ages, m.classes]), [['영아혼합반', [0, 1, 2], 1], ['혼합반(연령 범위 미공시)', null, 1], ['유아혼합반', [3, 4, 5], 2]]);
    assert.equal(ac.basis.label, '2026-11-17 기준');
    assert.equal(collector.kindergartenBasis('20232').label, '2023년 2차 공시');
    assert.equal(collector.kindergartenBasis('').label, '공시 차수 정보 없음');
});

test('class status distinguishes own, mixed, unknown-range mixed, none, not applicable, missing data', () => {
    const d = daycare({ 0: { classes: 1, children: 3 } }, [
        { label: '영아혼합반', ages: [0, 1, 2], classes: 1, children: 5 },
        { label: '혼합반(연령 범위 미공시)', ages: null, classes: 1, children: 4 },
    ]);
    assert.equal(a.ageClassStatus(d, 0).kind, 'own');
    assert.equal(a.ageClassStatus(d, 1).kind, 'mixed');
    assert.equal(a.ageClassStatus(d, 3).kind, 'mixed-unknown-range');
    const noMixed = daycare({ 0: { classes: 1, children: 3 } });
    assert.equal(a.ageClassStatus(noMixed, 4).kind, 'none');
    assert.match(a.ageClassStatus(noMixed, 4).detail, /폐반 여부·다음 학년도 모집은 기관 확인/);
    assert.equal(a.ageClassStatus(kinder(), 2).kind, 'not-applicable');
    assert.equal(a.ageClassStatus({ ...noMixed, ageClasses: undefined }, 1).kind, 'unknown');
});

test('history: shrink is a change, not a closure; a lost class now in a mixed class is said so; one record is 정보 부족', () => {
    const now = daycare({ 0: { classes: 1, children: 3 }, 2: { classes: 1, children: 7 } }, [{ label: '영아혼합반', ages: [0, 1, 2], classes: 1, children: 5 }]);
    const entries = [
        { from: '2026-03-31', to: '2026-09-13', basis: null, classes: [1, 2, 3, 0, 0, 0], mixed: null, special: null, origin: 'git' },
        { from: '2026-11-17', to: '2026-11-17', basis: '2026-11-17 기준', classes: [1, 0, 1, 0, 0, 0], mixed: 1, special: 0, origin: 'collect' },
    ];
    const h = a.compareHistory(now, entries);
    assert.equal(h.comparable, true);
    assert.deepEqual(h.changes.map(c => [c.age, c.kind]), [[1, '없어짐'], [2, '줄어듦']]);
    assert.match(h.changes[0].text, /지금은 혼합반으로 운영/);
    assert.ok(h.notes.some(n => /혼합반 정보가 없어/.test(n)));
    assert.ok(h.notes.some(n => /폐반 예정이라고 볼 수 없어요/.test(n)));
    const single = a.compareHistory(kinder(), [entries[1]]);
    assert.equal(single.comparable, false);
    assert.match(single.notes[0], /정보 부족/);
});

test('school year and class age: March starts the year; 2026학년도 만 5세반 = 2020년생', () => {
    assert.equal(a.currentSchoolYear(new Date('2027-02-28T12:00:00+09:00')), 2026);
    assert.equal(a.currentSchoolYear(new Date('2027-03-02T12:00:00+09:00')), 2027);
    assert.equal(a.classAgeFor(2020, 2026), 5);
});

test('child path: future years are never confirmed; gaps are named with the school year', () => {
    const k = kinder({ 3: { classes: 1, children: 10, capacity: 16 }, 5: { classes: 1, children: 20, capacity: 22 } });
    const p = a.childPath(k, 2023, 2027, NOW); // 2027 만3, 2028 만4, 2029 만5
    assert.deepEqual(p.years.map(y => [y.schoolYear, y.age, y.current]), [[2027, 3, false], [2028, 4, false], [2029, 5, false]]);
    assert.deepEqual(p.gaps.map(g => g.age), [4]);
    assert.match(p.summary, /만 4세\(2028학년도\) 반이 없어/);
    assert.match(p.summary, /공식 모집자료나 기관 확인이 필요/);
});

test('fit: future entry with a class now is "확인 필요" with evidence; 유치원 for 만 2세 is unmet', () => {
    const k = kinder({ 3: { classes: 1, children: 10, capacity: 16 } });
    const future = f.checkAge(k, 3, true);
    assert.equal(future.status, 'unknown');
    assert.equal(future.evidence, true);
    assert.equal(f.checkAge(k, 3, false).status, 'met');
    assert.equal(f.checkAge(k, 4, false).status, 'unmet');
    assert.equal(f.checkAge(k, 4, true).status, 'unknown');
    assert.equal(f.checkAge(k, 2, true).status, 'unmet');
    const c = { ...f.DEFAULT_CONDITIONS, birthYear: 2023, entryYear: 2027 };
    const checks = f.evaluateFit(k, c, NOW);
    assert.deepEqual(checks.map(x => [x.key, x.status]), [['age', 'unknown'], ['continuity', 'unknown']]);
    assert.equal(f.fitGroup(checks), 1);
});

test('ranking: among "확인 필요", an institution whose current disclosure has the class comes first', () => {
    const c = { ...f.DEFAULT_CONDITIONS, birthYear: 2023, entryYear: 2027, ageNeed: 'required' };
    const has = { ...kinder({ 3: { classes: 1, children: 10, capacity: 16 } }), id: 'has' };
    const none = { ...kinder(), id: 'none' };
    const sorted = [none, has].map(i => ({ id: i.id, r: f.assessFit(i, c, null, NOW) })).sort((x, y) => f.compareFit(x.r, y.r)).map(x => x.id);
    assert.deepEqual(sorted, ['has', 'none']);
});

test('no generated text promises future operation or gives a closure probability', () => {
    const forbidden = /폐반\s*예정(입니다|이에요|돼요)|폐반됩니다|폐원 예정|확률|위험\s*점수|보장|확정적으로 운영|계속 다닐 수 있어요/;
    const samples = [];
    const d = daycare({ 0: { classes: 1, children: 3 } }, [{ label: '유아혼합반', ages: [3, 4, 5], classes: 1, children: 12 }]);
    for (const item of [d, kinder(), kinder({ 5: { classes: 1, children: 20, capacity: 22 } })]) {
        for (let age = 0; age <= 5; age++) samples.push(a.ageClassStatus(item, age).detail, a.ageClassStatus(item, age).label);
        for (const birth of [2020, 2021, 2022, 2023, 2024]) {
            for (const entry of [2026, 2027, 2028]) {
                samples.push(a.childPath(item, birth, entry, NOW).summary);
                for (const x of f.evaluateFit(item, { ...f.DEFAULT_CONDITIONS, birthYear: birth, entryYear: entry }, NOW)) samples.push(x.reason);
            }
        }
    }
    const h = a.compareHistory(d, [
        { from: '2026-03-31', to: '2026-03-31', basis: null, classes: [2, 1, 0, 0, 0, 0], mixed: null, special: null, origin: 'git' },
        { from: '2026-11-17', to: '2026-11-17', basis: 'x', classes: [1, 0, 0, 0, 0, 0], mixed: 1, special: 0, origin: 'collect' },
    ]);
    samples.push(...h.notes, ...h.changes.map(c => c.text));
    assert.deepEqual(samples.filter(t => forbidden.test(t)), []);
});

test('history builder: identical consecutive states extend the period; unknown mixed is not merged with known', () => {
    const list = [];
    historyBuilder.append(list, { from: '2026-03-31', to: '2026-03-31', classes: [1, 1, 1, 0, 0, 0], mixed: null, special: null });
    historyBuilder.append(list, { from: '2026-08-01', to: '2026-08-01', classes: [1, 1, 1, 0, 0, 0], mixed: null, special: null });
    historyBuilder.append(list, { from: '2026-11-17', to: '2026-11-17', classes: [1, 1, 1, 0, 0, 0], mixed: 0, special: 0 });
    historyBuilder.append(list, { from: '2026-11-17', to: '2026-11-17', classes: [9, 9, 9, 0, 0, 0], mixed: 0, special: 0 }); // 같은 날 다시 → 무시
    assert.deepEqual(list.map(e => [e.from, e.to, e.mixed]), [['2026-03-31', '2026-08-01', null], ['2026-11-17', '2026-11-17', 0]]);
});
