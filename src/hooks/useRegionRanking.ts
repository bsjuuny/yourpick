import { useQuery } from '@tanstack/react-query';
import { RegionRankingResponse } from '@/types/institution';

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export const useRegionRanking = () => {
    return useQuery<RegionRankingResponse>({
        queryKey: ['region-ranking'],
        queryFn: async () => {
            const res = await fetch(`${BASE_PATH}/data/region-ranking.json`);
            if (!res.ok) throw new Error('지역 랭킹 데이터를 불러오지 못했습니다.');
            return res.json();
        },
        staleTime: 1000 * 60 * 60,
    });
};
