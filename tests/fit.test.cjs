/* eslint-disable @typescript-eslint/no-require-imports -- Node.js CommonJS entry point. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Load the real TypeScript modules the UI uses (fitConditions imports selectionCriteria).
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
const f = load('fitConditions');

const base = {
    id: 'x', name: '테스트', type: '민간', source: '어린이집', address: '서울특별시 관악구 미성동 1', phone: '',
    capacity: 50, currentPupils: 40, operatingHours: '07:30 ~ 19:30', hasSchoolBus: false,
    expenseLevel: '', ageRange: '만 0세 ~ 만 2세', tags: [], latitude: 37.47, longitude: 126.91, locationStatus: 'region_consistent',
};
const cond = (patch = {}) => ({ ...f.DEFAULT_CONDITIONS, ...patch, importance: { ...f.DEFAULT_CONDITIONS.importance, ...(patch.importance || {}) } });

test('no conditions → feature is inactive and the list behaves as before', () => {
    assert.equal(f.hasActiveConditions(f.DEFAULT_CONDITIONS, null), false);
    assert.equal(f.hasActiveConditions(cond({ childAge: 3 }), null), true);
    assert.equal(f.hasActiveConditions(f.DEFAULT_CONDITIONS, { kind: 'dong', label: '미성동', lat: 37.47, lng: 126.91 }), true);
});

test('age: outside the range is unmet, inside without the class is "확인 필요", missing range is never unmet', () => {
    assert.deepEqual(f.parseAgeRange('만 3세 ~ 5세'), [3, 5]);
    assert.equal(f.checkAge(base, 4).status, 'unmet');
    assert.equal(f.checkAge(base, 1).status, 'met');
    const withClasses = { ...base, ageBreakdown: { 0: { children: 3, classes: 1, ratio: 3 }, 2: { children: 7, classes: 1, ratio: 7 } } };
    assert.equal(f.checkAge(withClasses, 2).status, 'met');
    assert.equal(f.checkAge(withClasses, 1).status, 'unknown');
    assert.equal(f.checkAge({ ...base, ageRange: '-' }, 3).status, 'unknown');
});

test('unverifiable requirements are "확인 필요", never automatically rejected', () => {
    // 통학시간·예산은 데이터가 없으므로 필수로 정해도 미충족이 아니라 확인 필요.
    const checks = f.evaluateFit(base, cond({ commuteMode: 'walk', maxCommuteMinutes: 15, commuteNeed: 'required', monthlyBudget: 30, budgetNeed: 'required' }));
    assert.deepEqual(checks.map(x => x.status), ['unknown', 'unknown']);
    assert.equal(f.fitGroup(checks), 1);
    // 방과후 표시가 없다고 운영하지 않는다는 뜻은 아니다.
    assert.equal(f.checkAfterSchool(base).status, 'unknown');
    assert.equal(f.checkAfterSchool({ ...base, tags: ['야간연장'] }).status, 'met');
});

test('school bus: operation is shown but boarding is never claimed', () => {
    const withBus = f.checkCommute({ ...base, hasSchoolBus: true }, 'bus', null);
    assert.equal(withBus.status, 'unknown');
    assert.match(withBus.reason, /탑승 가능 여부는 직접 확인/);
    assert.equal(f.checkCommute(base, 'bus', null).status, 'unknown');
});

test('straight distance is labelled as such and skipped for unconfirmed coordinates', () => {
    const here = { kind: 'dong', label: '미성동', lat: 37.4743, lng: 126.9149 };
    const r = f.assessFit(base, cond(), here);
    assert.equal(typeof r.distanceKm, 'number');
    assert.ok(r.reasons.some(x => x.includes('통학시간 아님')));
    const unconfirmed = f.assessFit({ ...base, locationStatus: 'unconfirmed', latitude: null, longitude: null }, cond(), here);
    assert.equal(unconfirmed.distanceKm, null);
    assert.ok(unconfirmed.unverified.some(x => x.startsWith('위치')));
});

test('objective score ignores criteria without data instead of penalising them', () => {
    const good = { ...base, source: '유치원', ageRange: '만 3세 ~ 5세', childrenPerTeacher: 8 }; // 돌봄 여유: level 3
    const s = f.objectiveScore(good, cond({ importance: { care: 2, stability: 1, safety: 0, education: 2 } }));
    // stability(정보 없음)·education(공시 지표 없음)은 빠지고 care만 남는다 → 3.0
    assert.equal(s.score, 3);
    assert.deepEqual(s.missing.sort(), ['교사 안정성', '교육과정'].sort());
    assert.equal(f.objectiveScore(base, cond({ importance: { care: 0, stability: 0, safety: 0, education: 0 } })).score, null);
});

test('importance changes the ranking between institutions', () => {
    const roomy = { ...base, id: 'a', source: '유치원', ageRange: '만 3세 ~ 5세', childrenPerTeacher: 8, teacherTenure: { under1: 60, year1to2: 10, year2to4: 10, year4to6: 10, over6: 10 } };
    const stable = { ...base, id: 'b', source: '유치원', ageRange: '만 3세 ~ 5세', childrenPerTeacher: 14, teacherTenure: { under1: 10, year1to2: 10, year2to4: 20, year4to6: 30, over6: 30 } };
    const careFirst = cond({ importance: { care: 2, stability: 0, safety: 0, education: 0 } });
    const stableFirst = cond({ importance: { care: 0, stability: 2, safety: 0, education: 0 } });
    const order = (c) => [roomy, stable].map(i => ({ id: i.id, r: f.assessFit(i, c, null) })).sort((x, y) => f.compareFit(x.r, y.r)).map(x => x.id);
    assert.deepEqual(order(careFirst), ['a', 'b']);
    assert.deepEqual(order(stableFirst), ['b', 'a']);
});

test('ranking groups: met → 확인 필요 → unmet, and unmet stays in the list', () => {
    const c = cond({ childAge: 4, ageNeed: 'required' });
    const kinder = { ...base, id: 'k', source: '유치원', ageRange: '만 3세 ~ 5세' };
    const infant = { ...base, id: 'i' };                     // 만 0~2세 → 미충족
    const unknownAge = { ...base, id: 'u', ageRange: '' };   // 연령 공시 없음 → 확인 필요
    const sorted = [infant, unknownAge, kinder].map(i => ({ id: i.id, r: f.assessFit(i, c, null) })).sort((x, y) => f.compareFit(x.r, y.r));
    assert.deepEqual(sorted.map(x => x.id), ['k', 'u', 'i']);
    assert.deepEqual(sorted.map(x => x.r.group), [0, 1, 2]);
});

test('preferred conditions only reorder within a group; distance is the last tie-breaker', () => {
    const c = cond({ afterSchool: 'preferred' });
    const here = { kind: 'dong', label: '미성동', lat: 37.47, lng: 126.91 };
    const near = { ...base, id: 'near', latitude: 37.471, longitude: 126.911 };
    const far = { ...base, id: 'far', latitude: 37.5, longitude: 126.95 };
    const farWithAfter = { ...far, id: 'farAfter', tags: ['방과후운영'] };
    const sorted = [near, far, farWithAfter].map(i => ({ id: i.id, r: f.assessFit(i, c, here) })).sort((x, y) => f.compareFit(x.r, y.r)).map(x => x.id);
    assert.deepEqual(sorted, ['farAfter', 'near', 'far']);
});

test('sparse data neither outranks fuller evidence nor sinks below 보통', () => {
    const c = cond({ importance: { care: 1, stability: 1, safety: 1, education: 1 } });
    // 안전·위생만 공시된 기관(좋음 1개) vs 세 기준 모두 공시(좋음·보통·좋음)
    const sparse = { ...base, id: 's', cctvCount: 2, capacity: 30 };
    const full = { ...base, id: 'f', source: '유치원', ageRange: '만 3세 ~ 5세', childrenPerTeacher: 8, safetyStatus: '소방대피훈련,CCTV,가스점검', capacity: 30,
        teacherTenure: { under1: 30, year1to2: 20, year2to4: 20, year4to6: 15, over6: 15 } };
    const rs = f.assessFit(sparse, c, null), rf = f.assessFit(full, c, null);
    assert.equal(rs.objective.score, 3);
    assert.equal(rs.objective.used, 1);
    assert.ok(rs.objective.rankScore < rf.objective.rankScore, `${rs.objective.rankScore} < ${rf.objective.rankScore}`);
    assert.ok(rs.objective.rankScore >= 2);
});
