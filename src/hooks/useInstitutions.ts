import { useQuery } from '@tanstack/react-query';
import { Institution } from '@/types/institution';

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export const useInstitutions = (sidoCode?: string, sggCode?: string) => {
    return useQuery<Institution[]>({
        queryKey: ['institutions', sidoCode, sggCode],
        queryFn: async () => {
            if (!sidoCode || !sggCode) return [];
            const response = await fetch(`${BASE_PATH}/data/${sidoCode}_${sggCode}.json`);
            if (!response.ok) {
                if (response.status === 404) return []; // 데이터 없는 지역
                throw new Error('데이터를 불러오는데 실패했습니다.');
            }
            return response.json();
        },
        // 자주 바뀌지 않는 정적 데이터이므로 캐시/stale 시간 길게 설정
        staleTime: 1000 * 60 * 60,
        enabled: !!sidoCode && !!sggCode,
    });
};
