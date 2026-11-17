import type { Institution } from '../types/institution';
import { assessCare, assessSafety, assessStability, ageBreakdownReliable, type Assessment, type Level } from './selectionCriteria';
import { ageClassStatus, childPath, classAgeFor, currentSchoolYear, mixedSummary } from './ageClasses';

/**
 * 맞춤 조건 (2026-11 1단계).
 *
 * 두 가지를 따로 계산한다.
 *  1) 공시 평가: 기존 판정(돌봄 여유·교사 안정성·안전·위생)을 사용자가 정한 중요도로 가중 평균.
 *     판단할 정보가 없는 기준은 빼고 계산한다(정보가 없다고 깎지 않는다).
 *  2) 조건 적합성: 연령·방과후·통학·예산 조건을 기관마다 충족 / 미충족 / 확인 필요로 판정.
 *     확인할 수 없는 것은 미충족으로 처리하지 않는다.
 *
 * 경로 API를 아직 연결하지 않았으므로 통학시간은 항상 '확인 필요'다. 직선거리는 참고로만 보여 주고
 * 통학시간이라고 부르지 않는다. 예산도 공시 원비를 모으지 않아 항상 '확인 필요'다.
 */

export type Need = 'off' | 'preferred' | 'required';
export type CommuteMode = 'walk' | 'car' | 'transit' | 'bus';
export type Importance = 0 | 1 | 2; // 0 상관없음, 1 보통, 2 중요
export type MixedPreference = 'any' | 'prefer' | 'avoid';

export interface FitLocation {
    /** 'dong' = 고른 행정동의 대표 지점, 'device' = 기기 현재 위치(저장하지 않음) */
    kind: 'dong' | 'device';
    label: string;
    /** 행정동을 고른 지역(시군구). 다른 지역 기관에는 이 위치를 쓰지 않는다. */
    sggCode?: string;
    lat: number;
    lng: number;
}

export interface FitConditions {
    /** 출생연도. 반 연령 = 학년도 − 출생연도 − 1 */
    birthYear: number | null;
    /** 입학(입소) 예정 학년도. 정하지 않으면 지금 학년도 */
    entryYear: number | null;
    /** 희망 재원 기간(학년도 수). null = 졸업(만 5세반)까지 */
    stayYears: number | null;
    /** 혼합연령반 개인 선호. 공시 평가 점수·필수 조건에는 넣지 않는다. */
    mixedPreference: MixedPreference;
    ageNeed: Need;
    afterSchool: Need;                   // 방과후과정·연장보육 이용
    commuteMode: CommuteMode | null;
    maxCommuteMinutes: number | null;
    commuteNeed: Need;
    monthlyBudget: number | null;        // 만원
    budgetNeed: Need;
    importance: { care: Importance; stability: Importance; safety: Importance; education: Importance };
}

export const DEFAULT_CONDITIONS: FitConditions = {
    birthYear: null,
    entryYear: null,
    stayYears: null,
    mixedPreference: 'any',
    ageNeed: 'required',
    afterSchool: 'off',
    commuteMode: null,
    maxCommuteMinutes: null,
    commuteNeed: 'preferred',
    monthlyBudget: null,
    budgetNeed: 'preferred',
    importance: { care: 1, stability: 1, safety: 1, education: 1 },
};

export const COMMUTE_LABEL: Record<CommuteMode, string> = { walk: '도보', car: '자가용', transit: '대중교통', bus: '통학차량' };

export type FitStatus = 'met' | 'unmet' | 'unknown';

export interface FitCheck {
    key: 'age' | 'continuity' | 'mixed' | 'afterSchool' | 'commute' | 'budget';
    label: string;
    need: Exclude<Need, 'off'>;
    status: FitStatus;
    reason: string;
    /** '확인 필요'이지만 현재 공시가 뒷받침하는 경우(예: 다음 학년도 입학인데 지금 그 연령 반이 있음) */
    evidence?: boolean;
}

