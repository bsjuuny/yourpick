'use client';

import { Institution } from '@/types/institution';
import { useCompareStore } from '@/store/useCompareStore';
import { MapPin, Users, ListPlus, Bus, Award, CheckCircle2, Sparkles, Cctv, Baby, Wallet, AlertTriangle } from 'lucide-react';

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
            case '사회복지법인': return 'bg-teal-50 text-teal-700 border-teal-100 shadow-sm';
            case '법인단체': return 'bg-cyan-50 text-cyan-700 border-cyan-100 shadow-sm';
            case '부모협동': return 'bg-purple-50 text-purple-700 border-purple-100 shadow-sm';
            case '직장': return 'bg-blue-50 text-blue-700 border-blue-100 shadow-sm';
            default: return 'bg-slate-50 text-slate-700 border-slate-100 shadow-sm';
        }
    };

    const handleCheckbox = () => {
        if (isCompared) removeCompareId(compositeId);
        else addCompareId(compositeId);
    };

    // 점유율
    const capRatio = Math.round((data.currentPupils / (data.capacity || 1)) * 100);
    const capColor = capRatio >= 90 ? 'text-amber-600 bg-amber-50 border-amber-100'
        : capRatio <= 30 ? 'text-slate-500 bg-slate-50 border-slate-100'
        : 'text-emerald-600 bg-emerald-50 border-emerald-100';

    // 전문성 TOP: 전문교사 비율 80% 이상 + 6년 이상 경력 20% 이상
    const teacherRatioNum = parseInt(data.teacherRatio || '0') || 0;
    const isProfessionalismTop = teacherRatioNum >= 80 && (data.teacherTenure?.over6 ?? 0) >= 20;

    // 인기 배지: 정원 무관, 점유율 95% 이상
    const isPopular = capRatio >= 95;

    // 교사 수 추출: (전문교사명/전체교사명) 포맷에서 전체교사수를 우선으로 함
    const teacherCountMatch = data.teacherRatio?.match(/\((\d+)명\/(\d+)명\)/);
    const totalTeacherCount = teacherCountMatch ? parseInt(teacherCountMatch[2]) : null;

    // ageRange 유효 여부
    const ageRangeValid = data.ageRange && data.ageRange !== '-';

    // 상단에 표시할 핵심 태그 (우선순위 순, 최대 3개)
    // 하단에 이미 표시되는 정보(셔틀·CCTV·정원현황)는 제외
    const EXCLUDED_FROM_TOP = new Set([
        '셔틀운행', '통학차량', 'CCTV완비', '정원여유', '거의만원',
        '대규모시설', '소규모시설', '영양사배치', '특성화교육',
    ]);
    const WARNING_TAGS = new Set(['교사비율주의', '영양사법정미달', 'CCTV미설치']);
    const TAG_PRIORITY = [
        '즉시입소가능', '대기있음', '숙련교사',
        '교사비율우수', '교사비율주의',
        '영양사법정충족', '영양사법정미달', 'CCTV미설치',
        '야간연장', '24시간', '장애아통합', '장애아전담', '영아전담',
        '방과후운영', '시간제보육', '휴일운영', '공동육아',
        '영어교육', '체육특성화',
    ];
    const topTags = TAG_PRIORITY
        .filter(t => data.tags?.includes(t) && !EXCLUDED_FROM_TOP.has(t))
        .slice(0, 3);


    return (
        <article aria-label={data.name} className={`group bg-white rounded-[2.5rem] p-6 md:p-8 shadow-premium border transition-all duration-500 hover:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] hover:-translate-y-2 ${isCompared ? 'border-indigo-600 ring-8 ring-indigo-50/50 scale-[1.02]' : 'border-slate-100'}`}>
            {/* 배지 행 + 비교담기 버튼 */}
            <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest border ${getTypeColor(data.type)}`}>
                        {data.type}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black tracking-widest border shadow-sm ${data.source === '어린이집'
                        ? 'bg-orange-50 text-orange-600 border-orange-100'
                        : 'bg-sky-50 text-sky-600 border-sky-100'
                    }`}>
                        {data.source || '유치원'}
                    </span>
                    {isPopular && (
                        <span className="flex items-center gap-1 text-xs font-black text-amber-600 uppercase tracking-widest bg-amber-50 px-2 py-1 rounded-lg border border-amber-100 shadow-sm">
                            <Sparkles className="w-3 h-3" /> 인기
                        </span>
                    )}
                    {isProfessionalismTop && (
                        <span className="flex items-center gap-1 text-xs font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100 shadow-sm">
                            <Award className="w-3 h-3" /> 전문성 TOP
                        </span>
                    )}
                    {topTags.map(tag => (
                        WARNING_TAGS.has(tag) ? (
                            <span key={tag} className="flex items-center gap-1 text-xs font-black text-white bg-amber-500 px-2 py-1 rounded-lg border border-amber-400 shadow-sm">
                                <AlertTriangle className="w-3 h-3" aria-hidden="true" /> {tag}
                            </span>
                        ) : (
                            <span key={tag} className="flex items-center gap-1 text-xs font-black text-teal-600 bg-teal-50 px-2 py-1 rounded-lg border border-teal-100 shadow-sm">
                                {tag}
                            </span>
                        )
                    ))}
                    {data.tags?.includes('운영 확인 필요') && (
                        <span className="flex items-center gap-1 text-xs font-black text-rose-500 bg-rose-50 px-2 py-1 rounded-lg border border-rose-100 shadow-sm">
                            운영 확인 필요
                        </span>
                    )}
                </div>
                <button
                    onClick={handleCheckbox}
                    aria-label={isCompared ? `비교함에서 제거: ${data.name}` : `비교함에 추가: ${data.name}`}
                    aria-pressed={isCompared}
                    className={`flex-shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-500 border-2 ${isCompared
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-glow rotate-[360deg]'
                        : 'bg-slate-50 border-slate-50 text-slate-300 hover:bg-white hover:border-indigo-200 hover:text-indigo-500 hover:shadow-xl'
                    }`}
                >
                    {isCompared ? <CheckCircle2 className="w-5 h-5" aria-hidden="true" /> : <ListPlus className="w-5 h-5" aria-hidden="true" />}
                </button>
            </div>

            {/* 기관명 */}
            <div className="mb-6">
                <h3 className="text-2xl font-black text-slate-900 leading-snug group-hover:text-indigo-600 transition-colors break-keep font-heading mb-2">
                    {data.name}
                </h3>
            </div>

            <div className="space-y-5">
                <div className="flex items-center gap-3 group/loc">
                    <div className="bg-slate-50 p-2.5 rounded-2xl group-hover/loc:bg-indigo-50 transition-colors border border-slate-100 shadow-sm" aria-hidden="true">
                        <MapPin className="w-4 h-4 text-slate-400 group-hover/loc:text-indigo-600 transition-colors" aria-hidden="true" />
                    </div>
                    <span className="text-sm text-slate-600 leading-snug font-bold line-clamp-2">{data.address}</span>
                </div>

                {/* 정원/현원/점유율 가시화 */}
                <div className="space-y-3">
                    <div className="flex justify-between items-end mb-1">
                        <div className={`flex items-center gap-1.5 text-[13px] font-black ${capColor.split(' ')[0]}`}>
                            <Users className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>현원 {data.currentPupils}명 / 정원 {data.capacity}명</span>
                        </div>
                        <span className="text-xs font-black text-slate-400">{capRatio}% 확보</span>
                    </div>
                    <div
                        role="progressbar"
                        aria-valuenow={capRatio}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`수용 인원 확보율 ${capRatio}%`}
                        className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden shadow-inner border border-slate-100"
                    >
                        <div
                            className={`h-full rounded-full transition-all duration-1000 ease-out shadow-sm ${capRatio >= 90 ? 'bg-amber-400' : 'bg-indigo-500'}`}
                            style={{ width: `${Math.min(capRatio, 100)}%` }}
                        ></div>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap mt-4">
                    {totalTeacherCount !== null && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-600 rounded-xl text-xs font-black border border-slate-100 hover:bg-white transition-colors">
                            {data.source === '유치원' ? '교사' : '보육교사'} {totalTeacherCount}명
                            {data.childrenPerTeacher ? ` · 아동 ${data.childrenPerTeacher}명/교사` : ''}
                        </div>
                    )}
                </div>

                {/* 연령 및 비용 */}
                <div className="flex items-center gap-2 flex-wrap">
                    {ageRangeValid && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 text-sky-600 rounded-xl text-xs font-black border border-sky-100 w-fit">
                            <Baby className="w-3 h-3" aria-hidden="true" /> {data.ageRange}
                        </div>
                    )}
                    {data.expenseLevel && data.expenseLevel !== '-' && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 text-violet-600 rounded-xl text-xs font-black border border-violet-100 w-fit">
                            <Wallet className="w-3 h-3" aria-hidden="true" /> {data.expenseLevel}
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap gap-2">
                    {data.hasSchoolBus && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-black border border-indigo-100 uppercase tracking-tight">
                            <Bus className="w-3 h-3" aria-hidden="true" /> 통학차량
                        </div>
                    )}
                    {data.source === '어린이집' && data.waitlistTotal !== undefined && data.waitlistTotal > 0 && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-xl text-xs font-black border border-orange-100 uppercase tracking-tight">
                            <Users className="w-3 h-3" aria-hidden="true" /> 대기 {data.waitlistTotal}명
                        </div>
                    )}
                    {data.source === '어린이집' && data.cctvCount !== undefined && data.cctvCount > 0 && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-500 rounded-xl text-xs font-black border border-slate-100 uppercase tracking-tight">
                            <Cctv className="w-3 h-3" aria-hidden="true" /> CCTV {data.cctvCount}대
                        </div>
                    )}
                </div>

                {data.specialPrograms && (
                    <div className="bg-indigo-50/30 p-4 rounded-[1.5rem] border border-indigo-100/30 mt-4">
                        <div className="flex items-center text-xs font-black text-indigo-300 uppercase tracking-widest mb-2">
                            <Sparkles className="w-3 h-3 mr-1.5" aria-hidden="true" />
                            <span>교육 철학 및 프로그램</span>
                        </div>
                        <p className="text-indigo-900/70 text-xs font-bold leading-relaxed line-clamp-3">
                            {data.specialPrograms}
                        </p>
                    </div>
                )}
            </div>
        </article>
    );
}
