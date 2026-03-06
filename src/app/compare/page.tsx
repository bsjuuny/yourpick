'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import CompareTable from '@/components/CompareTable';
import { Loader2, ArrowLeft, Award } from 'lucide-react';
import { useCompareStore } from '@/store/useCompareStore';

function CompareContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const idsParam = searchParams.get('ids');
    const ids = idsParam ? idsParam.split(',') : [];
    const compareIds = useCompareStore((state) => state.compareIds);
    const targetIds = ids.length > 0 ? ids : compareIds;

    const [compareData, setCompareData] = useState<any[]>([]);
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

        Promise.all(uniqueRegions.map(region =>
            fetch(`${basePath}/data/${region}.json`)
                .then(r => r.ok ? r.json() : [])
                .catch(() => [])
        )).then((results) => {
            const allFetched = results.flat();
            const filtered = allFetched.filter(inst => {
                const comp = `${inst.sidoCode || '11'}_${inst.sggCode || '11620'}_${inst.id}`;
                return targetIds.includes(comp) || targetIds.includes(inst.id); // Also check raw id for backward compatibility
            });
            setCompareData(filtered);
            setIsLoading(false);
        });
    }, [targetIds.join(',')]);

    if (isLoading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-10 pb-20">
            <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] p-8 md:p-12 text-white shadow-2xl">
                {/* Decorative circles */}
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 bg-blue-400/20 rounded-full blur-2xl"></div>

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold mb-4 border border-white/30 uppercase tracking-widest">
                            Detailed Comparison
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black mb-3 tracking-tight">상세 비교하기</h1>
                        <p className="text-blue-100 font-medium max-w-xl leading-relaxed">
                            선택하신 <span className="text-white font-black underline underline-offset-4 decoration-blue-300">{compareData.length}개 기관</span>의
                            데이터를 한 화면에서 분석하고 최선의 선택을 도와드립니다.
                        </p>
                    </div>
                    <button
                        onClick={() => router.back()}
                        className="self-start md:self-center flex items-center px-6 py-3 bg-white text-blue-700 font-bold rounded-2xl shadow-lg hover:bg-blue-50 hover:scale-105 transition-all duration-200 group"
                    >
                        <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
                        이전으로
                    </button>
                </div>
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <CompareTable data={compareData} />
            </div>

            {compareData.length < 2 && (
                <div className="max-w-2xl mx-auto p-6 bg-amber-50 border border-amber-100 text-amber-800 rounded-3xl flex items-start space-x-4 shadow-sm">
                    <div className="bg-amber-100 p-2 rounded-xl">
                        <Award className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                        <h4 className="font-bold text-amber-900 mb-1">비교 Tip</h4>
                        <p className="text-sm leading-relaxed opacity-90">
                            기관을 2개 이상 선택하시면 각 항목별 차이를 더 명확하게 확인하실 수 있습니다.
                            목록 페이지에서 하트나 체크 버튼을 눌러 더 많은 유치원을 담아보세요!
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
