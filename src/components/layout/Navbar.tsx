'use client';

import Link from 'next/link';
import { useCompareStore } from '@/store/useCompareStore';
import { Baby, ListPlus, Search, Trash2 } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function Navbar() {
    const { compareIds, clearCompareIds } = useCompareStore();
    const compareCount = compareIds.length;
    const pathname = usePathname();

    return (
        <header className="fixed top-0 left-0 right-0 z-50 px-4 py-4 pointer-events-none">
            <nav aria-label="주 메뉴" className="max-w-5xl mx-auto bg-white/80 backdrop-blur-xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.08)] rounded-[2rem] px-4 md:px-6 h-16 flex items-center justify-between pointer-events-auto">
                <Link href="/" aria-label="유어픽 홈으로 이동" className="flex items-center gap-2 group">
                    <div className="bg-indigo-600 p-2 rounded-2xl group-hover:scale-110 active:scale-95 transition-all shadow-glow" aria-hidden="true">
                        <Baby className="w-5 h-5 text-white" aria-hidden="true" />
                    </div>
                    <span className="font-black text-xl text-slate-900 tracking-tighter font-heading group-hover:text-indigo-600 transition-colors">
                        유어<span className="text-indigo-600 group-hover:text-slate-900 transition-colors">픽</span>
                    </span>
                </Link>

                <div className="flex items-center gap-1.5 md:gap-4">
                    <Link
                        href="/"
                        aria-label="기관 검색 페이지"
                        aria-current={pathname === '/' ? 'page' : undefined}
                        className={`text-sm md:text-sm font-black px-4 md:px-5 py-2 md:py-2.5 rounded-2xl transition-all font-heading tracking-tight ${pathname === '/' ? 'text-indigo-600 bg-indigo-50 shadow-sm border border-indigo-100' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'}`}
                    >
                        찾아보기
                    </Link>

                    <div className="h-4 w-px bg-slate-200 mx-0.5 md:mx-1" aria-hidden="true"></div>

                    <div className="relative group/compare flex items-center">
                        <Link
                            href={`/compare?ids=${compareIds.join(',')}`}
                            aria-label={compareCount > 0 ? `나의 비교함 (${compareCount}개 선택됨)` : '나의 비교함 (선택된 기관 없음)'}
                            aria-disabled={compareCount === 0}
                            className={`relative group flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 rounded-2xl font-black text-xs md:text-sm transition-all duration-500 font-heading tracking-tight ${compareCount > 0
                                ? 'bg-slate-900 text-white shadow-premium hover:shadow-glow hover:-translate-y-0.5 active:translate-y-0 pr-12 md:pr-14'
                                : 'bg-slate-100 text-slate-300 cursor-not-allowed border border-slate-50 pointer-events-none'
                                }`}
                            tabIndex={compareCount === 0 ? -1 : undefined}
                        >
                            <ListPlus className={`w-4 h-4 transform group-hover:rotate-12 transition-transform ${compareCount > 0 ? 'text-indigo-400' : ''}`} aria-hidden="true" />
                            <span className="hidden sm:inline">나의 비교함</span>
                            {compareCount > 0 && (
                                <span aria-hidden="true" className="bg-indigo-600 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full font-black shadow-inner border border-indigo-500">
                                    {compareCount}
                                </span>
                            )}
                        </Link>
                        {compareCount > 0 && (
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    clearCompareIds();
                                }}
                                title="비교함 비우기"
                                className="absolute right-2 p-1.5 bg-white/10 hover:bg-white/20 text-white/60 hover:text-white rounded-xl transition-all z-10"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>
            </nav>
        </header>
    );
}
