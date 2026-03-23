'use client';

import React, { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useInstitutions } from '@/hooks/useInstitutions';
import { InstitutionSource } from '@/types/institution';
import InstitutionCard from '@/components/InstitutionCard';
import { AlertCircle, Search, ArrowLeft, Trash2, SortAsc } from 'lucide-react';
import { useCompareStore } from '@/store/useCompareStore';

function ListContent() {
    const { compareIds, clearCompareIds } = useCompareStore();
    const router = useRouter();
    const searchParams = useSearchParams();
    const query = searchParams.get('query') || '';
    const sido = searchParams.get('sido') || '11';
    const sgg = searchParams.get('sgg') || '11620';
    const initialType = searchParams.get('type') || '전체';

    const [localSearch, setLocalSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState(initialType);
    const [sourceFilter, setSourceFilter] = useState<InstitutionSource | '전체'>('전체');
    const [sortBy, setSortBy] = useState<'distance' | 'stability'>('distance');
    const { data: institutions, isLoading, error } = useInstitutions(sido, sgg, sourceFilter);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-48 animate-pulse">
                <div className="relative">
                    <div className="w-24 h-24 border-2 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 bg-white rounded-2xl shadow-premium flex items-center justify-center">
                            <Search className="w-6 h-6 text-indigo-600" />
                        </div>
                    </div>
                </div>
                <h3 className="text-xl font-black text-slate-900 mt-12 font-heading">안심하고 맡길 수 있는 곳을 찾는 중</h3>
                <p className="text-slate-400 font-bold text-xs tracking-[0.2em] mt-3 uppercase">Analyzing institutions...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-48 text-center animate-fade-up">
                <div className="bg-rose-50 p-8 rounded-[3rem] mb-8 shadow-inner border border-rose-100">
                    <AlertCircle className="w-16 h-16 text-rose-500" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-3 font-heading">데이터를 불러오는 데 문제가 발생했습니다</h3>
                <p className="text-slate-500 text-sm max-w-sm mx-auto mb-10 leading-relaxed font-bold">{error.message}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-10 py-5 bg-slate-900 text-white font-black rounded-full hover:bg-indigo-600 shadow-premium hover:shadow-glow transition-all font-heading"
                >
                    새로고침 시도하기
                </button>
            </div>
        );
    }

    const filteredData = institutions?.filter(inst => {
        const matchesQuery = !query || inst.name.includes(query) || inst.address.includes(query);
        const matchesLocal = !localSearch || inst.name.includes(localSearch);
        const matchesType = typeFilter === '전체' || inst.type.includes(typeFilter);
        return matchesQuery && matchesLocal && matchesType;
    }).sort((a, b) => {
        if (sortBy === 'distance') {
            // 위치 기반 정렬 (Geographic proximity)
            if (Math.abs(a.latitude - b.latitude) > 0.0001) {
                return a.latitude - b.latitude;
            }
            return a.longitude - b.longitude;
        } else {
            // 안정성 점수 기반 정렬 (Score visibility)
            return (b.stabilityScore || 0) - (a.stabilityScore || 0);
        }
    }) || [];

    return (
        <div className="space-y-12 pb-24">
            {/* Context Header */}
            <div className="flex flex-col gap-8 pb-8 border-b border-slate-100 animate-fade-up">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-4">
                        <button
                            onClick={() => router.push('/')}
                            aria-label="검색 페이지로 돌아가기"
                            className="group flex items-center text-xs font-black text-slate-400 tracking-widest hover:text-indigo-600 transition-colors uppercase font-heading"
                        >
                            <ArrowLeft className="w-3.5 h-3.5 mr-2" aria-hidden="true" /> Back to Search
                        </button>
                        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight font-heading flex flex-wrap items-center gap-x-4 gap-y-2">
                            <span>{query || '전체 지역'}</span>
                            <span className="text-lg md:text-xl font-bold text-slate-300">/</span>
                            <span className="text-indigo-600">데이터 실측 결과</span>
                        </h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="px-5 py-2.5 bg-slate-50 text-slate-400 text-[11px] font-black rounded-2xl border border-slate-100 uppercase tracking-widest hidden sm:block">
                            검색 결과 {filteredData.length}
                        </div>
                        {compareIds.length > 0 && (
                            <div className="flex items-center gap-1.5 bg-indigo-600 text-white px-4 py-2 rounded-2xl shadow-glow animate-fade-in group">
                                <span className="text-xs font-black font-heading tracking-tight">비교함 {compareIds.length}</span>
                                <div className="w-px h-3 bg-white/20 mx-1"></div>
                                <button 
                                    onClick={clearCompareIds}
                                    title="비교함 비우기"
                                    className="p-1 hover:bg-white/20 rounded-lg transition-colors group/reset"
                                >
                                    <Trash2 className="w-3.5 h-3.5 group-hover/reset:scale-110 transition-transform" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Integrated Filter Bar */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center bg-white p-2 rounded-[2rem] border border-slate-100 shadow-premium">
                    <div className="lg:col-span-5 relative group">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none" aria-hidden="true">
                            <Search className="w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" aria-hidden="true" />
                        </div>
                        <label htmlFor="local-search" className="sr-only">기관 이름으로 검색</label>
                        <input
                            id="local-search"
                            type="text"
                            placeholder="기관 이름으로 검색..."
                            value={localSearch}
                            onChange={(e) => setLocalSearch(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-100 text-sm font-bold text-slate-900 placeholder:text-slate-300 transition-all"
                        />
                    </div>

                    <div role="group" aria-label="설립 유형 필터" className="lg:col-span-4 flex items-center bg-slate-50 p-1 rounded-2xl">
                        {['전체', '국공립', '사립'].map((type) => (
                            <button
                                key={type}
                                onClick={() => setTypeFilter(type)}
                                aria-pressed={typeFilter === type}
                                className={`flex-1 py-2 text-[13px] font-black rounded-xl transition-all ${typeFilter === type
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-400 hover:text-slate-600'
                                    }`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>

                    <div role="group" aria-label="기관 구분 필터" className="lg:col-span-3 flex items-center bg-slate-50 p-1 rounded-2xl">
                        {(['전체', '유치원', '어린이집'] as const).map((src) => (
                            <button
                                key={src}
                                onClick={() => setSourceFilter(src)}
                                aria-pressed={sourceFilter === src}
                                className={`flex-1 py-2 text-[13px] font-black rounded-xl transition-all ${sourceFilter === src
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'text-slate-400 hover:text-slate-600'
                                    }`}
                            >
                                {src}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* List Controls */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-up [animation-delay:100ms]">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100 w-full md:w-auto">
                        <div className="pl-3 py-2 text-slate-400">
                            <SortAsc className="w-3.5 h-3.5" />
                        </div>
                        <select 
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="bg-transparent border-none text-[13px] font-black text-slate-700 pr-8 py-2 focus:ring-0 cursor-pointer w-full"
                        >
                            <option value="distance">위치 비슷함 순</option>
                            <option value="stability">안정성 점수 순</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Grid Area */}
            {filteredData.length > 0 ? (
                <div
                    aria-live="polite"
                    aria-atomic="false"
                    aria-label={`검색 결과 ${filteredData.length}개 기관`}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10 animate-fade-up [animation-delay:200ms]"
                >
                    {filteredData.map(inst => (
                        <InstitutionCard key={inst.id} data={inst} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-48 glass rounded-[4rem] shadow-premium border border-slate-200/50 animate-fade-up">
                    <div className="bg-slate-50 w-24 h-24 rounded-[2.5rem] shadow-inner flex items-center justify-center mx-auto mb-8 border border-slate-100">
                        <Search className="w-10 h-10 text-slate-300" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 mb-3 font-heading">검색 조건과 일치하는 기관이 없습니다</h3>
                    <p className="text-slate-500 max-w-sm mx-auto text-sm leading-relaxed font-bold">
                        지역명을 다시 확인하시거나, 필터 조건을 변경하여<br />다른 기관을 찾아보시기 바랍니다.
                    </p>
                </div>
            )}
        </div>
    );
}

export default function ListPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center py-32">
                <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
        }>
            <ListContent />
        </Suspense>
    );
}
