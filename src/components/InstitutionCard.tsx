'use client';

import { Institution } from '@/types/institution';
import { useCompareStore } from '@/store/useCompareStore';
import { MapPin, Clock, Users, ListPlus, Bus, Award, CheckCircle2, MoreHorizontal, Sparkles } from 'lucide-react';

interface Props {
    data: Institution;
}

export default function InstitutionCard({ data }: Props) {
    const { compareIds, addCompareId, removeCompareId } = useCompareStore();
    const compositeId = `${data.sidoCode || '11'}_${data.sggCode || '11620'}_${data.id}`;
    const isCompared = compareIds.includes(compositeId);

    const getTypeColor = (type: string) => {
        switch (type) {
            case '국공립': return 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-sm';
            case '사립': return 'bg-indigo-50 text-indigo-700 border-indigo-100 shadow-sm';
            case '가정': return 'bg-amber-50 text-amber-700 border-amber-100 shadow-sm';
            case '민간': return 'bg-rose-50 text-rose-700 border-rose-100 shadow-sm';
            default: return 'bg-slate-50 text-slate-700 border-slate-100 shadow-sm';
        }
    };

    const handleCheckbox = () => {
        if (isCompared) {
            removeCompareId(compositeId);
        } else {
            addCompareId(compositeId);
        }
    };

    // Calculate recruitment ratio
    const capRatio = Math.round((data.currentPupils / (data.capacity || 1)) * 100);

    // Teacher expertise info
    const teacherRatioStr = data.teacherRatio || '';
    const teacherRatioNum = parseInt(teacherRatioStr) || 0;
    const veteranCount = data.teacherTenure?.over6 || 0;

    // Condition for "Professionalism TOP": high 1st-grade teacher ratio AND at least 1 veteran teacher
    const isProfessionalismTop = teacherRatioNum >= 80 && veteranCount >= 1;

    return (
        <div className={`group bg-white rounded-[2.5rem] p-6 md:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.04)] border transition-all duration-500 hover:shadow-[0_24px_56px_-12px_rgba(0,0,0,0.08)] hover:-translate-y-2 ${isCompared ? 'border-indigo-600 ring-8 ring-indigo-50 scale-[1.02]' : 'border-slate-100'}`}>
            <div className="flex justify-between items-start gap-4 mb-6">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className={`inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${getTypeColor(data.type)}`}>
                            {data.type}
                        </span>
                        {/* Stricter condition for "Popular" badge: > 95% ratio and at least 50 capacity */}
                        {capRatio >= 95 && (data.capacity || 0) >= 50 && (
                            <span className="flex items-center gap-1 text-[10px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 px-2 py-1 rounded-lg border border-amber-100 shadow-sm">
                                <Sparkles className="w-3 h-3" /> 인기
                            </span>
                        )}
                        {/* Combined Teacher Professionalism TOP badge */}
                        {isProfessionalismTop && (
                            <span className="flex items-center gap-1 text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100 shadow-sm">
                                <Award className="w-3 h-3" /> 전문성 TOP
                            </span>
                        )}
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors line-clamp-2">
                        {data.name}
                    </h3>
                </div>
                <button
                    onClick={handleCheckbox}
                    className={`flex-shrink-0 w-14 h-14 rounded-3xl flex items-center justify-center transition-all duration-500 border-2 ${isCompared
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100 rotate-[360deg]'
                        : 'bg-slate-50 border-slate-50 text-slate-300 hover:bg-white hover:border-indigo-200 hover:text-indigo-500 hover:shadow-lg'
                        }`}
                >
                    {isCompared ? <CheckCircle2 className="w-6 h-6" /> : <ListPlus className="w-6 h-6" />}
                </button>
            </div>

            <div className="space-y-5">
                <div className="flex items-center gap-3 group/loc">
                    <div className="bg-slate-50 p-2.5 rounded-2xl group-hover/loc:bg-indigo-50 transition-colors border border-slate-100 shadow-sm">
                        <MapPin className="w-4 h-4 text-slate-400 group-hover/loc:text-indigo-600 transition-colors" />
                    </div>
                    <span className="text-sm text-slate-600 leading-snug font-bold line-clamp-2">{data.address}</span>
                </div>

                <div className="flex flex-wrap gap-2">
                    {data.hasSchoolBus && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black border border-indigo-100 uppercase tracking-tight">
                            <Bus className="w-3 h-3" /> 통학차량
                        </div>
                    )}
                </div>

                {data.specialPrograms && data.specialPrograms !== '정보 없음' && (
                    <div className="bg-indigo-50/30 p-4 rounded-[1.5rem] border border-indigo-100/30 mt-4">
                        <div className="flex items-center text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-2">
                            <Sparkles className="w-3 h-3 mr-1.5" />
                            <span>교육 철학 및 프로그램</span>
                        </div>
                        <p className="text-indigo-900/70 text-xs font-bold leading-relaxed line-clamp-3">
                            {data.specialPrograms}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
