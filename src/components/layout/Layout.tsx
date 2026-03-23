import Navbar from './Navbar';

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-background flex flex-col selection:bg-indigo-100 selection:text-indigo-900 font-sans">
            {/* Skip to main content - 스크린리더/키보드 사용자용 */}
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white focus:rounded-lg focus:font-bold focus:shadow-lg"
            >
                메인 콘텐츠로 바로 가기
            </a>
            <Navbar />
            <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-6 pt-32 pb-24">
                {children}
            </main>
            <footer className="py-20 border-t border-slate-200/50 mt-auto bg-slate-50/30">
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-10">
                    <div className="flex flex-col items-center md:items-start group">
                        <span className="font-black text-2xl text-slate-900 tracking-tighter font-heading group-hover:text-indigo-600 transition-colors">
                            유어<span className="text-indigo-600 group-hover:text-slate-900 transition-colors">픽</span>
                        </span>
                        <p className="text-xs font-black text-slate-600 tracking-[0.3em] mt-3 uppercase font-heading">
                            더 나은 선택 · 더 좋은 시작 · 선진형 보육 비교
                        </p>
                    </div>
                    <div className="text-center md:text-right space-y-2">
                        <div className="text-[13px] font-bold text-slate-500 leading-relaxed uppercase tracking-widest">
                            Official Public Data Integrated
                        </div>
                        <div className="text-xs text-slate-500 font-medium">
                            © {new Date().getFullYear()} 유어픽 · 교육부·보건복지부 공시 데이터 기반
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
