import { CheckCircle2, CircleHelp, XCircle } from 'lucide-react';
import { FIT_GROUP_LABEL, scoreWord, type FitResult, type FitStatus } from '@/utils/fitConditions';

const GROUP_STYLE = {
    0: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    1: 'bg-amber-50 text-amber-800 border-amber-200',
    2: 'bg-rose-50 text-rose-700 border-rose-200',
} as const;

const STATUS_ICON: Record<FitStatus, { icon: typeof CheckCircle2; className: string; label: string }> = {
    met: { icon: CheckCircle2, className: 'text-emerald-600', label: '충족' },
    unmet: { icon: XCircle, className: 'text-rose-500', label: '미충족' },
    unknown: { icon: CircleHelp, className: 'text-amber-600', label: '확인 필요' },
};

export function FitStatusLine({ status, text }: { status: FitStatus; text: string }) {
    const s = STATUS_ICON[status];
    const Icon = s.icon;
    return (
        <li className="flex items-start gap-1.5 text-[11px] font-bold text-slate-600 leading-snug break-keep">
            <Icon className={`w-3.5 h-3.5 mt-px flex-shrink-0 ${s.className}`} aria-hidden="true" />
            <span><span className="sr-only">{s.label}: </span>{text}</span>
        </li>
    );
}

/** 조건 판정이 아닌 참고 정보(공시 평가, 직선거리) — 충족/미충족 아이콘을 쓰지 않는다. */
export function FitInfoLine({ text }: { text: string }) {
    return (
        <li className="flex items-start gap-1.5 text-[11px] font-bold text-slate-600 leading-snug break-keep">
            <span className="w-1.5 h-1.5 mt-1 ml-1 mr-0.5 rounded-full bg-slate-300 flex-shrink-0" aria-hidden="true" />
            <span>{text}</span>
        </li>
    );
}

export function FitGroupBadge({ result }: { result: FitResult }) {
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-black ${GROUP_STYLE[result.group]}`}>
            {FIT_GROUP_LABEL[result.group]}
        </span>
    );
}

/** 카드 안의 맞춤 판정. 요약 한 줄 + 펼쳐 보는 근거. */
export default function FitSummary({ result }: { result: FitResult }) {
    const { objective } = result;
    return (
        <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-3">
            <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-black text-indigo-700 tracking-wide">우리 집 조건</span>
                <FitGroupBadge result={result} />
                <span className="text-[11px] font-black text-slate-600">
                    공시 평가 {objective.score === null ? '판단 자료 없음' : `${scoreWord(objective.score)} ${objective.score}/3 (${objective.used}개 기준)`}
                </span>
                {result.distanceKm !== null && (
                    <span className="text-[11px] font-bold text-slate-500">· 직선 {result.distanceKm}km</span>
                )}
            </div>
            <details className="mt-1.5 group/fit">
                <summary className="cursor-pointer list-none text-[11px] font-black text-slate-400 hover:text-slate-600 select-none">
                    <span className="group-open/fit:hidden">추천 근거 보기</span>
                    <span className="hidden group-open/fit:inline">추천 근거 접기</span>
                </summary>
                <ul className="mt-2 space-y-1">
                    {result.checks.map(x => (
                        <FitStatusLine key={x.key} status={x.status} text={`${x.need === 'required' ? '[필수] ' : ''}${x.label}: ${x.reason}`} />
                    ))}
                    {objective.parts.filter(p => p.weight > 0).map(p => (
                        <FitInfoLine
                            key={p.key}
                            text={p.assessment && p.assessment.level > 0
                                ? `공시 평가 · ${p.label}${p.weight === 2 ? '(중요)' : ''}: ${p.assessment.verdict} ${p.assessment.value}`
                                : `공시 평가 · ${p.label}: 판단할 자료 없음 · 점수에서 제외`}
                        />
                    ))}
                    {result.distanceKm !== null && (
                        <FitInfoLine text={`직선거리 ${result.distanceKm}km · 실제 통학시간이 아니에요`} />
                    )}
                    {result.unverified.filter(u => u.startsWith('위치')).map(u => <FitStatusLine key={u} status="unknown" text={u} />)}
                </ul>
            </details>
        </div>
    );
}
