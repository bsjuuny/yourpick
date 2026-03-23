import { Institution } from '@/types/institution';

// ── ageRange 정제 ────────────────────────────────────────────
function sanitizeAgeRange(raw: string, specialPrograms?: string): string {
    if (!raw || raw === '-') return '-';

    const parts = raw.split('~').map(s => s.trim());
    if (parts.length === 2 && parts[0] === parts[1]) {
        // "만 0세 ~ 만 0세" → 단일 연령
        const hint = specialPrograms?.includes('영아전담') ? ' (영아전담)' : '';
        return `${parts[0]}${hint}`;
    }
    return raw;
}

// ── alimiUrl 유효성 검증 + 교정 ──────────────────────────────
function sanitizeAlimiUrl(raw?: string): string | undefined {
    if (!raw) return undefined;

    // 1. 공백 제거 (API 입력 오류: "http:// cafe.naver.com/ path")
    let url = raw.replace(/\s+/g, '');

    // 2. 프로토콜 없으면 reject
    if (!url.startsWith('http://') && !url.startsWith('https://')) return undefined;

    // 3. 이미지 파일 URL reject (서울시 포털 btn_home.gif 등)
    if (/\.(gif|jpg|jpeg|png|bmp|webp|svg)(\?.*)?$/i.test(url)) return undefined;

    // 4. 여러 URL이 붙어있으면 첫 번째만 사용
    const firstMatch = url.match(/^(https?:\/\/.+?)(?=https?:\/\/|$)/);
    if (firstMatch) url = firstMatch[1];

    // 5. 알려진 도메인 오타 교정
    url = url
        .replace(/https?:\/\/cafedaum\.net\//i,  'http://cafe.daum.net/')
        .replace(/https?:\/\/cafenaver\.com\//i, 'http://cafe.naver.com/')
        .replace(/([a-z]{2,})\.\//gi, '$1/'); // 도메인 내 후행 점 제거

    // 6. 최종 유효성 검사
    try {
        const parsed = new URL(url);
        if (!parsed.hostname.includes('.') || parsed.hostname.endsWith('.')) return undefined;
        return url;
    } catch {
        return undefined;
    }
}

// ── teacherTenure 정규화 (합계 100% 보장) ────────────────────
function normalizeTenure(t: Institution['teacherTenure']): Institution['teacherTenure'] {
    if (!t) return t;
    const sum = t.under1 + t.year1to2 + t.year2to4 + t.year4to6 + t.over6;
    if (sum === 0 || sum === 100) return t;
    // 반올림 오차를 over6에 흡수
    const diff = 100 - sum;
    return { ...t, over6: Math.max(0, t.over6 + diff) };
}

// ── specialPrograms "일반" 필터 ──────────────────────────────
function sanitizeSpecialPrograms(raw?: string): string | undefined {
    if (!raw || raw.trim() === '-' || raw.trim() === '일반') return undefined;
    return raw.trim();
}

// ── childrenPerTeacher 추론 ──────────────────────────────────
function inferChildrenPerTeacher(
    current: number | undefined,
    currentPupils: number,
    teacherRatio?: string,
): number | undefined {
    if (current && current > 0) return current;
    if (!teacherRatio || currentPupils <= 0) return current;
    const match = teacherRatio.match(/\((\d+)명\/(\d+)명\)/);
    if (!match) return current;
    const teacherCount = parseInt(match[2]);
    if (teacherCount <= 0) return current;
    return Math.round((currentPupils / teacherCount) * 10) / 10;
}

// ── tags 자동 생성 ───────────────────────────────────────────
const TAG_RULES: [string, string][] = [
    ['야간연장', '야간운영'],
    ['24시간', '24시간'],
    ['장애아통합', '장애아통합'],
    ['장애아전담', '장애아전담'],
    ['영아전담', '영아전담'],
    ['시간제보육', '시간제보육'],
    ['휴일보육', '휴일운영'],
    ['공동육아', '공동육아'],
];

function buildTags(existing: string[], specialPrograms?: string): string[] {
    const tags = [...existing];
    if (!specialPrograms) return tags;
    for (const [keyword, tag] of TAG_RULES) {
        if (specialPrograms.includes(keyword) && !tags.includes(tag)) {
            tags.push(tag);
        }
    }
    return tags;
}

// ── 운영 상태 이상 감지 ──────────────────────────────────────
function detectAnomalyTags(
    existing: string[],
    currentPupils: number,
    capacity: number,
    waitlistTotal?: number,
    cctvCount?: number,
): string[] {
    const tags = [...existing];
    if (
        currentPupils === 0 &&
        capacity > 0 &&
        ((waitlistTotal && waitlistTotal > 0) || (cctvCount && cctvCount > 0))
    ) {
        if (!tags.includes('운영 확인 필요')) tags.push('운영 확인 필요');
    }
    return tags;
}

// ── 메인 정제 함수 ───────────────────────────────────────────
export function sanitizeInstitution(inst: Institution): Institution {
    const tags0 = buildTags(inst.tags ?? [], inst.specialPrograms);
    const tags1 = detectAnomalyTags(
        tags0,
        inst.currentPupils,
        inst.capacity,
        inst.waitlistTotal,
        inst.cctvCount,
    );

    return {
        ...inst,
        ageRange: sanitizeAgeRange(inst.ageRange, inst.specialPrograms),
        alimiUrl: sanitizeAlimiUrl(inst.alimiUrl),
        teacherTenure: normalizeTenure(inst.teacherTenure),
        specialPrograms: sanitizeSpecialPrograms(inst.specialPrograms),
        childrenPerTeacher: inferChildrenPerTeacher(
            inst.childrenPerTeacher,
            inst.currentPupils,
            inst.teacherRatio,
        ),
        tags: tags1,
    };
}
