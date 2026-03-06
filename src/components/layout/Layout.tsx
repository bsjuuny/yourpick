import Navbar from './Navbar';

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-transparent flex flex-col selection:bg-indigo-100 selection:text-indigo-900">
            <Navbar />
            <main className="flex-1 max-w-6xl w-full mx-auto px-6 pt-24 pb-20">
                {children}
            </main>
            <footer className="py-12 border-t border-slate-100 mt-auto">
                <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex flex-col items-center md:items-start">
                        <span className="font-black text-slate-900 tracking-tight">
                            우리동네 <span className="text-indigo-600">유비</span>
                        </span>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">
                            Empowering parents with better data
                        </p>
                    </div>
                    <div className="text-center md:text-right text-[11px] font-bold text-slate-400 leading-relaxed uppercase tracking-widest">
                        © {new Date().getFullYear()} WOORI-UV PROJECT. <br />
                        ALL DATA FROM PUBLIC K-INFO PORTALS.
                    </div>
                </div>
            </footer>
        </div>
    );
}
