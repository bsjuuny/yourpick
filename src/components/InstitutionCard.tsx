'use client';

import { Institution } from '@/types/institution';
import { useCompareStore } from '@/store/useCompareStore';
import { MapPin, ListPlus, CheckCircle2, Bus } from 'lucide-react';
import { assessCare, assessSafety, assessStability, lifeFacts, type Assessment, type CriterionId } from '@/utils/selectionCriteria';
import { CRITERION_THEME, CriterionIcon, LevelMeter, MethodBadge, VerdictText } from '@/components/criteria/CriteriaUI';
import { CRITERIA_BY_ID } from '@/utils/selectionCriteria';

interface Props {
    data: Institution;
}

const TYPE_COLOR: Record<string, string> = {
    '국공립': 'bg-emerald-50 text-emerald-700 border-emerald-100',
    '사립': 'bg-indigo-50 text-indigo-700 border-indigo-100',
    '가정': 'bg-amber-50 text-amber-700 border-amber-100',
    '민간': 'bg-rose-50 text-rose-700 border-rose-100',
    '사회복지법인': 'bg-teal-50 text-teal-700 border-teal-100',
    '법인단체': 'bg-cyan-50 text-cyan-700 border-cyan-100',
    '부모협동': 'bg-purple-50 text-purple-700 border-purple-100',
    '직장': 'bg-blue-50 text-blue-700 border-blue-100',
};

function ScoreTile({ id, assessment }: { id: CriterionId; assessment: Assessment }) {
    const theme = CRITERION_THEME[id];
    const title = CRITERIA_BY_ID[id].title;
    return (
        <div className={`rounded-2xl border p-3 ${theme.soft}`}>
            <div className="flex items-center gap-2 mb-2">
                <CriterionIcon id={id} size="sm" />
                <span className="text-xs font-black text-slate-700 break-keep">{title}</span>
            </div>
            {assessment.metric && <div className="text-[11px] font-bold text-slate-500 whitespace-nowrap">{assessment.metric}</div>}
            <div className="flex items-baseline justify-between gap-1.5">
                <span className="text-xl font-black text-slate-900 leading-tight whitespace-nowrap">{assessment.value}</span>
                <VerdictText id={id} verdict={assessment.verdict} level={assessment.level} caution={assessment.caution} />
            </div>
            <div className="mt-2">
                <LevelMeter id={id} level={assessment.level} caution={assessment.caution} label={`${title} ${assessment.verdict}`} />
            </div>
            {assessment.detail && (
                <p className="mt-1.5 text-[11px] font-medium text-slate-500 leading-snug break-keep">{assessment.detail}</p>
            )}
        </div>
    );
}

export default function InstitutionCard({ data }: Props) {
    const { compareIds, addCompareId, removeCompareId } = useCompareStore();
    const compositeId = `${data.sidoCode || '11'}_${data.sggCode || '11620'}_${data.id}`;
    const isCompared = compareIds.includes(compositeId);

    const handleCheckbox = () => {
        if (isCompared) removeCompareId(compositeId);
        else addCompareId(compositeId);
    };

    const life = lifeFacts(data);
    const availabilityColor = life.availability.tone === 'open'
        ? 'bg-white text-cyan-800 border-cyan-200'
        : 'bg-white text-amber-700 border-amber-200';

    return (
        <article aria-label={data.name} className={`group bg-white rounded-[2.5rem] p-6 md:p-7 shadow-premium border transition-all duration-500 hover:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] hover:-translate-y-1 ${isCompared ? 'border-indigo-600 ring-8 ring-indigo-50/50' : 'border-slate-100'}`}>
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-black tracking-widest border ${TYPE_COLOR[data.type] ?? 'bg-slate-50 text-slate-700 border-slate-100'}`}>
                        {data.type}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black tracking-widest border ${data.source === '어린이집'
                        ? 'bg-orange-50 text-orange-600 border-orange-100'
                        : 'bg-sky-50 text-sky-600 border-sky-100'
                    }`}>
                        {data.source || '유치원'}
                    </span>
                    {data.tags?.includes('운영 확인 필요') && (
                        <span className="text-xs font-black text-rose-500 bg-rose-50 px-2 py-1 rounded-lg border border-rose-100">
                            운영 확인 필요
                        </span>
                    )}
                </div>
                <button
                    onClick={handleCheckbox}
                    aria-label={isCompared ? `비교함에서 제거: ${data.name}` : `비교함에 추가: ${data.name}`}
                    aria-pressed={isCompared}
                    className={`flex-shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-500 border-2 ${isCompared
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-glow'
                        : 'bg-slate-50 border-slate-50 text-slate-300 hover:bg-white hover:border-indigo-200 hover:text-indigo-500 hover:shadow-xl'
                    }`}
                >
                    {isCompared ? <CheckCircle2 className="w-5 h-5" aria-hidden="true" /> : <ListPlus className="w-5 h-5" aria-hidden="true" />}
                </button>
            </div>

            <h3 className="text-xl md:text-2xl font-black text-slate-900 leading-snug group-hover:text-indigo-600 transition-colors break-keep font-heading">
                {data.name}
            </h3>
            <div className="flex items-start gap-1.5 mt-2 mb-5 text-sm text-slate-500 font-bold">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-400" aria-hidden="true" />
                <span className="line-clamp-2">{data.address}</span>
            </div>
            {(data.locationStatus === 'unconfirmed' || data.latitude == null || data.longitude == null) && (
                <p className="-mt-3 mb-4 text-xs font-bold text-amber-700">위치 좌표 미확인 · 주소를 확인해 주세요</p>
            )}

            <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black text-slate-400 tracking-wide">고르는 기준</span>
                <MethodBadge method="data" />
            </div>
            <div className="grid grid-cols-2 gap-2">
                <ScoreTile id="care" assessment={assessCare(data)} />
                <ScoreTile id="stability" assessment={assessStability(data)} />
                <ScoreTile id="safety" assessment={assessSafety(data)} />
                <div className={`rounded-2xl border p-3 ${CRITERION_THEME.life.soft}`}>
                    <div className="flex items-center gap-2 mb-2">
                        <CriterionIcon id="life" size="sm" />
                        <span className="text-xs font-black text-slate-700">{CRITERIA_BY_ID.life.title}</span>
                    </div>
                    <div className="text-sm font-black text-slate-900 leading-tight">{life.hours ?? '운영시간 정보 없음'}</div>
                    <div className="mt-2 flex flex-wrap gap-1">
                        <span className={`px-1.5 py-0.5 rounded-md border text-[11px] font-black ${availabilityColor}`}>{life.availability.label}</span>
                        {life.priority && (
                            <span className="px-1.5 py-0.5 rounded-md border bg-white text-slate-600 border-slate-300 text-[11px] font-black">{life.priority}</span>
                        )}
                        {life.extended.map(label => (
                            <span key={label} className="px-1.5 py-0.5 rounded-md border bg-white text-cyan-800 border-cyan-200 text-[11px] font-black">{label}</span>
                        ))}
                        {life.bus && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md border bg-white text-cyan-800 border-cyan-200 text-[11px] font-black">
                                <Bus className="w-3 h-3" aria-hidden="true" />통학차량
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <p className="mt-4 flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-slate-400">
                <MethodBadge method="visit" short />
                <MethodBadge method="portal" short />
                <span className="break-keep">상호작용·놀이·평가 이력은 비교함에서 체크하세요</span>
            </p>
        </article>
    );
}
