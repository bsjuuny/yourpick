import SearchForm from '@/components/SearchForm';
import { Baby, ShieldCheck, Heart, Sparkles, MapPin } from 'lucide-react';

export default function Home() {
  return (
    <div className="relative min-h-[90vh] flex flex-col items-center justify-center -mt-16 overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-100/40 rounded-full blur-[100px] -z-10 animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-100/40 rounded-full blur-[100px] -z-10 animate-pulse delay-700"></div>

      <main className="w-full max-w-5xl px-6 text-center space-y-16">
        <div className="space-y-6 md:space-y-8">
          <div className="inline-flex items-center gap-2 px-4 md:px-5 py-2 rounded-full bg-white shadow-[0_8px_32px_rgba(79,70,229,0.1)] border border-indigo-50 text-indigo-600 font-black text-[9px] md:text-[10px] uppercase tracking-[0.2em] animate-in fade-in slide-in-from-bottom-2 duration-700">
            <Sparkles className="w-4 h-4" />
            Our Child's First Milestone
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-[5.5rem] font-black text-slate-900 tracking-tight leading-[1.1] md:leading-[1] animate-in fade-in slide-in-from-bottom-4 duration-1000 px-4">
            가까운 곳에서 <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-500">
              최적의 환경
            </span>을 찾으세요
          </h1>

          <p className="max-w-2xl mx-auto text-base md:text-xl text-slate-500 font-medium leading-relaxed animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-200 px-4">
            유치원 알리미 공식 데이터를 분석하여 우리 아이에게
            가장 잘 맞는 유치원을 스마트하게 비교하고 선택하세요.
          </p>
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300 relative z-10 md:scale-110">
          <SearchForm />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-500">
          <div className="p-8 bg-white/60 backdrop-blur-md rounded-[2.5rem] border border-white shadow-[0_16px_48px_-12px_rgba(0,0,0,0.05)] flex flex-col items-center text-center group hover:bg-white hover:shadow-xl transition-all duration-300">
            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform">
              <ShieldCheck className="w-7 h-7 text-indigo-600" />
            </div>
            <h3 className="font-black text-slate-900 mb-2 leading-tight">공시 데이터 검증</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">교육부 공식 데이터를 기반으로 <br />실시간 정보를 가공하여 제공합니다</p>
          </div>
          <div className="p-8 bg-white/60 backdrop-blur-md rounded-[2.5rem] border border-white shadow-[0_16px_48px_-12px_rgba(0,0,0,0.05)] flex flex-col items-center text-center group hover:bg-white hover:shadow-xl transition-all duration-300">
            <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:-rotate-3 transition-transform">
              <Heart className="w-7 h-7 text-rose-500" />
            </div>
            <h3 className="font-black text-slate-900 mb-2 leading-tight">스마트 비교함</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">단순 나열이 아닌 포인트별 <br />매트릭스 비교를 지원합니다</p>
          </div>
          <div className="p-8 bg-white/60 backdrop-blur-md rounded-[2.5rem] border border-white shadow-[0_16px_48px_-12px_rgba(0,0,0,0.05)] flex flex-col items-center text-center group hover:bg-white hover:shadow-xl transition-all duration-300">
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform">
              <Baby className="w-7 h-7 text-blue-500" />
            </div>
            <h3 className="font-black text-slate-900 mb-2 leading-tight">쉬운 맞춤 검색</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">주소 하나로 근처의 모든 <br />교육 기관을 빠르게 필터링하세요</p>
          </div>
        </div>

        <div className="pt-8 md:pt-12 flex flex-col md:flex-row items-center justify-center gap-2 md:gap-6 opacity-60 md:opacity-40 grayscale group hover:grayscale-0 transition-all">
          <div className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-slate-400 md:border-r border-slate-200 md:pr-6 mb-2 md:mb-0">Data Powered By</div>
          <div className="flex items-center gap-4">
            <div className="font-black text-slate-500 text-xs md:text-sm tracking-tighter">유치원 알리미</div>
            <div className="font-black text-slate-500 text-xs md:text-sm tracking-tighter">어린이집 정보공개</div>
          </div>
        </div>
      </main>
    </div>
  );
}
