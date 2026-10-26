import type { Institution } from '../types/institution';

/**
 * 유치원·어린이집을 고르는 7가지 기준.
 * 공시 데이터로 판단할 수 있는 것(data), 공식 포털에서 직접 봐야 하는 것(portal),
 * 방문해야만 알 수 있는 것(visit)을 구분해 화면 전체에서 같은 번호·이름으로 쓴다.
 */
export type CriterionId = 'care' | 'stability' | 'interaction' | 'play' | 'record' | 'safety' | 'life';
export type CheckMethod = 'data' | 'portal' | 'visit';

export interface ChecklistItem {
    id: string;
    text: string;
}

export interface CriterionMeta {
    id: CriterionId;
    no: number;
    title: string;
    question: string;
    method: CheckMethod;
    checklist: ChecklistItem[];
}

export const CRITERIA: CriterionMeta[] = [
    {
        id: 'care', no: 1, title: '돌봄 여유', method: 'data',
        question: '선생님 한 명이 아이를 몇 명이나 맡나요?',
        checklist: [],
    },
    {
        id: 'stability', no: 2, title: '교사 안정성', method: 'data',
        question: '선생님이 자주 바뀌지 않나요?',
        checklist: [
            { id: 'homeroom', text: '올해 담임이 학기 중에 바뀐 적이 없나요?' },
        ],
    },
    {
        id: 'interaction', no: 3, title: '선생님과의 상호작용', method: 'visit',
        question: '선생님이 아이와 어떻게 대화하나요?',
        checklist: [
            { id: 'eye-level', text: '아이 눈높이에서 대화하나요?' },
            { id: 'respond', text: '아이 질문이나 울음에 바로 반응하나요?' },
            { id: 'discipline', text: '훈육할 때 말투가 차분한가요?' },
        ],
    },
    {
        id: 'play', no: 4, title: '놀이·바깥활동', method: 'visit',
        question: '하루를 놀이 중심으로 보내나요?',
        checklist: [
            { id: 'free-play', text: '하루 일과에 자유놀이 시간이 충분한가요?' },
            { id: 'outdoor', text: '매일 바깥놀이를 하나요? (궂은 날 대안 포함)' },
            { id: 'toys', text: '아이가 놀잇감을 스스로 꺼낼 수 있나요?' },
        ],
    },
    {
        id: 'record', no: 5, title: '평가·위반 이력', method: 'portal',
        question: '공식 평가 결과와 행정처분 이력은 어떤가요?',
        checklist: [
            { id: 'grade', text: '공식 평가 결과를 확인했나요?' },
            { id: 'violation', text: '위반 공표·행정처분 이력이 없나요?' },
        ],
    },
    {
        id: 'safety', no: 6, title: '안전·위생', method: 'data',
        question: '안전 점검과 급식 관리가 되어 있나요?',
        checklist: [
            { id: 'clean', text: '급식실·화장실이 깨끗한가요?' },
            { id: 'cctv-access', text: 'CCTV 열람 절차를 안내받았나요?' },
        ],
    },
    {
        id: 'life', no: 7, title: '생활 조건', method: 'data',
        question: '우리 가족 일정과 비용에 맞나요?',
        checklist: [
            { id: 'commute', text: '등하원 거리와 시간이 무리 없나요?' },
            { id: 'extra-cost', text: '특별활동비·필요경비를 확인했나요?' },
        ],
    },
];

export const CRITERIA_BY_ID = Object.fromEntries(CRITERIA.map(c => [c.id, c])) as Record<CriterionId, CriterionMeta>;

/** 3 = 좋음, 2 = 보통, 1 = 주의, 0 = 판단할 정보 없음 */
export type Level = 0 | 1 | 2 | 3;

export interface Assessment {
    level: Level;
    /** 한 단어 판정 (여유, 안정, …) */
    verdict: string;
    /** 대표 수치 (짧게) */
    value: string;
    /** 수치 앞에 붙는 작은 설명 (법정 기준 대비, 교사 1명당 …) */
    metric?: string;
    /** 수치의 뜻을 풀어 쓴 한 줄 */
    detail?: string;
    /** 같은 unit 끼리만 비교하는 값 (작을수록 좋음) */
    rank?: number;
    unit?: 'legal-usage' | 'per-teacher' | 'newcomer-share' | 'missing-checks';
    caution?: boolean;
}

