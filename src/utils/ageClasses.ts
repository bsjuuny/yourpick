import type { Institution } from '../types/institution';

/**
 * 연령반 운영 현황 (2026-11-17).
 *
 * 원칙
 *  - 공시 원본(유치원 알리미 공시차수, 어린이집 정보공개 기준일)의 숫자만 보여 주고, 기준을 함께 적는다.
 *  - '폐반'·'폐반 예정'이라는 말을 쓰지 않는다. 학급 수가 줄었거나 0이 된 것은 '공시상 변화'일 뿐이다.
 *  - 단독반이 없어도 혼합반으로 운영하면 따로 구분한다.
 *  - 다음 학년도 이후 운영은 공식 모집자료나 기관 확인 전까지 확정하지 않는다(항상 '확인 필요').
 *  - 확률·위험 점수를 만들지 않는다.
 */

export type ClassStatusKind = 'own' | 'mixed' | 'mixed-unknown-range' | 'none' | 'not-applicable' | 'unknown';

export interface AgeClassStatus {
    age: number;
    kind: ClassStatusKind;
    /** 짧은 판정 (단독반 2개, 혼합반으로 운영, 이번 공시에 없음, …) */
    label: string;
    /** 풀어 쓴 설명 */
    detail: string;
    classes: number;
    children: number | null;
    capacity?: number | null;
    waiting?: number | null;
}

export function applicableAges(item: Institution): number[] {
    return item.source === '유치원' ? [3, 4, 5] : [0, 1, 2, 3, 4, 5];
}

export function basisLabel(item: Institution): string {
    return item.ageClasses?.basis?.label ?? '기준 정보 없음';
}

export function ageClassStatus(item: Institution, age: number): AgeClassStatus {
    const base = { age, classes: 0, children: 0 };
    if (item.source === '유치원' && age < 3) {
        return { ...base, kind: 'not-applicable', label: '해당 없음', detail: '유치원은 만 3세부터 다녀요' };
    }
    const ac = item.ageClasses;
    if (!ac) return { ...base, kind: 'unknown', label: '정보 부족', detail: '연령별 학급 공시를 아직 모으지 못했어요' };
    const own = ac.byAge?.[age];
    const extra = { capacity: own?.capacity, waiting: own?.waiting };
    if (own && own.classes !== null && own.classes > 0) {
        const capacityText = own.capacity ? `, 정원 ${own.capacity}명` : '';
        const childrenText = own.children !== null ? ` · 원아 ${own.children}명` : '';
        return { ...base, ...extra, kind: 'own', classes: own.classes, children: own.children, label: `단독반 ${own.classes}개`, detail: `만 ${age}세 반 ${own.classes}개${childrenText}${capacityText}` };
    }
    const covering = (ac.mixed ?? []).filter(m => m.classes > 0 && m.ages?.includes(age));
    if (covering.length > 0) {
        const classes = covering.reduce((s, m) => s + m.classes, 0);
        const names = covering.map(m => `${m.label}(만 ${m.ages![0]}~${m.ages![m.ages!.length - 1]}세) ${m.classes}개`).join(', ');
        const ownUnknown = !own || own.classes === null;
        return {
            ...base, ...extra, kind: 'mixed', classes, children: null, label: '혼합반으로 운영',
            detail: ownUnknown ? `만 ${age}세 단독반 수는 공시 원본에 없고, ${names}이 있어요` : `만 ${age}세 단독반은 없고 ${names}에서 함께 지내요`,
        };
    }
    const unknownRange = (ac.mixed ?? []).filter(m => m.classes > 0 && !m.ages);
    if (unknownRange.length > 0) {
        return { ...base, ...extra, kind: 'mixed-unknown-range', label: '확인 필요', detail: `만 ${age}세 단독반은 없고, 연령 범위가 공시되지 않은 혼합반 ${unknownRange.reduce((s, m) => s + m.classes, 0)}개가 있어요` };
    }
    if (!own || own.classes === null) {
        return { ...base, kind: 'unknown', label: '정보 부족', detail: `공시 원본에 만 ${age}세 반 수가 없어요` };
    }
    return { ...base, ...extra, kind: 'none', label: '이번 공시에 없음', detail: `${ac.basis?.label ?? '최근 공시'}에 만 ${age}세 반이 없어요 (폐반 여부·다음 학년도 모집은 기관 확인)` };
}