/** 입학 예정 학년도의 반 연령. 출생연도가 없으면 null */
export function entryAge(c: FitConditions, now: Date = new Date()): { age: number; schoolYear: number } | null {
    if (c.birthYear === null) return null;
    const schoolYear = c.entryYear ?? currentSchoolYear(now);
    return { age: classAgeFor(c.birthYear, schoolYear), schoolYear };
}

/** 조건을 하나라도 정했는지 (정하지 않으면 기존 화면 그대로) */
export function hasActiveConditions(c: FitConditions, location: FitLocation | null): boolean {
    return Boolean(location)
        || (c.birthYear !== null && c.ageNeed !== 'off')
        || c.mixedPreference !== 'any'
        || c.afterSchool !== 'off'
        || (c.commuteMode !== null && c.commuteNeed !== 'off')
        || (c.monthlyBudget !== null && c.budgetNeed !== 'off');
}

/** "만 0세 ~ 만 2세", "만 3세 ~ 5세" → [0, 2]. 못 읽으면 null */
export function parseAgeRange(text: string | undefined): [number, number] | null {
    const ages = (text ?? '').match(/\d+/g)?.map(Number).filter(n => n >= 0 && n <= 7);
    if (!ages || ages.length === 0) return null;
    return [Math.min(...ages), Math.max(...ages)];
}

type CheckResult = Pick<FitCheck, 'status' | 'reason' | 'evidence'>;

/**
 * 연령 조건. future = 입학 학년도가 다음 학년도 이후 → 현재 공시로는 확정할 수 없어 '확인 필요'로 두되,
 * 지금 그 연령 반이 있으면 evidence 로 표시한다. 유치원 만 0~2세처럼 구조적으로 안 되는 경우만 미충족.
 */
export function checkAge(item: Institution, age: number, future = false, now: Date = new Date()): CheckResult {
    if (age < 0) return { status: 'unknown', reason: '그 학년도에는 아직 반 연령이 아니에요' };
    if (age > 5) return { status: 'unmet', reason: `그 학년도에는 만 ${age}세라 초등학교 입학 연령이에요` };
    if (item.ageClasses || (item.source === '유치원' && age < 3)) {
        const st = ageClassStatus(item, age, now);
        const basis = item.ageClasses?.basis?.label ?? '공시';
        if (st.kind === 'not-applicable') return { status: 'unmet', reason: st.detail };
        if (st.kind === 'own' || st.kind === 'mixed') {
            return future
                ? { status: 'unknown', evidence: true, reason: `현재 공시(${basis}) 운영 확인(${st.kind === 'own' ? `단독반 ${st.classes}개` : '혼합반'}) · 그 학년도는 운영계획 확인 필요` }
                : { status: 'met', reason: `${st.detail} (${basis})` };
        }
        if (st.kind === 'none') {
            return future
                ? { status: 'unknown', reason: `현재 공시(${basis})에는 만 ${age}세 반 미운영 · 그 학년도는 운영계획 확인 필요` }
                : { status: 'unmet', reason: `${basis}에 만 ${age}세 반이 없어요` };
        }
        return { status: 'unknown', reason: st.detail };
    }
    // 연령반 공시가 없는 기관: 다음 학년도 이후는 대상 연령만으로 판단하지 않는다.
    if (future) return { status: 'unknown', reason: '연령별 학급 공시가 없어 그 학년도 운영은 확인 필요' };
    const range = parseAgeRange(item.ageRange);
    if (!range) return { status: 'unknown', reason: '대상 연령 공시 없음' };
    if (age < range[0] || age > range[1]) {
        return { status: 'unmet', reason: `대상 연령 만 ${range[0]}~${range[1]}세 (만 ${age}세 해당 없음)` };
    }
    if (item.ageBreakdown && ageBreakdownReliable(item)) {
        const cls = item.ageBreakdown[age];
        if (cls && cls.classes > 0) return { status: 'met', reason: `만 ${age}세 반 ${cls.classes}개 공시` };
        return { status: 'unknown', reason: `대상 연령에는 들지만 만 ${age}세 반은 공시에 없음` };
    }
    return { status: 'met', reason: `대상 연령 만 ${range[0]}~${range[1]}세` };
}

