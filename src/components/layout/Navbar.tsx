'use client';

import Link from 'next/link';
import { useCompareStore } from '@/store/useCompareStore';
import { Baby, ListPlus, Search } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function Navbar() {
    const compareIds = useCompareStore((state) => state.compareIds);
    const compareCount = compareIds.length;
    const pathname = usePathname();

    return (
        <header className="fixed top-0 left-0 right-0 z-50 px-4 py-4 pointer-events-none">
            <nav className="max-w-5xl mx-auto bg-white/80 backdrop-blur-xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.08)] rounded-[2rem] px-4 md:px-6 h-16 flex items-center justify-between pointer-events-auto">
                <Link href="/" className="flex items-center gap-1.5 md:gap-2 group">
                    <div className="bg-indigo-600 p-1.5 rounded-xl group-hover:scale-110 transition-transform shadow-lg shadow-indigo-200">
                        <Baby className="w-4 h-4 md:w-5 md:h-5 text-white" />
                    </div>
                    <span className="font-extrabold text-base md:text-lg text-slate-900 tracking-tight">
                        우리동네 <span className="text-indigo-600">유비</span>
                    </span>
                </Link>

                <div className="flex items-center gap-1.5 md:gap-4">
                    <Link
                        href="/"
                        className={`text-[13px] md:text-sm font-bold px-3 py-1.5 md:px-4 md:py-2 rounded-xl transition-all ${pathname === '/' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
                    >
                        검색하기
                    </Link>

                    <div className="h-4 w-px bg-slate-200 mx-0.5 md:mx-1"></div>

                    <Link
                        href={`/compare?ids=${compareIds.join(',')}`}
                        className={`relative group flex items-center gap-1.5 md:gap-2 px-3 md:px-5 py-1.5 md:py-2.5 rounded-2xl font-black text-[13px] md:text-sm transition-all duration-300 ${compareCount > 0
                            ? 'bg-slate-900 text-white shadow-xl shadow-slate-200 hover:scale-105 active:scale-95'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-60'
                            }`}
                        onClick={(e) => {
                            if (compareCount === 0) e.preventDefault();
                        }}
                    >
                        <ListPlus className="w-4 h-4 md:w-4 md:h-4" />
                        <span className="hidden sm:inline">비교함</span>
                        {compareCount > 0 && (
                            <span className="bg-indigo-500 text-white text-[9px] md:text-[10px] w-4 h-4 md:w-5 md:h-5 flex items-center justify-center rounded-full shadow-lg animate-bounce border-2 border-slate-900">
                                {compareCount}
                            </span>
                        )}
                    </Link>
                </div>
            </nav>
        </header>
    );
}