const UNKNOWN: Assessment = { level: 0, verdict: '정보 없음', value: '-' };

// 영유아보육법 시행규칙 별표 2 — 반별 교사 1인당 영유아 수
export const LEGAL_CHILDREN_PER_CLASS: Record<number, number> = { 0: 3, 1: 5, 2: 7, 3: 15, 4: 20, 5: 20 };

// 2026-09-13 공시 스냅샷의 전국 유치원 교사 1인당 원아 수 분포 (하위 1/3 ≈ 8.9명, 상위 1/3 ≈ 12.5명)
const KINDERGARTEN_RELAXED = 9;
const KINDERGARTEN_TIGHT = 12.5;

export interface AgeLoad {
    age: number;
    perClass: number;
    limit: number;
}

export function ageLoads(item: Institution): AgeLoad[] {
    if (!item.ageBreakdown) return [];
    return Object.entries(item.ageBreakdown)
        .map(([age, v]) => ({ age: Number(age), children: v.children, classes: v.classes }))
        .filter(e => e.children > 0 && e.classes > 0)
        .map(e => ({
            age: e.age,
            perClass: Math.round((e.children / e.classes) * 10) / 10,
            limit: LEGAL_CHILDREN_PER_CLASS[e.age] ?? 20,
        }));
}

/**
 * 연령별 반 수가 공시된 교사 수·원아 수와 맞지 않는 기관이 있다(2026-09 스냅샷 어린이집의 약 4%).
 * 그대로 쓰면 '여유'로 잘못 올라가므로, 반 수가 교사 수의 1.5배를 넘거나
 * 아이가 있는 반에 반당 1명 미만이면 연령별 판정을 하지 않는다.
 */
export function ageBreakdownReliable(item: Institution): boolean {
    if (!item.ageBreakdown) return false;
    const entries = Object.values(item.ageBreakdown);
    const classes = entries.reduce((sum, v) => sum + v.classes, 0);
    const teachers = totalTeachers(item);
    if (teachers && classes > teachers * 1.5) return false;
    return !entries.some(v => v.children > 0 && v.classes > 0 && v.children / v.classes < 1);
}

export function assessCare(item: Institution): Assessment {
    if (item.source === '어린이집' && item.ageBreakdown && !ageBreakdownReliable(item)) {
        return {
            level: 0, verdict: '확인 필요',
            value: item.childrenPerTeacher ? `${item.childrenPerTeacher}명` : '-',
            metric: item.childrenPerTeacher ? '교사 1명당' : undefined,
            detail: '연령별 반 정보가 교사 수와 맞지 않아 판정하지 않았어요',
        };
    }
    if (item.source === '어린이집' && item.ageBreakdown) {
        let children = 0;
        let allowed = 0;
        for (const [age, v] of Object.entries(item.ageBreakdown)) {
            if (v.children > 0 && v.classes > 0) {
                children += v.children;
                allowed += v.classes * (LEGAL_CHILDREN_PER_CLASS[Number(age)] ?? 20);
            }
        }
        if (allowed > 0) {
            const usage = children / allowed;
            const percent = Math.round(usage * 100);
            const tightest = ageLoads(item).reduce((max, load) => (load.perClass / load.limit > max.perClass / max.limit ? load : max));
            const detail = `가장 빠듯한 반: 만${tightest.age}세 반당 ${tightest.perClass}명 (기준 ${tightest.limit}명)`;
            if (usage > 1) return { level: 1, verdict: '기준 초과', value: `${percent}%`, metric: '법정 기준 대비', detail, rank: usage, unit: 'legal-usage', caution: true };
            if (usage > 0.9) return { level: 1, verdict: '빠듯', value: `${percent}%`, metric: '법정 기준 대비', detail, rank: usage, unit: 'legal-usage' };
            if (usage > 0.66) return { level: 2, verdict: '보통', value: `${percent}%`, metric: '법정 기준 대비', detail, rank: usage, unit: 'legal-usage' };
            return { level: 3, verdict: '여유', value: `${percent}%`, metric: '법정 기준 대비', detail, rank: usage, unit: 'legal-usage' };
        }
    }
    const perTeacher = item.childrenPerTeacher;
    if (!perTeacher || perTeacher <= 0) return UNKNOWN;
    const value = `${perTeacher}명`;
    const metric = '교사 1명당';
    if (item.source !== '유치원') {
        return { level: 0, verdict: '참고', value, metric, detail: '교사 1명당 아이 수' };
    }
    const detail = '교사 1명당 아이 수 (전국 유치원 가운데값 10.9명)';
    if (perTeacher <= KINDERGARTEN_RELAXED) return { level: 3, verdict: '여유', value, metric, detail, rank: perTeacher, unit: 'per-teacher' };
    if (perTeacher <= KINDERGARTEN_TIGHT) return { level: 2, verdict: '보통', value, metric, detail, rank: perTeacher, unit: 'per-teacher' };
    return { level: 1, verdict: '빠듯', value, metric, detail, rank: perTeacher, unit: 'per-teacher' };
}