/** 졸업(만 5세반)까지. 미래 학년도가 섞이므로 확정하지 않고, 현재 공시가 받쳐 주면 evidence 만 준다. */
export function checkContinuity(item: Institution, birthYear: number, entryYear: number, now: Date = new Date(), stayYears: number | null = null): CheckResult {
    const path = childPath(item, birthYear, entryYear, now, stayYears);
    if (path.years.length === 0) return { status: 'unknown', reason: path.summary };
    const allCurrent = path.years.every(y => y.current);
    // 정보 부족·범위 미공시 혼합반이 하나라도 있으면 근거로 치지 않는다(Codex #3 리뷰 1).
    if (allCurrent && path.supported) return { status: 'met', reason: path.summary };
    if (allCurrent && path.gaps.length > 0) return { status: 'unmet', reason: path.summary };
    return { status: 'unknown', evidence: path.supported, reason: path.summary };
}

/**
 * 혼합연령반 개인 선호. 늘 '선호' 조건으로만 쓴다(필수·감점 없음). 혼합반 운영 자체를 나쁘게 보지 않는다.
 * age 가 있으면 그 연령 반이 혼합반인지, 없으면 기관이 혼합반을 운영하는지로 본다.
 */
export function checkMixedPreference(item: Institution, pref: Exclude<MixedPreference, 'any'>, age: number | null, now: Date = new Date()): CheckResult {
    let mixed: boolean | null;
    let what: string;
    if (age !== null && age >= 0 && age <= 5) {
        const st = ageClassStatus(item, age, now);
        mixed = st.kind === 'mixed' ? true : st.kind === 'own' ? false : null;
        what = mixed === null ? `만 ${age}세 반 운영 형태 정보 부족` : `만 ${age}세는 ${mixed ? '혼합반' : '단독반'}으로 운영(현재 공시)`;
    } else {
        const m = mixedSummary(item);
        mixed = m.text === '정보 부족' ? null : m.has;
        what = mixed === null ? '혼합반 운영 정보 부족' : mixed ? `혼합반 운영: ${m.text}` : '혼합반 없음(현재 공시)';
    }
    if (mixed === null) return { status: 'unknown', reason: what };
    const matches = pref === 'prefer' ? mixed : !mixed;
    return { status: matches ? 'met' : 'unmet', reason: `${what} · ${matches ? '선호와 같음' : '선호와 다름'}` };
}

const AFTER_SCHOOL_SIGNALS = /방과후|야간연장|시간연장|연장보육|24시간/;

export function checkAfterSchool(item: Institution): Pick<FitCheck, 'status' | 'reason'> {
    const signals = `${item.operatingHours ?? ''},${item.specialPrograms ?? ''},${(item.tags ?? []).join(',')}`;
    const found = signals.match(AFTER_SCHOOL_SIGNALS);
    if (found) return { status: 'met', reason: `공시에 '${found[0]}' 표시` };
    // 공시에 표시가 없다고 운영하지 않는다는 뜻은 아니다.
    return { status: 'unknown', reason: item.source === '유치원' ? '방과후과정 운영 공시 없음 · 직접 확인' : '연장보육 공시 없음 · 직접 확인' };
}

