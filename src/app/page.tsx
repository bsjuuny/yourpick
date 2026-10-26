import SearchForm from '@/components/SearchForm';
import CriteriaGuide from '@/components/criteria/CriteriaGuide';
import { Sparkles } from 'lucide-react';

export default function Home() {
  return (
    <div className="relative min-h-[90vh] flex flex-col items-center justify-center -mt-12 overflow-hidden bg-slate-50/30">
      {/* Subtle Background Decorations */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-gradient-to-b from-indigo-50/50 to-transparent -z-10"></div>
      <div className="absolute top-[10%] left-[10%] w-64 h-64 bg-indigo-100/20 rounded-full blur-[80px] -z-10 animate-pulse"></div>
      <div className="absolute bottom-[20%] right-[10%] w-80 h-80 bg-blue-100/20 rounded-full blur-[100px] -z-10 animate-pulse delay-700"></div>

      <div className="w-full max-w-5xl px-0 sm:px-6 text-center space-y-12">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white shadow-premium border border-slate-100 text-indigo-600 font-black text-xs uppercase tracking-widest animate-in fade-in slide-in-from-bottom-2 duration-700">
            <Sparkles className="w-3.5 h-3.5" />
            공시 데이터 기반 유치원·어린이집 정보 비교
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-7xl break-keep font-black text-slate-900 tracking-tight leading-[1.1] animate-fade-up font-heading">
            우리 아이를 위한 <br className="hidden sm:block" />
            <span className="text-indigo-600">더 나은 환경</span>의 시작
          </h1>

          <p className="max-w-xl mx-auto text-sm md:text-lg text-slate-500 font-medium leading-relaxed animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-200">
            유치원 알리미와 어린이집 정보공개 포털의 공시 데이터를 바탕으로<br className="hidden sm:block" />
            주변 기관의 교사·시설·운영 정보를 항목별로 비교합니다.
          </p>
        </div>

        <div className="animate-fade-up [animation-delay:400ms] relative z-10 md:scale-105 transition-transform">
          <SearchForm />
        </div>

        <div className="pt-8 animate-fade-up [animation-delay:600ms]">
          <CriteriaGuide />
        </div>

        <div className="pt-12 flex flex-col md:flex-row items-center justify-center gap-6 opacity-30">
          <div className="text-xs font-black uppercase tracking-widest text-slate-400 border-b md:border-b-0 md:border-r border-slate-200 pb-2 md:pb-0 md:pr-6">Source</div>
          <div className="flex items-center gap-6">
            <span className="font-bold text-slate-500 text-xs tracking-tight">유치원 알리미</span>
            <span className="font-bold text-slate-500 text-xs tracking-tight">어린이집 정보공개 portal</span>
          </div>
        </div>
      </div>
    </div>
  );
}
