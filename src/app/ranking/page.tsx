'use client';

import { useMemo, useState } from 'react';
import { useRegionRanking } from '@/hooks/useRegionRanking';
import { RegionRanking } from '@/types/institution';
import { AlertCircle, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';

type SourceFilter = '전체' | '유치원' | '어린이집';

function bucketOf(region: RegionRanking, source: SourceFilter) {
    if (source === '유치원') return region.kindergarten;
    if (source === '어린이집') return region.childcare;
    return region.combined;
}

function fillRateBadgeClass(rate: number | null) {
    if (rate == null) return 'bg-slate-50 text-slate-400 border-slate-100';
    if (rate >= 0.9) return 'bg-rose-50 text-rose-600 border-rose-100';
    if (rate >= 0.75) return 'bg-amber-50 text-amber-600 border-amber-100';
    return 'bg-emerald-50 text-emerald-600 border-emerald-100';
}

function formatPct(rate: number | null) {
    return rate == null ? '데이터 없음' : `${(rate * 100).toFixed(1)}%`;
}

export default function RankingPage() {
    const { data, isLoading, error } = useRegionRanking();
    const [sourceFilter, setSourceFilter] = useState<SourceFilter>('전체');

    const ranked = useMemo(() => {
        if (!data) return [];
        return [...data.regions]
            .filter(r => bucketOf(r, sourceFilter).capacity > 0)
            .sort((a, b) => (bucketOf(b, sourceFilter).fillRate ?? 0) - (bucketOf(a, sourceFilter).fillRate ?? 0));
    }, [data, sourceFilter]);

    const tightest = ranked.slice(0, 10);
    const roomiest = [...ranked].reverse().slice(0, 10);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-48 animate-pulse">
                <div className="w-24 h-24 border-2 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                <h3 className="text-xl font-black text-slate-900 mt-12 font-heading">지역별 입소 현황을 집계하는 중</h3>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="flex flex-col items-center justify-center py-48 text-center animate-fade-up">
                <div className="bg-rose-50 p-8 rounded-[3rem] mb-8 shadow-inner border border-rose-100">
                    <AlertCircle className="w-16 h-16 text-rose-500" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-3 font-heading">데이터를 불러오는 데 문제가 발생했습니다</h3>
            </div>
        );
    }

    return (
        <div className="space-y-16 pb-24">
            {/* Header */}
            <div className="space-y-4 pb-8 border-b border-slate-100 animate-fade-up">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white shadow-premium border border-slate-100 text-indigo-600 font-black text-xs uppercase tracking-widest">
                    <BarChart3 className="w-3.5 h-3.5" />
                    지역별 입소 현황
                </div>
                <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight font-heading">
                    정원 대비 현원으로 본 <span className="text-indigo-600">지역별 입소 경쟁률</span>
                </h1>
                <p className="text-sm text-slate-500 font-bold leading-relaxed">
                    {data.regionCount}개 지역 · {new Date(data.generatedAt).toLocaleDateString('ko-KR')} 기준 공시 데이터 집계
                </p>

                <div role="group" aria-label="기관 구분 필터" className="inline-flex items-center bg-slate-50 p-1 rounded-2xl">
                    {(['전체', '유치원', '어린이집'] as const).map((src) => (
                        <button
                            key={src}
                            onClick={() => setSourceFilter(src)}
                            aria-pressed={sourceFilter === src}
                            className={`px-5 py-2 text-[13px] font-black rounded-xl transition-all ${sourceFilter === src
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            {src}
                        </button>
                    ))}
                </div>
            </div>

            {/* TOP 10 카드 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-up [animation-delay:100ms]">
                <div className="bg-white rounded-[2.5rem] shadow-premium border border-slate-100 p-8">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="w-10 h-10 bg-rose-50 rounded-2xl flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-rose-500" />
                        </div>
                        <h2 className="text-lg font-black text-slate-900 font-heading">입소 경쟁이 치열한 지역 TOP 10</h2>
                    </div>
                    <ol className="space-y-3">
                        {tightest.map((r, i) => {
                            const b = bucketOf(r, sourceFilter);
                            return (
                                <li key={`${r.sidoCode}_${r.sggCode}`} className="flex items-center justify-between gap-3">
                                    <span className="flex items-center gap-3 min-w-0">
                                        <span className="w-6 text-xs font-black text-slate-300">{i + 1}</span>
                                        <span className="font-bold text-slate-700 text-sm truncate">{r.sidoName} {r.sggName}</span>
                                    </span>
                                    <span className={`shrink-0 px-3 py-1 rounded-xl text-xs font-black border ${fillRateBadgeClass(b.fillRate)}`}>
                                        {formatPct(b.fillRate)}
                                    </span>
                                </li>
                            );
                        })}
                    </ol>
                </div>

                <div className="bg-white rounded-[2.5rem] shadow-premium border border-slate-100 p-8">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center">
                            <TrendingDown className="w-5 h-5 text-emerald-500" />
                        </div>
                        <h2 className="text-lg font-black text-slate-900 font-heading">정원이 여유로운 지역 TOP 10</h2>
                    </div>
                    <ol className="space-y-3">
                        {roomiest.map((r, i) => {
                            const b = bucketOf(r, sourceFilter);
                            return (
                                <li key={`${r.sidoCode}_${r.sggCode}`} className="flex items-center justify-between gap-3">
                                    <span className="flex items-center gap-3 min-w-0">
                                        <span className="w-6 text-xs font-black text-slate-300">{i + 1}</span>
                                        <span className="font-bold text-slate-700 text-sm truncate">{r.sidoName} {r.sggName}</span>
                                    </span>
                                    <span className={`shrink-0 px-3 py-1 rounded-xl text-xs font-black border ${fillRateBadgeClass(b.fillRate)}`}>
                                        {formatPct(b.fillRate)}
                                    </span>
                                </li>
                            );
                        })}
                    </ol>
                </div>
            </div>

            {/* 전체 테이블 */}
            <div className="animate-fade-up [animation-delay:200ms]">
                <h2 className="text-lg font-black text-slate-900 font-heading mb-6">전체 지역 ({ranked.length}개)</h2>
                <div className="bg-white rounded-[2.5rem] shadow-premium border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 text-left">
                                    <th className="px-6 py-4 font-black text-slate-400 text-xs uppercase tracking-widest">지역</th>
                                    <th className="px-6 py-4 font-black text-slate-400 text-xs uppercase tracking-widest text-right">기관 수</th>
                                    <th className="px-6 py-4 font-black text-slate-400 text-xs uppercase tracking-widest text-right">정원</th>
                                    <th className="px-6 py-4 font-black text-slate-400 text-xs uppercase tracking-widest text-right">현원</th>
                                    <th className="px-6 py-4 font-black text-slate-400 text-xs uppercase tracking-widest text-right">충원율</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ranked.map((r) => {
                                    const b = bucketOf(r, sourceFilter);
                                    return (
                                        <tr key={`${r.sidoCode}_${r.sggCode}`} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 font-bold text-slate-800">{r.sidoName} {r.sggName}</td>
                                            <td className="px-6 py-4 text-right text-slate-500 font-bold">{b.count.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-right text-slate-500 font-bold">{b.capacity.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-right text-slate-500 font-bold">{b.currentPupils.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={`inline-block px-3 py-1 rounded-xl text-xs font-black border ${fillRateBadgeClass(b.fillRate)}`}>
                                                    {formatPct(b.fillRate)}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <p className="text-xs text-slate-400 font-bold leading-relaxed">
                충원율은 각 지역 기관들의 정원 합계 대비 현원 합계로 계산되며, 실시간 대기 순번이나 개별 기관의 입소 가능 여부와는 다를 수 있습니다.
            </p>
        </div>
    );
}