export function checkCommute(item: Institution, mode: CommuteMode, maxMinutes: number | null): Pick<FitCheck, 'status' | 'reason'> {
    if (mode === 'bus') {
        // 공시는 운영 여부만 알려 준다. 우리 동네를 지나는지, 자리가 있는지는 알 수 없다.
        if (item.hasSchoolBus) return { status: 'unknown', reason: '통학차량 운영 · 노선과 탑승 가능 여부는 직접 확인' };
        return { status: 'unknown', reason: '통학차량 운영 공시 없음 · 직접 확인' };
    }
    const limit = maxMinutes ? ` (편도 ${maxMinutes}분 이내)` : '';
    return { status: 'unknown', reason: `${COMMUTE_LABEL[mode]} 통학시간 미확인${limit} · 경로 조회는 아직 지원하지 않아요` };
}

export function checkBudget(budget: number): Pick<FitCheck, 'status' | 'reason'> {
    return { status: 'unknown', reason: `월 ${budget}만원 이내인지 미확인 · 원비는 공시 포털에서 확인` };
}

export function evaluateFit(item: Institution, c: FitConditions, now: Date = new Date()): FitCheck[] {
    const checks: FitCheck[] = [];
    const entry = entryAge(c, now);
    if (entry && c.birthYear !== null && c.ageNeed !== 'off') {
        const future = entry.schoolYear > currentSchoolYear(now);
        checks.push({ key: 'age', label: `${entry.schoolYear}학년도 만 ${entry.age}세반`, need: c.ageNeed, ...checkAge(item, entry.age, future, now) });
        if (entry.age <= 5) {
            checks.push({ key: 'continuity', label: c.stayYears ? `희망 재원 ${c.stayYears}년` : '졸업까지', need: 'preferred', ...checkContinuity(item, c.birthYear, entry.schoolYear, now, c.stayYears) });
        }
    }
    if (c.mixedPreference !== 'any') {
        const age = entry && entry.age >= 0 && entry.age <= 5 ? entry.age : null;
        checks.push({ key: 'mixed', label: c.mixedPreference === 'prefer' ? '혼합반 선호' : '혼합반 피하고 싶음', need: 'preferred', ...checkMixedPreference(item, c.mixedPreference, age, now) });
    }
    if (c.afterSchool !== 'off') {
        checks.push({ key: 'afterSchool', label: item.source === '유치원' ? '방과후과정' : '연장보육', need: c.afterSchool, ...checkAfterSchool(item) });
    }
    if (c.commuteMode !== null && c.commuteNeed !== 'off') {
        checks.push({ key: 'commute', label: COMMUTE_LABEL[c.commuteMode], need: c.commuteNeed, ...checkCommute(item, c.commuteMode, c.maxCommuteMinutes) });
    }
    if (c.monthlyBudget !== null && c.budgetNeed !== 'off') {
        checks.push({ key: 'budget', label: '예산', need: c.budgetNeed, ...checkBudget(c.monthlyBudget) });
    }
    return checks;
}

/** 0 = 필수 조건 모두 충족, 1 = 필수 중 확인 필요가 있음(미충족은 없음), 2 = 필수 조건 미충족 */
export type FitGroup = 0 | 1 | 2;

export function fitGroup(checks: FitCheck[]): FitGroup {
    const required = checks.filter(x => x.need === 'required');
    if (required.some(x => x.status === 'unmet')) return 2;
    if (required.some(x => x.status === 'unknown')) return 1;
    return 0;
}

export const FIT_GROUP_LABEL: Record<FitGroup, string> = { 0: '필수 조건 충족', 1: '확인 필요', 2: '필수 조건 미충족' };

/** 필수 조건을 하나도 정하지 않았으면 '충족'이라고 하지 않는다. */
export function fitGroupLabel(result: Pick<FitResult, 'group' | 'checks'>): string {
    if (!result.checks.some(x => x.need === 'required')) return '필수 조건 없음';
    return FIT_GROUP_LABEL[result.group];
}

/** 고른 행정동이 이 지역(시군구) 것일 때만 쓴다. 기기 현재 위치는 실제 위치라 어디서나 쓴다. */
export function locationApplies(location: FitLocation | null, sggCode: string | undefined): boolean {
    if (!location) return false;
    if (location.kind !== 'dong') return true;
    return Boolean(location.sggCode) && location.sggCode === sggCode;
}

