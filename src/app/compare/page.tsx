'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import CompareTable from '@/components/CompareTable';
import { Loader2, ArrowLeft, Award } from 'lucide-react';
import { useCompareStore } from '@/store/useCompareStore';
import type { Institution } from '@/types/institution';

function CompareContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const idsParam = searchParams.get('ids');
    const ids = idsParam ? idsParam.split(',') : [];
    const compareIds = useCompareStore((state) => state.compareIds);
    const targetIds = ids.length > 0 ? ids : compareIds;

    const [compareData, setCompareData] = useState<Institution[]>([]);
    // 담아 둔 기관 중 현재 공시 목록에 없는 수. 어린이집은 휴지·폐지되면 공시 목록에서 빠지고,
    // 지역 코드가 바뀌어도(예: 2026-07 인천 구 개편) 예전 주소로는 찾을 수 없다. 연령반 미운영과 구분해 알린다.
    const [missingCount, setMissingCount] = useState(0);
    // 지역 파일을 불러오지 못해(네트워크·서버·형식 오류) 있는지 없는지 확인할 수 없는 기관 수. '목록에 없음'과 구분한다.
    const [unverifiedCount, setUnverifiedCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (targetIds.length === 0) {
            setCompareData([]);
            setIsLoading(false);
            return;
        }

        const uniqueRegions = Array.from(new Set(targetIds.map(id => {
            const parts = String(id).split('_');
            if (parts.length >= 2) return `${parts[0]}_${parts[1]}`;
            return '11_11620'; // Fallback
        })));

        const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

        // 404 = 그 지역 파일이 없음(지역 코드가 바뀐 경우 등) → 기관이 목록에 없다고 판단할 수 있다.
        // 그 밖의 실패(네트워크·5xx·JSON 오류) = 확인 불가. 빈 목록으로 삼키면 휴지·폐지처럼 보이므로 따로 센다.
        type Loaded = { region: string; ok: boolean; data: Institution[] };
        const load = (region: string, url: string): Promise<Loaded> => fetch(url)
            .then(async r => {
                if (r.status === 404) return { region, ok: true, data: [] };
                if (!r.ok) return { region, ok: false, data: [] };
                const data = await r.json();
                return { region, ok: Array.isArray(data), data: Array.isArray(data) ? data : [] };
            })
            .catch(() => ({ region, ok: false, data: [] }));
        Promise.all(uniqueRegions.flatMap(region => [
            load(region, `${basePath}/data/${region}.json`),
            load(region, `${basePath}/data/${region}_childcare.json`),
        ])).then((results) => {
            const failedRegions = new Set(results.filter(r => !r.ok).map(r => r.region));
            // 지역 접두사가 없는 옛 id 는 어느 지역인지 모르므로, 불러오기에 실패한 지역이 하나라도 있으면 확인 불가로 둔다.
            const regionOf = (id: string) => { const parts = String(id).split('_'); return parts.length >= 3 ? `${parts[0]}_${parts[1]}` : null; };
            const regionFailed = (id: string) => { const r = regionOf(id); return r === null ? failedRegions.size > 0 : failedRegions.has(r); };
            const allFetched = results.flatMap(r => r.data);
            const filtered = allFetched.filter(inst => {
                const comp = `${inst.sidoCode || '11'}_${inst.sggCode || '11620'}_${inst.id}`;
                return targetIds.includes(comp) || targetIds.includes(inst.id); // Also check raw id for backward compatibility
            });
            setCompareData(filtered);
            const notFound = targetIds.filter(id => !filtered.some(inst => `${inst.sidoCode || '11'}_${inst.sggCode || '11620'}_${inst.id}` === id || inst.id === id));
            setMissingCount(notFound.filter(id => !regionFailed(id)).length);
            setUnverifiedCount(notFound.filter(id => regionFailed(id)).length);
            setIsLoading(false);
        });
    }, [targetIds.join(',')]);

    if (isLoading) {
        return (
            <div className="flex justify-center py-20" role="status" aria-label="비교 데이터를 불러오는 중입니다">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" aria-hidden="true" />
            </div>
        );
    }

    return (
        <div className="space-y-10 pb-20">
            <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] p-8 md:p-12 text-white shadow-2xl">
                {/* Decorative circles */}
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" aria-hidden="true"></div>
                <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 bg-blue-400/20 rounded-full blur-2xl" aria-hidden="true"></div>

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold mb-4 border border-white/30 tracking-wider">
                            기관 비교
                        </div>
                        <h1 id="compare-title" className="text-3xl md:text-4xl font-black mb-3 tracking-tight">상세 비교</h1>
                        <p className="text-blue-100 font-medium max-w-xl leading-relaxed">
                            <span className="text-white font-black">{compareData.length}개 기관</span>의 주요 항목을 한눈에 비교해 보세요.
                        </p>
                    </div>
                    <button
                        onClick={() => router.back()}
                        aria-label="이전 페이지로 돌아가기"
                        className="self-start md:self-center flex items-center px-6 py-3 bg-white text-blue-700 font-bold rounded-2xl shadow-lg hover:bg-blue-50 hover:scale-105 transition-all duration-200 group"
                    >
                        <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" aria-hidden="true" />
                        이전으로
                    </button>
                </div>
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                {unverifiedCount > 0 && (
                    <p role="alert" className="mb-4 text-xs font-bold text-rose-800 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3 break-keep">
                        데이터를 불러오지 못해 담아 둔 기관 {unverifiedCount}곳을 확인할 수 없어요. 잠시 뒤 새로고침해 주세요.
                    </p>
                )}
                {missingCount > 0 && (
                    <p role="note" className="mb-4 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 break-keep">
                        담아 둔 기관 중 {missingCount}곳은 현재 공시 목록에 없어 표시하지 못했어요. 휴지·폐지되었거나 지역 코드가 바뀌었을 수 있으니 기관이나 공시 포털에서 확인해 주세요.
                    </p>
                )}
                <CompareTable data={compareData} />
            </div>

            {compareData.length < 2 && (
                <div className="max-w-2xl mx-auto p-6 bg-amber-50 border border-amber-100 text-amber-800 rounded-3xl flex items-start space-x-4 shadow-sm">
                    <div className="bg-amber-100 p-2 rounded-xl">
                        <Award className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                        <h4 className="font-bold text-amber-900 mb-1">비교 안내</h4>
                        <p className="text-sm leading-relaxed opacity-90">
                            2개 이상 선택하면 항목별 차이를 더 명확하게 확인할 수 있습니다.
                            목록 페이지에서 체크 버튼을 눌러 기관을 추가해 보세요.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function ComparePage() {
    return (
        <Suspense fallback={
            <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        }>
            <CompareContent />
        </Suspense>
    );
}
