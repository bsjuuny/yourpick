export type InstitutionType = '국공립' | '사립' | '가정' | '민간' | '사회복지법인' | '법인단체' | '부모협동' | '직장';

export type InstitutionSource = '유치원' | '어린이집';

export interface Institution {
    id: string;
    sidoCode?: string;
    sggCode?: string;
    name: string;
    type: InstitutionType;
    source: InstitutionSource;
    address: string;
    latitude: number | null;
    longitude: number | null;
    // Region consistency is not verification of an individual building.
    locationStatus?: 'region_consistent' | 'unconfirmed';
    locationIssues?: string[];
    sourceCoordinates?: { latitude: number | string | null; longitude: number | string | null };
    phone: string;
    capacity: number; // 정원
    currentPupils: number; // 현원
    operatingHours: string;
    hasSchoolBus: boolean;
    expenseLevel: string;
    ageRange: string;
    teacherRatio?: string; // 전문 교사 비율
    teacherTenure?: {
        under1: number;
        year1to2: number;
        year2to4: number;
        year4to6: number;
        over6: number;
    };
    childrenPerTeacher?: number; // 교사 1인당 아동 수
    ageBreakdown?: {
        [age: number]: {
            children: number;
            classes: number;
            ratio: number; // children / classes (≈ children per teacher)
        };
    };
    safetyStatus?: string; // 안전 관리 요약
    mealStatus?: string; // 식단/위생 요약
    alimiUrl?: string; // 유치원 알리미 원문 링크
    specialPrograms?: string; // 특성화 교육 내용
    waitlistTotal?: number; // 입소대기 아동수 총계 (어린이집)
    cctvCount?: number; // CCTV 총설치수 (어린이집)
    stabilityScore?: number; // 기관 안정성 점수 (Inferred)
    /** 연령반 운영 현황 (공시 원본, 2026-11-17부터 수집) */
    ageClasses?: AgeClasses;
    /** 어린이집 운영 상태 (정상·재개). 휴지·폐지 기관은 수집 단계에서 빠진다. */
    operatingStatus?: string;
    tags: string[];
}

/** null = 공시 원본에 그 값이 없음(정보 부족). 0과 다르다. */
export interface AgeClassCount {
    classes: number | null;
    children: number | null;
    /** 유치원 연령별 인가 정원 */
    capacity?: number | null;
    /** 어린이집 연령별 입소대기 아동 수 */
    waiting?: number | null;
}

export interface AgeClasses {
    basis: { kind: 'disclosure' | 'date' | 'unknown'; key: string | null; label: string };
    byAge: Record<number, AgeClassCount>;
    /** false = 혼합반 필드가 원본에 없어 혼합반 여부를 모름 */
    mixedKnown?: boolean;
    /** ages = 실제 구성 연령(공시가 주지 않아 지금은 늘 null), possibleAges = 그 혼합반에 들 수 있는 범위 */
    mixed: { label: string; ages: number[] | null; possibleAges?: number[] | null; classes: number; children: number | null; capacity?: number | null }[];
    special: { classes: number | null; children: number | null };
    waitingOver6?: number | null;
}

export interface SearchParams {
    query: string; // 주소/동 검색
    radius: number; // 반경 (km)
    type: InstitutionType | '전체';
}