export interface WeightedPart {
    key: 'care' | 'stability' | 'safety' | 'education';
    label: string;
    weight: Importance;
    assessment: Assessment | null; // null = 공시로 판단할 자료 없음
}

export interface ObjectiveScore {
    /** 1~3 (주의~좋음). 정보가 있는 기준만의 가중 평균. 판단할 기준이 하나도 없으면 null */
    score: number | null;
    /** 정렬용 점수. 정보가 없는 기준은 '보통(2)'으로 채워 자료가 적다고 깎지도, 올려 주지도 않는다. */
    rankScore: number | null;
    /** 자료가 있어 계산에 쓴 기준 수 */
    used: number;
    /** 중요도를 줘서 점수에 들어간 기준 수(교육과정 제외) */
    considered: number;
    parts: WeightedPart[];
    /** 중요도를 줬지만 정보가 없어 계산에서 뺀 기준 */
    missing: string[];
}

const NEUTRAL_LEVEL = 2;

export function objectiveScore(item: Institution, c: FitConditions): ObjectiveScore {
    const parts: WeightedPart[] = [
        { key: 'care', label: '돌봄 여유', weight: c.importance.care, assessment: assessCare(item) },
        { key: 'stability', label: '교사 안정성', weight: c.importance.stability, assessment: assessStability(item) },
        { key: 'safety', label: '안전·위생', weight: c.importance.safety, assessment: assessSafety(item) },
        // 교육과정은 공시로 비교할 수 있는 지표가 없다. 중요도를 줘도 점수에는 들어가지 않는다.
        { key: 'education', label: '교육과정', weight: c.importance.education, assessment: null },
    ];
    let total = 0;
    let weights = 0;
    let rankTotal = 0;
    let rankWeights = 0;
    let used = 0;
    let considered = 0;
    const missing: string[] = [];
    for (const p of parts) {
        if (p.weight === 0) continue;
        if (p.key !== 'education') considered++;
        const level: Level = p.assessment?.level ?? 0;
        if (level === 0) {
            missing.push(p.label);
            // 교육과정은 어느 기관도 공시 지표가 없어 정렬에 넣으면 모두에게 같은 값이 더해질 뿐이다.
            if (p.key !== 'education') { rankTotal += NEUTRAL_LEVEL * p.weight; rankWeights += p.weight; }
            continue;
        }
        total += level * p.weight;
        weights += p.weight;
        rankTotal += level * p.weight;
        rankWeights += p.weight;
        used++;
    }
    // 화면에 보이는 값(소수 첫째 자리)과 정렬에 쓰는 값이 같도록 같은 자리에서 반올림한다.
    const round = (n: number) => Math.round(n * 10) / 10;
    return {
        score: weights > 0 ? Math.round((total / weights) * 10) / 10 : null,
        rankScore: weights > 0 && rankWeights > 0 ? round(rankTotal / rankWeights) : null,
        used,
        considered,
        parts,
        missing,
    };
}

/** 화면 표시: 정렬에 쓰는 점수 그대로. 자료가 없는 기준은 '보통'으로 계산했다고 함께 밝힌다. */
export function objectiveText(o: ObjectiveScore): { main: string; coverage: string | null } {
    if (o.rankScore === null) return { main: '판단 자료 없음', coverage: null };
    const coverage = o.used < o.considered ? `자료 ${o.used}/${o.considered}개 기준 · 나머지는 보통(2)으로 계산` : `자료 ${o.used}/${o.considered}개 기준`;
    return { main: `${scoreWord(o.rankScore)} ${o.rankScore.toFixed(1)}/3`, coverage };
}

export function scoreWord(score: number | null): string {
    if (score === null) return '판단 자료 없음';
    if (score >= 2.5) return '좋음';
    if (score >= 1.75) return '보통';
    return '주의';
}