export function ageClassOverview(item: Institution): AgeClassStatus[] {
    return applicableAges(item).map(age => ageClassStatus(item, age));
}

export interface MixedSummary {
    has: boolean;
    text: string;
}

export function mixedSummary(item: Institution): MixedSummary {
    const ac = item.ageClasses;
    if (!ac) return { has: false, text: '정보 부족' };
    const list = (ac.mixed ?? []).filter(m => m.classes > 0);
    if (list.length === 0) return { has: false, text: ac.mixedKnown === false ? '정보 부족' : '혼합반 없음' };
    // 혼합반 원아·정원은 연령별로 나뉘지 않은 합계라 그대로 '합계'로 적는다.
    return {
        has: true,
        text: list.map(m => {
            const name = m.ages ? `${m.label}(만 ${m.ages[0]}~${m.ages[m.ages.length - 1]}세) ${m.classes}개` : `${m.label} ${m.classes}개`;
            const extra = [m.children != null ? `원아 ${m.children}명` : null, m.capacity ? `정원 ${m.capacity}명` : null].filter(Boolean).join(' · ');
            return extra ? `${name} (합계 ${extra})` : name;
        }).join(', '),
    };
}

// ── 이력 비교 ──────────────────────────────────────────────────────────────

export interface ClassHistoryEntry {
    from: string;
    to: string;
    basis: string | null;
    /** 만 0~5세 단독반 수. null = 해당 없음(유치원 만 0~2세) */
    classes: (number | null)[];
    /** 혼합반 수 합계. null = 당시 모으지 않아 모름 */
    mixed: number | null;
    special: number | null;
    origin: 'git' | 'collect';
}

export type ChangeKind = '신설' | '늘어남' | '줄어듦' | '없어짐' | '변동 후 복귀';

export interface ClassChange {
    age: number;
    kind: ChangeKind;
    before: number;
    after: number;
    /** 값이 바뀐 시점들 (첫 기록 포함) */
    steps: { date: string; value: number }[];
    text: string;
}

export interface HistoryComparison {
    /** 비교할 수 있는 기록이 2개 이상인지 */
    comparable: boolean;
    period: { from: string; to: string } | null;
    changes: ClassChange[];
    notes: string[];
}

export function compareHistory(item: Institution, entries: ClassHistoryEntry[] | undefined): HistoryComparison {
    const notes: string[] = [];
    if (!entries || entries.length < 2) {
        return {
            comparable: false, period: null, changes: [],
            notes: [item.source === '유치원'
                ? '유치원은 이번(2026-11)부터 연령별 학급을 모으기 시작해 비교할 이전 공시가 없어요 (정보 부족)'
                : '비교할 이전 기록이 없어요 (정보 부족)'],
        };
    }
    const first = entries[0];
    const last = entries[entries.length - 1];
    const changes: ClassChange[] = [];
    const short = (d: string) => d.slice(5).replace('-', '.');
    for (const age of applicableAges(item)) {
        // 처음·마지막만 보면 2→1→2 같은 중간 변동을 놓친다. 기록을 시간순으로 모두 본다.
        const steps: { date: string; value: number }[] = [];
        for (const e of entries) {
            const v = e.classes[age];
            if (v == null) continue;
            if (steps.length === 0 || steps[steps.length - 1].value !== v) steps.push({ date: e.from, value: v });
        }
        if (steps.length < 2) continue;
        const before = steps[0].value;
        const after = steps[steps.length - 1].value;
        let kind: ChangeKind;
        if (before === after) kind = '변동 후 복귀';
        else if (before === 0) kind = '신설';
        else if (after === 0) kind = '없어짐';
        else kind = after > before ? '늘어남' : '줄어듦';
        let text = `만 ${age}세 단독반 ${steps.map(s => `${s.value}개(${short(s.date)})`).join(' → ')}`;
        if (after === 0) {
            const now = ageClassStatus(item, age);
            text += now.kind === 'mixed' ? ' · 지금은 혼합반으로 운영' : ' · 공시상 단독반 없음 (폐반 확정 아님)';
        }
        changes.push({ age, kind, before, after, steps, text });
    }
    if (first.mixed === null) notes.push('예전 기록에는 혼합반 정보가 없어 혼합반 변화는 비교하지 못했어요');
    else if (last.mixed !== null && first.mixed !== last.mixed) notes.push(`혼합반 ${first.mixed}개 → ${last.mixed}개`);
    notes.push('과거 공식 공시는 받을 수 없어 YourPick이 모은 시점끼리 비교해요 (괄호는 수집 날짜)');
    notes.push('학급 수는 아이 수에 따라 해마다 바뀔 수 있어요. 줄어든 것만으로 폐반 예정이라고 볼 수 없어요');
    return { comparable: true, period: { from: first.from, to: last.to }, changes, notes };
}

