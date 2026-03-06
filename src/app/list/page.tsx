'use client';

import React, { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useInstitutions } from '@/hooks/useInstitutions';
import InstitutionCard from '@/components/InstitutionCard';
import { AlertCircle, Search, ArrowLeft } from 'lucide-react';

function ListContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const query = searchParams.get('query') || '';
    const sido = searchParams.get('sido') || '11';
    const sgg = searchParams.get('sgg') || '11620';
    const initialType = searchParams.get('type') || '전체';

    const [localSearch, setLocalSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState(initialType);
    const { data: institutions, isLoading, error } = useInstitutions(sido, sgg);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-32">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                    <Search className="w-6 h-6 text-indigo-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <p className="text-slate-400 font-black text-xs uppercase tracking-[0.2em] mt-8">Analyzing local data...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-32 text-center">
                <div className="bg-rose-50 p-6 rounded-[2rem] mb-6">
                    <AlertCircle className="w-12 h-12 text-rose-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">데이터를 불러올 수 없습니다</h3>
                <p className="text-slate-500 text-sm max-w-xs mx-auto mb-8">{error.message}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-8 py-3 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-colors"
                >
                    다시 시도하기
                </button>
            </div>
        );
    }

    const filteredData = institutions?.filter(inst => {
        const matchesQuery = !query || inst.name.includes(query) || inst.address.includes(query);
        const matchesLocal = !localSearch || inst.name.includes(localSearch);
        const matchesType = typeFilter === '전체' || inst.type.includes(typeFilter);
        return matchesQuery && matchesLocal && matchesType;
    }) || [];

    return (
        <div className="space-y-12 pb-24">
            {/* Context Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 animate-in fade-in slide-in-from-top-4 duration-700">
                <div className="space-y-4">
                    <button
                        onClick={() => router.push('/')}
                        className="group flex items-center text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:translate-x-1 transition-transform"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" /> back to search
                    </button>
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
                        &quot;{query || '전체 지역'}&quot; <br />
                        <span className="text-indigo-600/80">검색 결과입니다</span>
                    </h1>
                    <div className="flex items-center gap-3">
                        <div className="px-3 py-1 bg-indigo-600 text-white text-[10px] font-black rounded-lg shadow-lg shadow-indigo-100">
                            총 {filteredData.length}개 발견
                        </div>
                        <div className="text-slate-400 text-sm font-medium">우리 아이를 위한 최적의 유치원을 찾아보세요.</div>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
                    {/* Search Within Results */}
                    <div className="relative group min-w-[300px]">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                            <Search className="w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                        </div>
                        <input
                            type="text"
                            placeholder="유치원 이름으로 결과 내 검색..."
                            value={localSearch}
                            onChange={(e) => setLocalSearch(e.target.value)}
                            className="w-full pl-11 pr-4 py-4 bg-white border border-slate-100 rounded-[1.5rem] shadow-sm focus:outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-200 text-sm font-bold text-slate-900 placeholder:text-slate-300 transition-all font-bold"
                        />
                    </div>

                    <div className="flex items-center bg-white border border-slate-100 p-1 rounded-2xl shadow-sm">
                        {['전체', '국공립', '사립'].map((type) => (
                            <button
                                key={type}
                                onClick={() => setTypeFilter(type)}
                                className={`px-5 py-2.5 text-xs font-black rounded-xl transition-all ${typeFilter === type
                                    ? 'bg-slate-900 text-white'
                                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Grid Area */}
            {filteredData.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                    {filteredData.map(inst => (
                        <InstitutionCard key={inst.id} data={inst} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-32 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                    <div className="bg-white w-20 h-20 rounded-3xl shadow-sm flex items-center justify-center mx-auto mb-6">
                        <Search className="w-10 h-10 text-slate-200" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">원하시는 조건의 기관이 없습니다</h3>
                    <p className="text-slate-500 max-w-xs mx-auto text-sm leading-relaxed">
                        선택하신 지역에 등록된 데이터가 없거나, 검색 조건에 맞는 결과가 없습니다.
                        다른 지역이나 조건으로 검색해보세요.
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