/** 두 좌표 사이 직선거리(km). 통학시간이 아니다. */
export function straightDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const rad = Math.PI / 180;
    const dLat = (lat2 - lat1) * rad;
    const dLng = (lng2 - lng1) * rad;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
    return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function distanceFrom(item: Institution, location: FitLocation | null): number | null {
    if (!location || item.locationStatus === 'unconfirmed' || item.latitude == null || item.longitude == null) return null;
    return Math.round(straightDistanceKm(location.lat, location.lng, item.latitude, item.longitude) * 10) / 10;
}

export interface FitResult {
    group: FitGroup;
    checks: FitCheck[];
    objective: ObjectiveScore;
    preferredMet: number;
    /** 필수 조건 중 '확인 필요'이지만 현재 공시가 뒷받침하는 수 */
    requiredSupported: number;
    distanceKm: number | null;
    /** 추천 이유 (화면에 그대로 보여 준다) */
    reasons: string[];
    /** 확인되지 않은 조건 */
    unverified: string[];
}

export function assessFit(item: Institution, c: FitConditions, location: FitLocation | null, now: Date = new Date()): FitResult {
    const checks = evaluateFit(item, c, now);
    const objective = objectiveScore(item, c);
    const usable = locationApplies(location, item.sggCode) ? location : null;
    const distanceKm = distanceFrom(item, usable);
    const reasons: string[] = [];
    for (const x of checks) if (x.status === 'met') reasons.push(`${x.label}: ${x.reason}`);
    for (const p of objective.parts) {
        if (p.weight === 2 && p.assessment && p.assessment.level > 0) reasons.push(`${p.label}(중요): ${p.assessment.verdict} ${p.assessment.value}`);
    }
    if (distanceKm !== null) reasons.push(`${location?.label}에서 직선 ${distanceKm}km (통학시간 아님)`);
    const unverified = checks.filter(x => x.status === 'unknown').map(x => `${x.label}: ${x.reason}`);
    if (location && !usable) unverified.push(`위치: 고른 동(${location.label})과 다른 지역이라 거리를 계산하지 않았어요`);
    else if (usable && distanceKm === null) unverified.push('위치 좌표 미확인이라 거리를 계산하지 않았어요');
    return {
        group: fitGroup(checks),
        checks,
        objective,
        preferredMet: checks.filter(x => x.need === 'preferred' && (x.status === 'met' || x.evidence)).length,
        requiredSupported: checks.filter(x => x.need === 'required' && x.status === 'unknown' && x.evidence).length,
        distanceKm,
        reasons,
        unverified,
    };
}

/**
 * 맞춤 추천순. 필수 조건 충족 → 확인 필요 → 미충족 묶음 순서로 두고(미충족도 숨기지 않는다),
 * 묶음 안에서는 공시 평가(정보 없는 기준은 보통으로 채운 점수) → 충족한 선호 조건 수 →
 * 직선거리(가까운 순, 참고) 순으로 정렬한다. 판단할 기준이 하나도 없는 기관은 같은 묶음의 맨 뒤에 둔다.
 */
export function compareFit(a: FitResult, b: FitResult): number {
    if (a.group !== b.group) return a.group - b.group;
    // 같은 '확인 필요' 묶음 안에서는 현재 공시가 받쳐 주는 필수 조건이 많은 곳을 먼저.
    if (a.requiredSupported !== b.requiredSupported) return b.requiredSupported - a.requiredSupported;
    const sa = a.objective.rankScore, sb = b.objective.rankScore;
    if (sa !== sb) {
        if (sa === null) return 1;
        if (sb === null) return -1;
        return sb - sa;
    }
    if (a.preferredMet !== b.preferredMet) return b.preferredMet - a.preferredMet;
    if (a.distanceKm !== b.distanceKm) {
        if (a.distanceKm === null) return 1;
        if (b.distanceKm === null) return -1;
        return a.distanceKm - b.distanceKm;
    }
    return 0;
}
