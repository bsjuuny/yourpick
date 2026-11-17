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

// ── Codex PR #6 1차 검수 지적 재현 (2026-11-17) ─────────────────────────

test('[Codex#6-1] a past-year kindergarten disclosure is not evidence of current operation', () => {
    const old = kinder({ 3: { classes: 1, children: 10, capacity: 16 } });
    old.ageClasses.basis = { kind: 'disclosure', key: '20232', label: '2023년 2차 공시' };
    assert.equal(a.isStaleBasis(old, NOW), true);
    const st = a.ageClassStatus(old, 3, NOW);
    assert.equal(st.kind, 'unknown');
    assert.equal(st.stale, true);
    assert.match(st.label, /최신 공시 아님\(2023년 2차 공시: 운영 확인 · 단독반 1개\)/);
    assert.equal(a.operationStatus(st, false), '정보 부족');
    const age = f.checkAge(old, 3, false, NOW);
    assert.equal(age.status, 'unknown');
    assert.notEqual(age.evidence, true);
    const r = f.assessFit(old, cond({ birthYear: 2022, entryYear: 2026, ageNeed: 'required' }), null, NOW);
    assert.equal(r.group, 1); // 필수 조건 충족으로 올리지 않는다
    assert.equal(a.childPath(old, 2022, 2026, NOW).supported, false);
    // 같은 학년도 공시는 그대로 운영 확인
    assert.equal(a.isStaleBasis(kinder(), NOW), false);
    // 어린이집 기준일은 그 날짜의 학년도(1~2월은 전 학년도)
    const d = daycare({ 0: { classes: 1, children: 3 } });
    d.ageClasses.basis = { kind: 'date', key: '2027-02-10', label: '2027-02-10 기준' };
    assert.equal(a.basisSchoolYear(d), 2026);
});

test('[Codex#6-4] a mixed class whose ages are not disclosed never confirms a specific age', () => {
    const m2 = daycare({ 1: { classes: 1, children: 5 } }, [{ label: '영아혼합반', ages: null, possibleAges: [0, 1, 2], classes: 1, children: 6 }]);
    const s0 = a.ageClassStatus(m2, 0, NOW);
    assert.equal(s0.kind, 'mixed-unknown-range');
    assert.equal(a.operationStatus(s0, false), '정보 부족');
    assert.match(s0.label, /혼합반 구성 연령 확인 필요/);
    assert.equal(a.ageClassStatus(m2, 1, NOW).kind, 'own'); // 단독반이 있으면 그대로 운영 확인
    assert.equal(a.ageClassStatus(m2, 4, NOW).kind, 'none'); // 범위 밖 연령은 혼합반과 무관
    assert.equal(a.mixedSummary(m2).text, '영아혼합반(만 0~2세 중 일부) 1개 (합계 원아 6명)');
    assert.equal(f.checkAge(m2, 0, false, NOW).status, 'unknown');
    const k = kinder({}, [{ label: '혼합반', ages: null, possibleAges: [3, 4, 5], classes: 2, children: 30, capacity: 40 }]);
    assert.equal(a.childPath(k, 2023, 2026, NOW).supported, false);
});

test('[Codex#6-3] current history dates come only from files the collector actually re-fetched', () => {
    const manifest = { '11_11110.json': '2026-12-02', '11_11110_childcare.json': '2026-11-17' };
    assert.equal(historyBuilder.currentEntryDate(manifest, '11_11110', '유치원'), '2026-12-02');
    assert.equal(historyBuilder.currentEntryDate(manifest, '11_11110', '어린이집'), '2026-11-17'); // 이번에 실패 → 예전 날짜
    assert.equal(historyBuilder.currentEntryDate(manifest, '11_11140', '어린이집'), null); // 기록 없음 → 덧붙이지 않음
    // 예전 날짜로 다시 덧붙이면 기존 기간을 늘리지 않는다
    const list = [{ from: '2026-11-17', to: '2026-11-17', classes: [1, 0, 0, 0, 0, 0], children: [3, null, null, null, null, null], capacity: 20, pupils: 15, mixed: 0, special: 0 }];
    historyBuilder.append(list, { ...list[0] });
    assert.deepEqual(list.map(e => [e.from, e.to]), [['2026-11-17', '2026-11-17']]);
    assert.ok(fs.existsSync(path.resolve(__dirname, '../public/data/fetch-manifest.json')));
});

test('[Codex#6-5] the standard class-age rule is labelled and exceptions become a question', () => {
    const qs = q.preEntryQuestions(kinder({ 3: { classes: 1, children: 10, capacity: 16 } }), { birthYear: 2022, entryYear: 2026, stayYears: null, now: NOW });
    const ex = qs.find(x => x.id === 'class-exception');
    assert.ok(ex);
    assert.match(ex.why, /표준 반편성/);
});

test('[Codex#6-6] no UI text hints that a problem or conflict happened', () => {
    const forbidden = /분쟁|갈등|불만|다툼|민원|문제가 있었|폐반 위험|위험 높음/;
    const files = ['src/components/CompareTable.tsx', 'src/components/CommunicationCells.tsx', 'src/components/AgeClassCells.tsx', 'src/components/fit/FitConditionsPanel.tsx', 'src/components/fit/FitSummary.tsx', 'src/utils/preEntryQuestions.ts', 'src/utils/ageClasses.ts', 'src/utils/fitConditions.ts'];
    const hits = [];
    for (const file of files) {
        // 주석(원칙 설명)은 빼고 화면에 나갈 수 있는 코드만 본다
        const code = fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
        for (const line of code.split('\n')) if (forbidden.test(line)) hits.push(`${file}: ${line.trim()}`);
    }
    assert.deepEqual(hits, []);
});

// ── Claude 독립 검수 지적 재현 (2026-11-17) ──────────────────────────────

test('[Claude-2] mixed-class preference does not use a past-year disclosure as current evidence', () => {
    const old = kinder({ 3: { classes: 1, children: 10, capacity: 16 } }, [{ label: '혼합반', ages: null, possibleAges: [3, 4, 5], classes: 1, children: 20 }]);
    old.ageClasses.basis = { kind: 'disclosure', key: '20242', label: '2024년 2차 공시' };
    for (const pref of ['prefer', 'avoid']) {
        assert.equal(f.checkMixedPreference(old, pref, null, NOW).status, 'unknown');
        assert.equal(f.checkMixedPreference(old, pref, 3, NOW).status, 'unknown');
    }
    assert.match(a.mixedSummary(old, NOW).text, /최신 공시 아님\(2024년 2차 공시\)/);
    assert.doesNotMatch(a.mixedSummary(kinder({}, [{ label: '혼합반', ages: null, possibleAges: [3, 4, 5], classes: 1, children: 20 }]), NOW).text, /최신 공시 아님/);
});

test('[Claude-3] a saved entry year that is now in the past starts from the current school year', () => {
    const k = kinder({ 4: { classes: 1, children: 10, capacity: 16 }, 5: { classes: 1, children: 10, capacity: 16 } });
    const p = a.childPath(k, 2022, 2025, NOW); // 2025학년도는 이미 지났다
    assert.deepEqual(p.years.map(y => y.schoolYear), [2026, 2027, 2028]); // 2022년생: 2026 만3, 2027 만4, 2028 만5
    const e = f.entryAge({ ...f.DEFAULT_CONDITIONS, birthYear: 2022, entryYear: 2025 }, NOW);
    assert.deepEqual(e, { age: 3, schoolYear: 2026 });
});
