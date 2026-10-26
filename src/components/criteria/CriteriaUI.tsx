import type { ComponentType } from 'react';
import { Users, UserCheck, MessageCircleHeart, TreePine, BadgeCheck, ShieldCheck, CalendarClock, BarChart3, ExternalLink, Footprints } from 'lucide-react';
import { CRITERIA_BY_ID, type CheckMethod, type CriterionId, type Level } from '@/utils/selectionCriteria';

type Icon = ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;

interface Theme {
    icon: Icon;
    /** 번호 배지·아이콘 배경 */
    solid: string;
    /** 연한 배경 + 진한 글자 */
    chip: string;
    /** 카드·셀 배경 */
    soft: string;
    text: string;
    bar: string;
    barEmpty: string;
}

// Tailwind는 클래스 문자열을 정적으로 찾으므로 색마다 전체 클래스를 적어 둔다.
export const CRITERION_THEME: Record<CriterionId, Theme> = {
    care: { icon: Users, solid: 'bg-indigo-600 text-white', chip: 'bg-indigo-50 text-indigo-700 border-indigo-200', soft: 'bg-indigo-50/60 border-indigo-100', text: 'text-indigo-700', bar: 'bg-indigo-500', barEmpty: 'bg-indigo-100' },
    stability: { icon: UserCheck, solid: 'bg-emerald-600 text-white', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200', soft: 'bg-emerald-50/60 border-emerald-100', text: 'text-emerald-700', bar: 'bg-emerald-500', barEmpty: 'bg-emerald-100' },
    interaction: { icon: MessageCircleHeart, solid: 'bg-rose-500 text-white', chip: 'bg-rose-50 text-rose-700 border-rose-200', soft: 'bg-rose-50/60 border-rose-100', text: 'text-rose-700', bar: 'bg-rose-500', barEmpty: 'bg-rose-100' },
    play: { icon: TreePine, solid: 'bg-lime-600 text-white', chip: 'bg-lime-50 text-lime-800 border-lime-200', soft: 'bg-lime-50/60 border-lime-100', text: 'text-lime-800', bar: 'bg-lime-500', barEmpty: 'bg-lime-100' },
    record: { icon: BadgeCheck, solid: 'bg-violet-600 text-white', chip: 'bg-violet-50 text-violet-700 border-violet-200', soft: 'bg-violet-50/60 border-violet-100', text: 'text-violet-700', bar: 'bg-violet-500', barEmpty: 'bg-violet-100' },
    safety: { icon: ShieldCheck, solid: 'bg-amber-500 text-white', chip: 'bg-amber-50 text-amber-800 border-amber-200', soft: 'bg-amber-50/60 border-amber-100', text: 'text-amber-800', bar: 'bg-amber-500', barEmpty: 'bg-amber-100' },
    life: { icon: CalendarClock, solid: 'bg-cyan-600 text-white', chip: 'bg-cyan-50 text-cyan-800 border-cyan-200', soft: 'bg-cyan-50/60 border-cyan-100', text: 'text-cyan-800', bar: 'bg-cyan-500', barEmpty: 'bg-cyan-100' },
};

export const METHOD_INFO: Record<CheckMethod, { label: string; short: string; description: string; icon: Icon; className: string }> = {
    data: {
        label: '공시 데이터', short: '데이터', icon: BarChart3,
        description: '유어픽이 공시 자료로 바로 비교해요',
        className: 'bg-slate-900 text-white border border-slate-900',
    },
    portal: {
        label: '포털 확인', short: '포털', icon: ExternalLink,
        description: '공식 포털에서 직접 확인해요',
        className: 'bg-white text-slate-700 border border-slate-300',
    },
    visit: {
        label: '방문 확인', short: '방문', icon: Footprints,
        description: '상담·설명회에서 눈으로 확인해요',
        className: 'bg-white text-slate-600 border border-dashed border-slate-400',
    },
};

export function MethodBadge({ method, short = false }: { method: CheckMethod; short?: boolean }) {
    const info = METHOD_INFO[method];
    const Icon = info.icon;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black whitespace-nowrap ${info.className}`}>
            <Icon className="w-3 h-3" aria-hidden />
            {short ? info.short : info.label}
        </span>
    );
}

export function CriterionIcon({ id, size = 'md' }: { id: CriterionId; size?: 'sm' | 'md' | 'lg' }) {
    const theme = CRITERION_THEME[id];
    const Icon = theme.icon;
    const box = size === 'lg' ? 'w-12 h-12 rounded-2xl' : size === 'md' ? 'w-9 h-9 rounded-xl' : 'w-7 h-7 rounded-lg';
    const glyph = size === 'lg' ? 'w-6 h-6' : size === 'md' ? 'w-4.5 h-4.5' : 'w-3.5 h-3.5';
    return (
        <span className={`relative inline-flex items-center justify-center flex-shrink-0 ${box} ${theme.solid}`} aria-hidden="true">
            <Icon className={glyph} aria-hidden />
            <span className="absolute -top-1.5 -left-1.5 min-w-4 h-4 px-0.5 rounded-full bg-white text-slate-900 text-[10px] font-black leading-4 text-center shadow-sm border border-slate-200">
                {CRITERIA_BY_ID[id].no}
            </span>
        </span>
    );
}

/** 3칸 막대: 채워진 칸 수 = 판정 단계. 기준 초과는 붉은색으로 경고한다. */
export function LevelMeter({ id, level, caution = false, label }: { id: CriterionId; level: Level; caution?: boolean; label: string }) {
    const theme = CRITERION_THEME[id];
    const filled = caution ? 'bg-rose-500' : theme.bar;
    return (
        <span role="img" aria-label={label} className="inline-flex gap-0.5">
            {[1, 2, 3].map(step => (
                <span key={step} className={`h-1.5 w-4 rounded-full ${step <= level ? filled : level === 0 ? 'bg-slate-200' : theme.barEmpty}`} />
            ))}
        </span>
    );
}

export function VerdictText({ id, verdict, level, caution = false }: { id: CriterionId; verdict: string; level: Level; caution?: boolean }) {
    const color = caution ? 'text-rose-600' : level === 0 ? 'text-slate-400' : CRITERION_THEME[id].text;
    return <span className={`text-xs font-black whitespace-nowrap ${color}`}>{verdict}</span>;
}