// ── 우리 아이 학년도별 ────────────────────────────────────────────────────

/** 학년도는 3월에 시작한다. 1~2월은 전 학년도. */
export function currentSchoolYear(now: Date = new Date()): number {
    return now.getMonth() >= 2 ? now.getFullYear() : now.getFullYear() - 1;
}

/** 반 연령(만 나이 반) = 학년도 − 출생연도 − 1. 예: 2026학년도 만 5세반 = 2020년생 */
export function classAgeFor(birthYear: number, schoolYear: number): number {
    return schoolYear - birthYear - 1;
}

export interface PathYear {
    schoolYear: number;
    age: number;
    status: AgeClassStatus;
    /** true = 지금 학년도(현재 공시로 판단), false = 다음 학년도 이후(확정 불가) */
    current: boolean;
}

export interface ChildPath {
    years: PathYear[];
    /** 현재 공시상 이 기관에 반이 없는 학년도 */
    gaps: PathYear[];
    /** 정보 부족·범위 미공시 혼합반이라 판단할 수 없는 학년도 */
    unknowns: PathYear[];
    /** 모든 학년도가 현재 공시상 단독반 또는 혼합반으로 확인될 때만 true */
    supported: boolean;
    summary: string;
}

export function childPath(item: Institution, birthYear: number, entryYear: number, now: Date = new Date()): ChildPath {
    const thisYear = currentSchoolYear(now);
    const years: PathYear[] = [];
    for (let year = entryYear; classAgeFor(birthYear, year) <= 5; year++) {
        const age = classAgeFor(birthYear, year);
        if (age < 0) continue;
        years.push({ schoolYear: year, age, status: ageClassStatus(item, age), current: year <= thisYear });
        if (years.length > 7) break;
    }
    const gaps = years.filter(y => y.status.kind === 'none' || y.status.kind === 'not-applicable');
    const unknowns = years.filter(y => y.status.kind === 'unknown' || y.status.kind === 'mixed-unknown-range');
    const supported = years.length > 0 && years.every(y => y.status.kind === 'own' || y.status.kind === 'mixed');
    const future = years.some(y => !y.current);
    const list = (ys: PathYear[]) => ys.map(g => `만 ${g.age}세(${g.schoolYear}학년도)`).join(', ');
    const parts: string[] = [];
    if (years.length === 0) parts.push('입학 예정 학년도에는 이미 초등학교 입학 연령이에요');
    if (gaps.length > 0) parts.push(`현재 공시 기준 ${list(gaps)} 반이 없어 그 해에는 다른 기관을 알아봐야 할 수 있어요`);
    if (unknowns.length > 0) parts.push(`${list(unknowns)} 반은 공시 정보가 부족해 판단할 수 없어요`);
    if (supported) parts.push('현재 공시 기준으로는 졸업(만 5세반)까지 해당 연령 반이 있어요');
    let summary = parts.join(' · ');
    if (future) summary += ' · 다음 학년도 이후 운영은 공식 모집자료나 기관 확인이 필요해요';
    return { years, gaps, unknowns, supported, summary };
}