export function totalTeachers(item: Institution): number | null {
    const match = item.teacherRatio?.match(/\((\d+)명\/(\d+)명\)/);
    return match ? Number(match[2]) : null;
}

export function assessStability(item: Institution): Assessment {
    const t = item.teacherTenure;
    if (!t || t.under1 + t.year1to2 + t.year2to4 + t.year4to6 + t.over6 === 0) return UNKNOWN;
    const total = totalTeachers(item);
    const newcomers = total ? Math.round((total * t.under1) / 100) : null;
    const detail = newcomers !== null
        ? `선생님 ${total}명 중 약 ${newcomers}명이 온 지 1년 미만`
        : '온 지 1년 미만인 선생님 비율';
    const value = `${t.under1}%`;
    const metric = '1년 미만 교사';
    if (t.under1 <= 20) return { level: 3, verdict: '안정', value, metric, detail, rank: t.under1, unit: 'newcomer-share' };
    if (t.under1 <= 45) return { level: 2, verdict: '보통', value, metric, detail, rank: t.under1, unit: 'newcomer-share' };
    return { level: 1, verdict: '변동 잦음', value, metric, detail, rank: t.under1, unit: 'newcomer-share' };
}

export interface SafetyCheck {
    label: string;
    /** true = 확인, false = 공시에 없음, null = 이 기관에는 해당 없음 */
    ok: boolean | null;
}

// 영양사는 일정 규모 이상에만 의무라서(어린이집 영유아 100명 이상, 유치원은 급식 규모 기준),
// 정원 100명 미만 기관은 '해당 없음'으로 두어 작은 기관이 불리하지 않게 한다.
const NUTRITIONIST_REQUIRED_CAPACITY = 100;

export function safetyChecks(item: Institution): SafetyCheck[] {
    const meal = item.mealStatus ?? '';
    if (item.source === '유치원') {
        const s = item.safetyStatus ?? '';
        return [
            { label: '소방대피훈련', ok: s.includes('소방대피훈련') },
            { label: 'CCTV', ok: s.includes('CCTV') },
            { label: '가스점검', ok: s.includes('가스점검') },
            { label: '영양사', ok: meal.includes('영양사배치') ? true : item.capacity >= NUTRITIONIST_REQUIRED_CAPACITY ? false : null },
        ];
    }
    return [
        { label: 'CCTV', ok: (item.cctvCount ?? 0) > 0 },
        {
            label: '영양사',
            ok: meal.includes('영양사 배치 (')
                ? true
                : item.capacity >= NUTRITIONIST_REQUIRED_CAPACITY ? false : null,
        },
    ];
}

export function assessSafety(item: Institution): Assessment {
    const applicable = safetyChecks(item).filter(c => c.ok !== null);
    if (applicable.length === 0) return UNKNOWN;
    const met = applicable.filter(c => c.ok).length;
    const value = `${met}/${applicable.length}`;
    const metric = '공시 항목 확인';
    const detail = '공시된 안전·급식 항목 중 확인된 수';
    const missing = applicable.length - met;
    if (missing === 0) return { level: 3, verdict: '모두 확인', value, metric, detail, rank: 0, unit: 'missing-checks' };
    if (met >= applicable.length / 2) return { level: 2, verdict: '일부 확인', value, metric, detail, rank: missing, unit: 'missing-checks' };
    return { level: 1, verdict: '확인 필요', value, metric, detail, rank: missing, unit: 'missing-checks' };
}

