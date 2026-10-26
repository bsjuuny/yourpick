import { CRITERIA, type CheckMethod } from '@/utils/selectionCriteria';
import { CriterionIcon, METHOD_INFO, MethodBadge } from './CriteriaUI';

const GROUPS: { method: CheckMethod; title: string; frame: string }[] = [
    { method: 'data', title: '유어픽에서 바로 비교', frame: 'bg-white border border-slate-200 shadow-premium' },
    { method: 'portal', title: '공식 포털에서 확인', frame: 'bg-white/70 border border-slate-300' },
    { method: 'visit', title: '방문해서 확인', frame: 'bg-white/40 border-2 border-dashed border-slate-300' },
];

export default function CriteriaGuide() {
    return (
        <section aria-labelledby="criteria-guide-title" className="text-left space-y-6">
            <div className="text-center space-y-3">
                <h2 id="criteria-guide-title" className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight font-heading break-keep">
                    근속연수보다 중요한 <span className="text-indigo-600">7가지 기준</span>
                </h2>
                <p className="text-sm md:text-base text-slate-500 font-medium break-keep">
                    아이가 하루를 어떻게 보내는지에 가까운 기준부터 살펴보세요. 기준마다 확인하는 방법이 달라요.
                </p>
                <ul className="flex flex-wrap justify-center gap-2 pt-1" aria-label="확인 방법 범례">
                    {GROUPS.map(g => (
                        <li key={g.method} className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                            <MethodBadge method={g.method} />
                            <span className="hidden sm:inline">{METHOD_INFO[g.method].description}</span>
                        </li>
                    ))}
                </ul>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {GROUPS.map(group => {
                    const items = CRITERIA.filter(c => c.method === group.method);
                    return (
                        <div
                            key={group.method}
                            className={`rounded-[2rem] p-5 md:p-6 ${group.frame} ${group.method === 'data' ? 'md:col-span-2' : ''}`}
                        >
                            <div className="flex items-center justify-between gap-2 mb-4">
                                <h3 className="text-base font-black text-slate-900 font-heading">{group.title}</h3>
                                <MethodBadge method={group.method} short />
                            </div>
                            <ul className={`grid gap-3 ${group.method === 'data' ? 'sm:grid-cols-2 lg:grid-cols-4' : ''}`}>
                                {items.map(c => (
                                    <li key={c.id} className="flex items-start gap-3 rounded-2xl p-3 bg-slate-50/70">
                                        <CriterionIcon id={c.id} />
                                        <div className="min-w-0">
                                            <div className="text-sm font-black text-slate-900 break-keep">{c.title}</div>
                                            <p className="text-xs font-medium text-slate-500 leading-relaxed break-keep">{c.question}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    );
                })}
            </div>
            <p className="text-center text-xs font-medium text-slate-400 break-keep">
                방문·포털 확인 항목은 비교 화면에서 기관마다 체크해 둘 수 있어요. 체크 내용은 이 브라우저에만 저장됩니다.
            </p>
        </section>
    );
}
