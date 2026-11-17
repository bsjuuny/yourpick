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
    // 구성 연령은 공시되지 않아 ages 는 늘 null, 들 수 있는 범위만 possibleAges (Codex PR #6 지적 4)
    assert.deepEqual(ac.mixed.map(m => [m.label, m.ages, m.possibleAges, m.classes]), [['영아혼합반', null, [0, 1, 2], 1], ['혼합반(연령 범위 미공시)', null, null, 1], ['유아혼합반', null, [3, 4, 5], 2]]);
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
    historyBuilder.append(list, { from: '2026-11-17', to: '2026-11-17', classes: [9, 9, 9, 0, 0, 0], mixed: 0, special: 0 }); // 같은 날 정정 → 최신 값
    assert.deepEqual(list.map(e => [e.from, e.to, e.mixed]), [['2026-03-31', '2026-08-01', null], ['2026-11-17', '2026-11-17', 0]]);
    assert.deepEqual(list[1].classes, [9, 9, 9, 0, 0, 0]);
});

// ── Codex PR #3 1차 검수 지적 재현 (2026-11-17) ─────────────────────────

test('[Codex#3-1] no class data or only M3 never counts as support for future years or graduation', () => {
    const noData = { ...daycare(), ageClasses: undefined, ageRange: '만 0세 ~ 만 5세' };
    assert.equal(f.checkAge(noData, 3, true).status, 'unknown');
    assert.notEqual(f.checkAge(noData, 3, true).evidence, true);
    const m3only = daycare({ 0: { classes: 1, children: 3 } }, [{ label: '혼합반(연령 범위 미공시)', ages: null, classes: 1, children: 8 }]);
    for (const item of [noData, m3only]) {
        const p = a.childPath(item, 2023, 2027, NOW);
        assert.equal(p.supported, false);
        assert.ok(!p.summary.includes('졸업(만 5세반)까지 해당 연령 반이 있어요'), p.summary);
        assert.match(p.summary, /정보가 부족해 판단할 수 없어요/);
        const cont = f.checkContinuity(item, 2023, 2027, NOW);
        assert.equal(cont.status, 'unknown');
        assert.notEqual(cont.evidence, true);
    }
});

test('[Codex#3-2] middle changes are not lost: 2→1→2, 1→0→1, 0→1→0', () => {
    const d = daycare({ 0: { classes: 2, children: 5 }, 2: { classes: 1, children: 7 } });
    const e = (from, classes, mixed = null) => ({ from, to: from, basis: null, classes, mixed, special: null, origin: 'git' });
    const h = a.compareHistory(d, [e('2026-03-31', [2, 0, 1, 0, 0, 0]), e('2026-08-01', [1, 1, 0, 0, 0, 0]), e('2026-11-17', [2, 0, 1, 0, 0, 0], 0)]);
    assert.deepEqual(h.changes.map(c => [c.age, c.kind]), [[0, '변동 후 복귀'], [1, '변동 후 복귀'], [2, '변동 후 복귀']]);
    assert.ok(h.changes[0].text.includes('2개(03.31) → 1개(08.01) → 2개(11.17)'), h.changes[0].text);
    assert.notEqual(h.changes.length, 0);
});

test('[Codex#3-3] history is labelled as stored snapshots with collection dates, not official disclosures', () => {
    const d = daycare({ 0: { classes: 1, children: 3 } });
    const h = a.compareHistory(d, [
        { from: '2026-03-31', to: '2026-03-31', basis: '2026-03-31 수집 (저장 스냅샷)', classes: [2, 0, 0, 0, 0, 0], mixed: null, special: null, origin: 'git' },
        { from: '2026-11-17', to: '2026-11-17', basis: '2026-11-17 기준', classes: [1, 0, 0, 0, 0, 0], mixed: 0, special: 0, origin: 'collect' },
    ]);
    assert.ok(h.notes.some(n => /과거 공식 공시는 받을 수 없어 YourPick이 모은 시점끼리/.test(n)));
    const cells = fs.readFileSync(path.resolve(__dirname, '../src/components/AgeClassCells.tsx'), 'utf8');
    assert.match(cells, /저장 스냅샷 비교/);
    assert.doesNotMatch(cells, /공시 비교</);
});

test('[Codex#3-4] same-day re-collection with different values keeps the latest; a multi-day state is split', () => {
    const list = [];
    historyBuilder.append(list, { from: '2026-10-01', to: '2026-10-01', classes: [1, 1, 0, 0, 0, 0], mixed: 0, special: 0 });
    historyBuilder.append(list, { from: '2026-11-17', to: '2026-11-17', classes: [1, 1, 0, 0, 0, 0], mixed: 0, special: 0 }); // 기간 연장
    historyBuilder.append(list, { from: '2026-11-17', to: '2026-11-17', classes: [1, 1, 0, 0, 0, 0], mixed: 0, special: 0 }); // 같은 값 → 그대로
    historyBuilder.append(list, { from: '2026-11-17', to: '2026-11-17', classes: [1, 2, 0, 0, 0, 0], mixed: 0, special: 0 }); // 같은 날 정정
    assert.deepEqual(list.map(e => [e.from, e.to, e.classes[1]]), [['2026-10-01', '2026-10-01', 1], ['2026-11-17', '2026-11-17', 2]]);
});

