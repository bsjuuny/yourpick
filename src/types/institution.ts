export type InstitutionType = '국공립' | '사립' | '가정' | '민간';

export interface Institution {
    id: string;
    sidoCode?: string;
    sggCode?: string;
    name: string;
    type: InstitutionType;
    address: string;
    latitude: number;
    longitude: number;
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
    safetyStatus?: string; // 안전 관리 요약
    mealStatus?: string; // 식단/위생 요약
    alimiUrl?: string; // 유치원 알리미 원문 링크
    specialPrograms?: string; // 특성화 교육 내용
    tags: string[];
}

export interface SearchParams {
    query: string; // 주소/동 검색
    radius: number; // 반경 (km)
    type: InstitutionType | '전체';
}
