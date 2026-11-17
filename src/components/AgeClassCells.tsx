import { CheckCircle2, CircleHelp, Layers, MinusCircle } from 'lucide-react';
import type { Institution } from '@/types/institution';
import {
    ageClassOverview, basisLabel, childPath, compareHistory, mixedSummary,
    type AgeClassStatus, type ClassHistoryEntry, type ClassStatusKind,
} from '@/utils/ageClasses';

const KIND_STYLE: Record<ClassStatusKind, { icon: typeof CheckCircle2; className: string; sr: string }> = {
    own: { icon: CheckCircle2, className: 'text-emerald-600', sr: '단독반 운영' },
    mixed: { icon: Layers, className: 'text-indigo-500', sr: '혼합반으로 운영' },
    'mixed-unknown-range': { icon: CircleHelp, className: 'text-amber-600', sr: '확인 필요' },
    none: { icon: MinusCircle, className: 'text-slate-400', sr: '이번 공시에 없음' },
    'not-applicable': { icon: MinusCircle, className: 'text-slate-300', sr: '해당 없음' },
    unknown: { icon: CircleHelp, className: 'text-amber-600', sr: '정보 부족' },
};

function StatusLine({ status, prefix }: { status: AgeClassStatus; prefix: string }) {
    const style = KIND_STYLE[status.kind];
    const Icon = style.icon;
    const extra = [
        status.kind === 'own' && status.children ? `원아 ${status.children}명` : null,
        status.capacity ? `정원 ${status.capacity}명` : null,
        status.waiting ? `대기 ${status.waiting}명` : null,
    ].filter(Boolean).join(' · ');
    return (
        <li className="flex items-start gap-1.5 text-[11px] font-bold text-slate-600 leading-snug break-keep" title={status.detail}>
            <Icon className={`w-3.5 h-3.5 mt-px flex-shrink-0 ${style.className}`} aria-hidden="true" />
            <span>
                <span className="font-black text-slate-800">{prefix}</span> {status.label}
                {extra && <span className="text-slate-400"> · {extra}</span>}
                <span className="sr-only"> ({status.detail})</span>
            </span>
        </li>
    );
}

export function AgeClassBasis({ item }: { item: Institution }) {
    return <span className="text-[11px] font-black text-slate-600 break-keep">{basisLabel(item)}</span>;
}

export function AgeClassOverview({ item }: { item: Institution }) {
    if (!item.ageClasses) return <span className="text-[11px] font-bold text-slate-400">정보 부족</span>;
    return (
        <ul className="text-left space-y-1">
            {ageClassOverview(item).map(st => <StatusLine key={st.age} status={st} prefix={`만 ${st.age}세`} />)}
            {(item.ageClasses.special.classes ?? 0) > 0 && (
                <li className="text-[11px] font-bold text-slate-500">특수학급 {item.ageClasses.special.classes}개</li>
            )}
        </ul>
    );
}

export function MixedClassCell({ item }: { item: Institution }) {
    const m = mixedSummary(item);
    return <span className={`text-[11px] font-bold break-keep ${m.has ? 'text-indigo-700' : 'text-slate-400'}`}>{m.text}</span>;
}

export function ClassHistoryCell({ item, entries, loading }: { item: Institution; entries: ClassHistoryEntry[] | undefined; loading: boolean }) {
    if (loading) return <span className="text-[11px] font-bold text-slate-400">불러오는 중…</span>;
    const h = compareHistory(item, entries);
    return (
        <div className="text-left space-y-1">
            {h.period && <p className="text-[11px] font-black text-slate-500">{h.period.from} ~ {h.period.to} 저장 스냅샷 비교</p>}
            {h.comparable && h.changes.length === 0 && <p className="text-[11px] font-bold text-slate-600">연령별 단독반 수 변화 없음</p>}
            {h.changes.length > 0 && (
                <ul className="space-y-0.5">
                    {h.changes.map(ch => <li key={ch.age} className="text-[11px] font-bold text-slate-700 break-keep">{ch.kind}: {ch.text}</li>)}
                </ul>
            )}
            {h.notes.map(n => <p key={n} className="text-[11px] font-medium text-slate-400 break-keep">{n}</p>)}
        </div>
    );
}

export function ChildPathCell({ item, birthYear, entryYear }: { item: Institution; birthYear: number; entryYear: number }) {
    const path = childPath(item, birthYear, entryYear);
    return (
        <div className="text-left space-y-1.5">
            <ul className="space-y-1">
                {path.years.map(y => (
                    <StatusLine
                        key={y.schoolYear}
                        status={y.current ? y.status : { ...y.status, label: `${y.status.label} (현재 공시) → 확인 필요` }}
                        prefix={`${y.schoolYear}학년도 만 ${y.age}세`}
                    />
                ))}
            </ul>
            <p className="text-[11px] font-medium text-slate-500 break-keep">{path.summary}</p>
        </div>
    );
}