test('[Codex#3-5] missing or non-numeric source fields are 정보 부족, never 0 classes', () => {
    assert.equal(collector.kindergartenAgeClasses({}), undefined);
    assert.equal(collector.childcareAgeClasses({}), undefined);
    const partial = collector.childcareAgeClasses({ CLASS_CNT_00: '1', CLASS_CNT_01: 'x', CLASS_CNT_02: '' });
    assert.equal(partial.byAge[1].classes, null);
    assert.equal(partial.byAge[2].classes, null);
    const item = { ...daycare(), ageClasses: partial };
    assert.equal(a.ageClassStatus(item, 1).kind, 'unknown');
    assert.equal(a.ageClassStatus(item, 0).kind, 'own');
});

test('[Codex#3-6] mixed classes show their pupils and capacity as totals', () => {
    const k = kinder({}, [{ label: '혼합반', ages: [3, 4, 5], classes: 3, children: 75, capacity: 75 }]);
    assert.equal(a.mixedSummary(k).text, '혼합반(만 3~5세) 3개 (합계 원아 75명 · 정원 75명)');
});

test('[Codex#3-7] placeholder institutions are rejected by the data check', () => {
    const { isPlaceholder } = require('../scripts/check-data-counts.cjs');
    assert.equal(isPlaceholder({ id: '1', name: '어린이집 1', address: '주소 미상' }), true);
    assert.equal(isPlaceholder({ id: '41730000123', name: '귀여운어린이집', address: '경기도 여주시 세종로 173-45' }), false);
});

// ── Codex PR #3 재검수 지적 (2026-11-17) ───────────────────────────────

test('[Codex#3-R-A] unknown counts stay null from collector through history to comparison', () => {
    const partial = collector.childcareAgeClasses({ CLASS_CNT_00: '2', CLASS_CNT_01: '1', CLASS_CNT_02: '0', CLASS_CNT_03: '0', CLASS_CNT_04: '0', CLASS_CNT_05: '0' }); // 혼합·특수 필드 없음
    assert.equal(partial.mixedKnown, false);
    const unknownAge = { ...partial, byAge: { ...partial.byAge, 0: { classes: null, children: null } } };
    const entry = historyBuilder.entryFromCurrent({ source: '어린이집', ageClasses: unknownAge }, '2026-12-02');
    assert.equal(entry.classes[0], null);
    assert.equal(entry.mixed, null);
    assert.equal(entry.special, null);
    const roundTrip = JSON.parse(JSON.stringify(entry));
    const e = (from, classes) => ({ from, to: from, basis: null, classes, mixed: 0, special: 0, origin: 'collect' });
    const d = daycare({ 0: { classes: 2, children: 5 } });
    // 2 → (모름) → 2 : 변화로 보지 않는다
    assert.equal(a.compareHistory(d, [e('2026-10-01', [2, 0, 0, 0, 0, 0]), { ...roundTrip, classes: [null, 1, 0, 0, 0, 0] }, e('2027-01-05', [2, 0, 0, 0, 0, 0])]).changes.filter(c => c.age === 0).length, 0);
    // 2 → (모름) → 0 : 실제 0만 비교한다
    const h = a.compareHistory(daycare(), [e('2026-10-01', [2, 0, 0, 0, 0, 0]), { ...roundTrip, classes: [null, 1, 0, 0, 0, 0] }, e('2027-01-05', [0, 0, 0, 0, 0, 0])]);
    assert.deepEqual(h.changes.filter(c => c.age === 0).map(c => [c.kind, c.steps.length]), [['없어짐', 2]]);
    assert.equal(a.mixedSummary({ ...daycare(), ageClasses: partial }).text, '정보 부족');
});

test('[Codex#3-R-B] placeholder conditions are each detected on their own', () => {
    const { isPlaceholder } = require('../scripts/check-data-counts.cjs');
    const real = { id: '41730000015', name: '귀여운어린이집', address: '경기도 여주시 세종로 173-45' };
    assert.equal(isPlaceholder(real), false);
    assert.equal(isPlaceholder({ ...real, name: '어린이집 2' }), true);
    assert.equal(isPlaceholder({ ...real, name: '유치원 13' }), true);
    assert.equal(isPlaceholder({ ...real, id: '1' }), true);
    assert.equal(isPlaceholder({ ...real, id: '123' }), true);
    assert.equal(isPlaceholder({ ...real, address: '주소 미상' }), true);
    assert.equal(isPlaceholder({ ...real, name: '어린이집2호점' }), false);
});