export interface LifeFacts {
    hours: string | null;
    extended: string[];
    bus: boolean;
    cost: string | null;
    availability: { label: string; tone: 'open' | 'tight' | 'waitlist' };
    /** 입소 대상이 제한될 수 있는 기관 (직장어린이집) */
    priority: string | null;
}

export function lifeFacts(item: Institution): LifeFacts {
    const hours = item.operatingHours
        ?.replace(/^평일기준시간\s*:\s*/, '')
        .replace(/\s*\(.*\)$/, '')
        .replace(/(\d{1,2})시(\d{2})분/g, (_, h: string, m: string) => `${h.padStart(2, '0')}:${m}`)
        .replace(/\s*~\s*/, ' ~ ')
        .trim() || null;
    const signals = `${item.operatingHours ?? ''},${item.specialPrograms ?? ''},${(item.tags ?? []).join(',')}`;
    const extended = [
        signals.includes('24시간') && '24시간',
        /야간연장/.test(signals) && '야간 연장',
        /휴일/.test(signals) && '휴일 보육',
        /시간제/.test(signals) && '시간제 보육',
    ].filter((x): x is string => Boolean(x));
    const fill = item.capacity > 0 ? item.currentPupils / item.capacity : 1;
    const availability = (item.waitlistTotal ?? 0) > 0
        ? { label: `대기 ${item.waitlistTotal}명`, tone: 'waitlist' as const }
        : fill >= 0.95
            ? { label: '정원 거의 참', tone: 'tight' as const }
            // 정원은 인가 상한이라 정원-현원은 '빈자리'가 아니라 '정원 대비 여유'로 부른다
            // (실제로 받는 인원은 반 편성·교사 수에 따라 다름).
            : { label: `정원 대비 여유 ${Math.max(item.capacity - item.currentPupils, 0)}명`, tone: 'open' as const };
    return {
        hours,
        extended: [...new Set(extended)],
        bus: item.hasSchoolBus,
        cost: item.expenseLevel && item.expenseLevel !== '-' ? item.expenseLevel : null,
        availability,
        priority: item.type === '직장' ? '직장 자녀 우선' : null,
    };
}

export interface PortalLink {
    url: string;
    label: string;
    popup: boolean;
}

export function portalLink(item: Institution): PortalLink | null {
    if (item.source === '어린이집') {
        return {
            url: `https://info.childcare.go.kr/info_html5/pnis/search/preview/SummaryInfoSlPu.jsp?flag=YJ&STCODE_POP=${encodeURIComponent(item.id)}`,
            label: '어린이집 정보공개포털',
            popup: true,
        };
    }
    if (!item.alimiUrl) return null;
    return { url: item.alimiUrl, label: '유치원 알리미', popup: false };
}

/**
 * 비교 대상 중 가장 좋은 기관의 인덱스. 판정 단계를 먼저 보고, 같은 단계에서
 * 단위가 같을 때만 수치로 가른다. 모두 같으면(차이 없음) 빈 배열.
 */
export function bestIndexes(assessments: Assessment[]): number[] {
    const known = assessments.map((a, index) => ({ a, index })).filter(x => x.a.level > 0);
    if (known.length < 2) return [];
    const topLevel = Math.max(...known.map(x => x.a.level));
    let winners = known.filter(x => x.a.level === topLevel);
    const units = new Set(winners.map(x => x.a.unit));
    if (units.size === 1 && winners.every(x => x.a.rank !== undefined)) {
        const best = Math.min(...winners.map(x => x.a.rank as number));
        winners = winners.filter(x => x.a.rank === best);
    }
    return winners.length === known.length ? [] : winners.map(x => x.index);
}

/** 목록 정렬용: 판정 단계가 높은 순, 같은 단계·같은 단위 안에서는 수치가 작은 순 */
export function compareByAssessment(a: Assessment, b: Assessment): number {
    if (a.level !== b.level) {
        if (a.level === 0) return 1;
        if (b.level === 0) return -1;
        return b.level - a.level;
    }
    if (a.unit && a.unit === b.unit && a.rank !== undefined && b.rank !== undefined) return a.rank - b.rank;
    return 0;
}
