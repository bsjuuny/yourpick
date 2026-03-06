'use client';

import { Institution } from '@/types/institution';
import { X, Users, Clock, MapPin, Bus, Phone, Award, ShieldAlert, BadgeCheck, School, ExternalLink, ChevronRight, Sparkles, ShieldCheck, Utensils } from 'lucide-react';
import { useCompareStore } from '@/store/useCompareStore';
import React from 'react';

interface ComparisonField {
    key: string;
    label: string;
    icon: React.ReactNode;
    render?: (item: Institution) => React.ReactNode;
}

interface Category {
    name: string;
    fields: ComparisonField[];
}

interface Props {
    data: Institution[];
}

export default function CompareTable({ data }: Props) {
    const removeCompareId = useCompareStore((state) => state.removeCompareId);

    if (!data || data.length === 0) {
        return (
            <div className="text-center py-24 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
                <div className="bg-white w-20 h-20 rounded-3xl shadow-sm flex items-center justify-center mx-auto mb-6 transform -rotate-6">
                    <School className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">비교할 기관이 없습니다</h3>
                <p className="text-slate-500 max-w-xs mx-auto text-sm leading-relaxed">
                    관심 있는 유치원이나 어린이집을 담아 한눈에 비교하고 최고의 환경을 선택하세요.
                </p>
            </div>
        );
    }

    // Helper to find the "best" in row (e.g., highest teacher ratio)
    const getBestValue = (key: string) => {
        if (key === 'teacherRatio') {
            const ratios = data.map(item => parseFloat(item.teacherRatio || '0'));
            return Math.max(...ratios);
        }
        if (key === 'over6') {
            const counts = data.map(item => item.teacherTenure?.over6 || 0);
            return Math.max(...counts);
        }
        return -1;
    };

    // The hasSpecialPrograms check is no longer needed as it's now a dedicated category
    // const hasSpecialPrograms = data.some(item => item.specialPrograms && item.specialPrograms !== '정보 없음');

    const categories: Category[] = [
        {
            name: '기본 정보',
            fields: [
                { key: 'type', label: '설립 유형', icon: <School className="w-4 h-4 opacity-70" /> },
                { key: 'address', label: '위치', icon: <MapPin className="w-4 h-4 opacity-70" /> },
                { key: 'ageRange', label: '대상 연령', icon: <Users className="w-4 h-4 opacity-70" /> },
                { key: 'operatingHours', label: '운영 시간', icon: <Clock className="w-4 h-4 opacity-70" /> },
                { key: 'phone', label: '연락처', icon: <Phone className="w-4 h-4 opacity-70" /> },
                {
                    key: 'pupils',
                    label: '현원/정원',
                    icon: <Users className="w-4 h-4 opacity-70" />,
                    render: (item: Institution) => {
                        const ratio = Math.round((item.currentPupils / (item.capacity || 1)) * 100);
                        return (
                            <div className="flex flex-col items-center gap-1.5">
                                <div className="text-slate-900 font-bold text-base">{item.currentPupils} <span className="text-slate-400 font-normal text-xs px-1">/</span> {item.capacity}</div>
                                <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${ratio > 90 ? 'bg-amber-400' : 'bg-indigo-500'}`}
                                        style={{ width: `${Math.min(ratio, 100)}%` }}
                                    ></div>
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">확보율 {ratio}%</span>
                            </div>
                        );
                    }
                },
            ]
        },
        {
            name: '안전 및 급식',
            fields: [
                { key: 'safetyStatus', label: '안전 관리', icon: <ShieldCheck className="w-4 h-4 opacity-70" /> },
                { key: 'mealStatus', label: '식단 및 영양', icon: <Utensils className="w-4 h-4 opacity-70" /> },
                {
                    key: 'hasSchoolBus',
                    label: '통학 서비스',
                    icon: <Bus className="w-4 h-4 opacity-70" />,
                    render: (item: Institution) => item.hasSchoolBus ? (
                        <div className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[11px] font-bold rounded-full border border-emerald-100 flex items-center justify-center gap-1 mx-auto w-fit">
                            <BadgeCheck className="w-3 h-3" /> 운행 중
                        </div>
                    ) : (
                        <span className="text-slate-300 font-medium text-[11px]">미운행</span>
                    )
                },
            ]
        },
        {
            name: '교육 프로그램',
            fields: [
                {
                    key: 'specialPrograms',
                    label: '철학 및 프로그램',
                    icon: <Sparkles className="w-4 h-4 opacity-70" />,
                    render: (item: Institution) => (
                        <div className="text-xs font-bold text-slate-700 whitespace-pre-wrap leading-relaxed max-w-[260px] mx-auto text-left" title={item.specialPrograms || ''}>
                            {item.specialPrograms || '정보 없음'}
                        </div>
                    )
                }
            ]
        },
        {
            name: '교사 전문성',
            fields: [
                {
                    key: 'childrenPerTeacher',
                    label: '교사 1인당 원아',
                    icon: <Users className="w-4 h-4 opacity-70" />,
                    render: (item: Institution) => (
                        <div className="text-lg font-black text-slate-900">{item.childrenPerTeacher || '-'} <span className="text-xs text-slate-400 font-normal">명</span></div>
                    )
                },
                {
                    key: 'teacherRatio',
                    label: '1급/수석교사 비율',
                    icon: <Award className="w-4 h-4 opacity-70" />,
                    render: (item: Institution) => {
                        const ratioStr = item.teacherRatio || '0%';
                        const isUnknown = ratioStr.startsWith('정보');
                        const ratioNum = parseFloat(ratioStr);
                        const veteranCount = item.teacherTenure?.over6 || 0;

                        // New Professionalism TOP: Ratio >= 80% AND Veteran >= 1
                        const isBest = !isUnknown && ratioNum >= 80 && veteranCount >= 1;

                        return (
                            <div className="relative">
                                <div className={`text-lg font-black tracking-tight ${isBest ? 'text-indigo-600' : isUnknown ? 'text-slate-300' : 'text-slate-700'}`}>
                                    {isUnknown ? ratioStr : ratioStr.split(' ')[0]}
                                </div>
                                {isBest && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[8px] px-1.5 py-0.5 rounded-sm font-bold animate-bounce shadow-sm">
                                        전문성 TOP
                                    </div>
                                )}
                                {!isUnknown && (
                                    <div className="text-[10px] text-slate-400 font-medium mt-0.5">{ratioStr.split('(')[1]?.replace(')', '') || ''}</div>
                                )}
                            </div>
                        );
                    }
                },
                {
                    key: 'teacherTenure',
                    label: '근속 분포 (6년 이상)',
                    icon: <Clock className="w-4 h-4 opacity-70" />,
                    render: (item: Institution) => {
                        const t = item.teacherTenure;
                        if (!t) return <span className="text-slate-300 italic">-</span>;
                        const total = t.under1 + t.year1to2 + t.year2to4 + t.year4to6 + t.over6;
                        if (total === 0) return '0명';
                        const isBestValue = t.over6 === getBestValue('over6') && t.over6 > 0;
                        const over6Ratio = Math.round((t.over6 / total) * 100);

                        return (
                            <div className="flex flex-col items-center w-full max-w-[150px] mx-auto space-y-2">
                                <div className="flex justify-between w-full items-end">
                                    <div className="flex flex-col items-start leading-none">
                                        <span className="text-[9px] text-slate-400 font-bold uppercase">Veteran</span>
                                        <span className={`text-base font-black ${isBestValue ? 'text-indigo-600' : 'text-slate-800'}`}>{t.over6}명</span>
                                    </div>
                                    <div className="text-[10px] font-bold text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded">
                                        {over6Ratio}%
                                    </div>
                                </div>
                                <div className="w-full h-2 bg-slate-100 rounded-full flex overflow-hidden">
                                    <div className="h-full bg-slate-300" style={{ width: `${((t.under1 + t.year1to2) / total) * 100}%` }}></div>
                                    <div className="h-full bg-slate-400 opacity-50" style={{ width: `${((t.year2to4 + t.year4to6) / total) * 100}%` }}></div>
                                    <div className={`h-full ${isBestValue ? 'bg-indigo-600' : 'bg-indigo-400'}`} style={{ width: `${over6Ratio}%` }}></div>
                                </div>
                            </div>
                        );
                    }
                },
            ]
        },
        {
            name: '정보 신뢰도',
            fields: [
                {
                    key: 'alimiUrl',
                    label: '지적사항 검증',
                    icon: <ShieldAlert className="w-4 h-4 opacity-70" />,
                    render: (item: Institution) => item.alimiUrl ? (
                        <a href={item.alimiUrl} target="_blank" rel="noopener noreferrer"
                            className="group/link flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-50 hover:bg-slate-900 text-slate-700 hover:text-white rounded-xl text-[11px] font-bold transition-all duration-300 border border-slate-100 shadow-sm">
                            공시내역 확인 <ExternalLink className="w-3 h-3 opacity-50 group-hover/link:opacity-100" />
                        </a>
                    ) : <span className="text-slate-300">-</span>
                },
            ]
        }
    ];

    return (
        <div className="bg-white rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] overflow-hidden border border-slate-100 w-full max-w-full">
            <div className="overflow-x-scroll custom-scrollbar scroll-smooth">
                <table className="min-w-full border-separate border-spacing-0 table-fixed">
                    <thead>
                        <tr>
                            {/* Header cell: Fixed width for labels */}
                            <th className="sticky left-0 z-30 bg-slate-50/95 backdrop-blur-xl border-b border-r border-slate-100 px-6 py-8 w-[180px] min-w-[180px] align-middle text-left shadow-[4px_0_10px_-4px_rgba(0,0,0,0.05)]">
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] whitespace-nowrap">Matrix</span>
                                    <h2 className="text-lg font-black text-slate-900 leading-tight whitespace-nowrap">비교 메트릭스</h2>
                                </div>
                            </th>
                            {data.map((item) => (
                                <th key={item.id} className="p-8 pb-10 border-b border-slate-100 bg-white min-w-[300px] w-[300px] text-center relative">
                                    <button
                                        onClick={() => removeCompareId(`${item.sidoCode || '11'}_${item.sggCode || '11620'}_${item.id}`)}
                                        className="absolute top-6 right-6 p-2 rounded-xl text-slate-300 hover:bg-rose-50 hover:text-rose-500 transition-all duration-200"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>

                                    <div className="flex flex-col items-center">
                                        <div className={`mb-4 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border shadow-sm ${item.type === '국공립' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                            item.type === '사립' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                                            }`}>
                                            {item.type}
                                        </div>
                                        <h3 className="text-xl font-black text-slate-900 leading-[1.2] max-w-[200px] break-keep">
                                            {item.name}
                                        </h3>
                                        <div className="mt-3 flex gap-1 items-center text-[10px] font-bold text-slate-400">
                                            <MapPin className="w-3 h-3" />
                                            {item.address.split(' ')[1]} {item.address.split(' ')[2]}
                                        </div>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {categories.map((category) => (
                            <React.Fragment key={category.name}>
                                <tr>
                                    <td className="sticky left-0 z-20 bg-slate-50/95 backdrop-blur-md px-6 py-4 border-r border-slate-100 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.05)] w-[180px] min-w-[180px]">
                                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{category.name}</span>
                                    </td>
                                    {data.map(item => (
                                        <td key={`${item.id}-cat-${category.name}`} className="bg-slate-50/50 border-b border-slate-50 h-10 w-[300px]"></td>
                                    ))}
                                </tr>
                                {category.fields.map((field) => (
                                    <tr key={field.key} className="group">
                                        <th className="sticky left-0 z-20 bg-white group-hover:bg-slate-50/80 px-6 py-6 text-left border-r border-slate-50 transition-colors shadow-[4px_0_10px_-4px_rgba(0,0,0,0.05)] w-[180px] min-w-[180px]">
                                            <div className="flex items-center gap-2">
                                                <div className="p-2 bg-slate-50 rounded-lg text-slate-400 group-hover:text-indigo-600 transition-colors flex-shrink-0">
                                                    {field.icon}
                                                </div>
                                                <span className="text-xs font-bold text-slate-600 tracking-tight whitespace-nowrap">{field.label}</span>
                                            </div>
                                        </th>
                                        {data.map((item) => {
                                            const value = item[field.key as keyof Institution];
                                            return (
                                                <td
                                                    key={`${item.id}-${field.key}`}
                                                    className="p-8 border-b border-slate-50 text-center align-middle group-hover:bg-slate-50/30 transition-colors min-w-[300px] w-[300px]"
                                                >
                                                    {field.render ? field.render(item) : (
                                                        <span className="text-slate-900 font-bold text-[13px] whitespace-nowrap overflow-hidden text-ellipsis block max-w-[260px] mx-auto" title={String(value || '')}>
                                                            {typeof value === 'object' ? '-' : String(value || '-')}
                                                        </span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Legend / Feedback */}
            <div className="p-8 bg-slate-50 flex items-center justify-between border-t border-slate-100">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
                        <div className="w-3 h-3 bg-indigo-600 rounded-sm"></div>
                        <span>Best Indicator</span>
                    </div>
                </div>
                <div className="hidden md:flex items-center text-[11px] font-bold text-slate-400 gap-2">
                    <ShieldAlert className="w-4 h-4" />
                    모든 정보는 유치원 알리미 포털의 공시 데이터를 기반으로 합니다.
                </div>
            </div>
        </div>
    );
}
