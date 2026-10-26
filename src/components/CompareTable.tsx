'use client';

import React from 'react';
import { Institution } from '@/types/institution';
import { X, MapPin, Phone, School, Baby, ExternalLink, Crown, Check, Minus, Bus } from 'lucide-react';
import { useCompareStore } from '@/store/useCompareStore';
import { institutionKey, useVisitChecklistStore } from '@/store/useVisitChecklistStore';
import {
    CRITERIA, ageBreakdownReliable, ageLoads, assessCare, assessSafety, assessStability, bestIndexes, lifeFacts, portalLink, safetyChecks,
    type Assessment, type CriterionId, type CriterionMeta,
} from '@/utils/selectionCriteria';
import { CRITERION_THEME, CriterionIcon, LevelMeter, MethodBadge, VerdictText } from '@/components/criteria/CriteriaUI';

interface Props {
    data: Institution[];
}

interface Row {
    key: string;
    label: string;
    render: (item: Institution, index: number) => React.ReactNode;
}

const LABEL_COL = 'w-[112px] min-w-[112px] sm:w-[168px] sm:min-w-[168px]';
const DATA_COL = 'w-[236px] min-w-[236px] sm:w-[280px] sm:min-w-[280px]';

function Empty() {
    return <span className="text-slate-300 font-bold">-</span>;
}

function AssessmentCell({ id, assessment, best }: { id: CriterionId; assessment: Assessment; best: boolean }) {
    if (assessment.level === 0 && assessment.value === '-') return <span className="text-xs font-bold text-slate-400">정보 없음</span>;
    const theme = CRITERION_THEME[id];
    return (
        <div className={`relative mx-auto max-w-[220px] rounded-2xl px-3 py-3 ${best ? `border-2 ${theme.soft}` : ''}`}>
            {best && (
                <span className={`absolute -top-2.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black whitespace-nowrap ${theme.solid}`}>
                    <Crown className="w-3 h-3" aria-hidden="true" /> 비교 중 가장 좋음
                </span>
            )}
            {assessment.metric && <div className="text-[11px] font-bold text-slate-500">{assessment.metric}</div>}
            <div className="flex items-baseline justify-center gap-2">
                <span className="text-xl font-black text-slate-900 whitespace-nowrap">{assessment.value}</span>
                <VerdictText id={id} verdict={assessment.verdict} level={assessment.level} caution={assessment.caution} />
            </div>
            <div className="mt-1.5 flex justify-center">
                <LevelMeter id={id} level={assessment.level} caution={assessment.caution} label={assessment.verdict} />
            </div>
            {assessment.detail && <p className="mt-1.5 text-[11px] font-medium text-slate-500 leading-snug break-keep">{assessment.detail}</p>}
        </div>
    );
}

function ChecklistCell({ item, criterion }: { item: Institution; criterion: CriterionMeta }) {
    const key = institutionKey(item);
    const checked = useVisitChecklistStore(state => state.checks[key]) ?? [];
    const toggle = useVisitChecklistStore(state => state.toggle);
    const theme = CRITERION_THEME[criterion.id];
    const done = criterion.checklist.filter(c => checked.includes(`${criterion.id}:${c.id}`)).length;
    return (
        <div className="text-left max-w-[240px] mx-auto">
            <div className="flex items-center justify-between mb-1.5">
                <MethodBadge method={criterion.method === 'portal' ? 'portal' : 'visit'} short />
                <span className={`text-[11px] font-black ${done === criterion.checklist.length ? theme.text : 'text-slate-400'}`}>
                    {done}/{criterion.checklist.length} 확인
                </span>
            </div>
            <ul className="space-y-1">
                {criterion.checklist.map(c => {
                    const itemKey = `${criterion.id}:${c.id}`;
                    const isChecked = checked.includes(itemKey);
                    return (
                        <li key={c.id}>
                            <button
                                type="button"
                                role="checkbox"
                                aria-checked={isChecked}
                                onClick={() => toggle(key, itemKey)}
                                className={`w-full flex items-start gap-2 rounded-xl px-2 py-1.5 text-left text-xs font-bold transition-colors ${isChecked ? `${theme.soft} border text-slate-800` : 'border border-dashed border-slate-200 text-slate-500 hover:border-slate-400'}`}
                            >
                                <span className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded-md flex items-center justify-center ${isChecked ? theme.solid : 'bg-white border border-slate-300'}`} aria-hidden="true">
                                    {isChecked && <Check className="w-3 h-3" />}
                                </span>
                                <span className="break-keep leading-snug">{c.text}</span>
                            </button>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

function criterionRows(criterion: CriterionMeta, data: Institution[]): Row[] {
    const rows: Row[] = [];
    const checklistRow: Row = {
        key: `${criterion.id}-checklist`,
        label: criterion.method === 'portal' ? '확인 체크' : '방문 체크',
        render: (item) => <ChecklistCell item={item} criterion={criterion} />,
    };

    switch (criterion.id) {
        case 'care': {
            const scores = data.map(assessCare);
            const best = bestIndexes(scores);
            rows.push({ key: 'care-score', label: '판정', render: (_, i) => <AssessmentCell id="care" assessment={scores[i]} best={best.includes(i)} /> });
            rows.push({
                key: 'care-detail', label: '반·교사별 아이 수',
                render: (item) => {
                    const loads = ageBreakdownReliable(item) ? ageLoads(item) : [];
                    if (loads.length === 0) {
                        return item.childrenPerTeacher
                            ? <span className="text-sm font-bold text-slate-700">교사 1명당 {item.childrenPerTeacher}명</span>
                            : <Empty />;
                    }
                    return (
                        <ul className="space-y-1 max-w-[200px] mx-auto">
                            {loads.map(({ age, perClass, limit }) => (
                                <li key={age} className="flex items-center gap-2 text-xs">
                                    <span className="w-10 text-left font-bold text-slate-500">만{age}세</span>
                                    <span className="relative flex-1 h-2 rounded-full bg-indigo-100 overflow-hidden" aria-hidden="true">
                                        <span className={`absolute inset-y-0 left-0 rounded-full ${perClass > limit ? 'bg-rose-500' : 'bg-indigo-500'}`} style={{ width: `${Math.min(perClass / limit, 1) * 100}%` }} />
                                    </span>
                                    <span className={`w-16 text-right font-black ${perClass > limit ? 'text-rose-600' : 'text-slate-700'}`}>{perClass}/{limit}명</span>
                                </li>
                            ))}
                            <li className="text-[10px] text-slate-400 text-right">반당 아이 수 / 법정 기준</li>
                        </ul>
                    );
                },
            });
            break;
        }
        case 'stability': {
            const scores = data.map(assessStability);
            const best = bestIndexes(scores);
            rows.push({ key: 'stability-score', label: '판정', render: (_, i) => <AssessmentCell id="stability" assessment={scores[i]} best={best.includes(i)} /> });
            rows.push({
                key: 'stability-tenure', label: '근속 분포',
                render: (item) => {
                    const t = item.teacherTenure;
                    if (!t || t.under1 + t.year1to2 + t.year2to4 + t.year4to6 + t.over6 === 0) return <Empty />;
                    const parts = [
                        { label: '1년 미만', value: t.under1, className: 'bg-emerald-200' },
                        { label: '1~4년', value: t.year1to2 + t.year2to4, className: 'bg-emerald-400' },
                        { label: '4년 이상', value: t.year4to6 + t.over6, className: 'bg-emerald-600' },
                    ];
                    return (
                        <div className="max-w-[200px] mx-auto">
                            <div className="flex h-2.5 rounded-full overflow-hidden bg-slate-100" aria-hidden="true">
                                {parts.map(p => <span key={p.label} className={p.className} style={{ width: `${p.value}%` }} />)}
                            </div>
                            <ul className="mt-1.5 flex justify-between text-[10px] font-bold text-slate-500">
                                {parts.map(p => (
                                    <li key={p.label} className="flex items-center gap-1">
                                        <span className={`w-2 h-2 rounded-full ${p.className}`} aria-hidden="true" />{p.label} {p.value}%
                                    </li>
                                ))}
                            </ul>
                        </div>
                    );
                },
            });
            rows.push(checklistRow);
            break;
        }
        case 'record':
            rows.push({
                key: 'record-link', label: '공식 포털',
                render: (item) => {
                    const link = portalLink(item);
                    if (!link) return <Empty />;
                    return (
                        <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={link.popup ? (e) => {
                                e.preventDefault();
                                window.open(link.url, '어린이집찾기', 'scrollbars=yes,width=1024,height=778');
                            } : undefined}
                            aria-label={`${item.name} ${link.label}에서 평가·위반 이력 보기 (새 창)`}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-violet-200 bg-white text-violet-700 text-xs font-black hover:bg-violet-600 hover:text-white transition-colors"
                        >
                            {link.label}에서 보기 <ExternalLink className="w-3 h-3" aria-hidden="true" />
                        </a>
                    );
                },
            });
            rows.push(checklistRow);
            break;
        case 'safety': {
            const scores = data.map(assessSafety);
            const best = bestIndexes(scores);
            rows.push({ key: 'safety-score', label: '판정', render: (_, i) => <AssessmentCell id="safety" assessment={scores[i]} best={best.includes(i)} /> });
            rows.push({
                key: 'safety-items', label: '공시 항목',
                render: (item) => (
                    <ul className="flex flex-wrap justify-center gap-1.5">
                        {safetyChecks(item).map(c => (
                            <li key={c.label} className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-black ${c.ok === true ? 'bg-amber-50 text-amber-800 border-amber-200' : c.ok === false ? 'bg-white text-slate-400 border-slate-200 line-through' : 'bg-white text-slate-400 border-dashed border-slate-200'}`}>
                                {c.ok === true ? <Check className="w-3 h-3" aria-hidden="true" /> : <Minus className="w-3 h-3" aria-hidden="true" />}
                                {c.label}{c.ok === null ? ' (해당 없음)' : c.ok === false ? ' (공시 없음)' : ''}
                            </li>
                        ))}
                        {item.cctvCount ? <li className="w-full text-[11px] font-bold text-slate-400">CCTV {item.cctvCount}대</li> : null}
                    </ul>
                ),
            });
            rows.push(checklistRow);
            break;
        }
        case 'life':
            rows.push({ key: 'life-hours', label: '운영 시간', render: (item) => <span className="text-sm font-black text-slate-800">{lifeFacts(item).hours ?? '-'}</span> });
            rows.push({
                key: 'life-extra', label: '연장·통학',
                render: (item) => {
                    const facts = lifeFacts(item);
                    if (facts.extended.length === 0 && !facts.bus) return <span className="text-xs font-bold text-slate-400">공시 없음</span>;
                    return (
                        <div className="flex flex-wrap justify-center gap-1.5">
                            {facts.extended.map(label => <span key={label} className="px-2 py-1 rounded-lg border bg-cyan-50 text-cyan-800 border-cyan-200 text-[11px] font-black">{label}</span>)}
                            {facts.bus && <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border bg-cyan-50 text-cyan-800 border-cyan-200 text-[11px] font-black"><Bus className="w-3 h-3" aria-hidden="true" />통학차량</span>}
                        </div>
                    );
                },
            });
            rows.push({
                key: 'life-availability', label: '입소 가능성',
                render: (item) => {
                    const { availability } = lifeFacts(item);
                    return (
                        <div>
                            <span className={`text-sm font-black ${availability.tone === 'open' ? 'text-cyan-800' : 'text-amber-700'}`}>{availability.label}</span>
                            <div className="text-[11px] font-bold text-slate-400 mt-0.5">현원 {item.currentPupils} / 정원 {item.capacity}</div>
                        </div>
                    );
                },
            });
            rows.push({ key: 'life-cost', label: '비용', render: (item) => <span className="text-xs font-bold text-slate-700 break-keep">{lifeFacts(item).cost ?? '-'}</span> });
            rows.push(checklistRow);
            break;
        default:
            rows.push(checklistRow);
    }
    return rows;
}

const BASIC_ROWS: Row[] = [
    { key: 'address', label: '위치', render: (item) => <span className="text-xs font-bold text-slate-700 break-keep line-clamp-2">{item.address}</span> },
    { key: 'ageRange', label: '대상 연령', render: (item) => item.ageRange && item.ageRange !== '-' ? <span className="inline-flex items-center gap-1 text-sm font-bold text-slate-700"><Baby className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />{item.ageRange}</span> : <Empty /> },
    { key: 'phone', label: '연락처', render: (item) => item.phone ? <a href={`tel:${item.phone}`} className="inline-flex items-center gap-1 text-sm font-bold text-slate-700 hover:text-indigo-600"><Phone className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />{item.phone}</a> : <Empty /> },
];

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
                    관심 있는 유치원이나 어린이집을 담아 공시 항목을 한눈에 비교하세요.
                </p>
            </div>
        );
    }

    const renderRows = (rows: Row[]) => rows.map(row => (
        <tr key={row.key} className="group">
            <th scope="row" className={`sticky left-0 z-20 bg-white group-hover:bg-slate-50 px-3 sm:px-5 py-4 text-left border-b border-r border-slate-100 ${LABEL_COL}`}>
                <span className="text-xs font-bold text-slate-500 break-keep">{row.label}</span>
            </th>
            {data.map((item, index) => (
                <td key={`${item.id}-${row.key}`} className={`px-3 sm:px-5 py-4 border-b border-slate-100 text-center align-middle group-hover:bg-slate-50/50 ${DATA_COL}`}>
                    {row.render(item, index)}
                </td>
            ))}
        </tr>
    ));

    return (
        <div className="bg-white rounded-[2rem] sm:rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] overflow-hidden border border-slate-100 w-full max-w-full">
            <div className="overflow-x-auto custom-scrollbar" role="region" aria-label="기관 비교표 (가로 스크롤 가능)" tabIndex={0}>
                <table className="min-w-full border-separate border-spacing-0 table-fixed">
                    <caption className="sr-only">고르는 기준 7가지로 정리한 기관 비교표</caption>
                    <thead>
                        <tr>
                            <th scope="col" className={`sticky left-0 z-30 bg-slate-50 border-b border-r border-slate-100 px-3 sm:px-5 py-6 align-bottom text-left ${LABEL_COL}`}>
                                <span className="text-xs font-black text-indigo-600 tracking-widest">7가지 기준</span>
                                <span className="block text-base sm:text-lg font-black text-slate-900 font-heading">비교표</span>
                            </th>
                            {data.map((item) => (
                                <th key={item.id} scope="col" className={`relative px-4 pt-8 pb-6 border-b border-slate-100 bg-white text-center ${DATA_COL}`}>
                                    <button
                                        onClick={() => removeCompareId(institutionKey(item))}
                                        aria-label={`${item.name} 비교에서 제거`}
                                        className="absolute top-3 right-3 p-2 rounded-xl text-slate-300 hover:bg-rose-50 hover:text-rose-500 transition-colors"
                                    >
                                        <X className="w-4 h-4" aria-hidden="true" />
                                    </button>
                                    <div className="flex justify-center gap-1.5 mb-3">
                                        <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-slate-100 text-slate-600">{item.type}</span>
                                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-black ${item.source === '어린이집' ? 'bg-orange-50 text-orange-600' : 'bg-sky-50 text-sky-600'}`}>{item.source}</span>
                                    </div>
                                    <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight break-keep font-heading">{item.name}</h3>
                                    <div className="mt-2 flex justify-center gap-1 items-center text-[11px] font-bold text-slate-400">
                                        <MapPin className="w-3 h-3" aria-hidden="true" />
                                        {item.address.split(' ').slice(1, 3).join(' ')}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <th scope="rowgroup" colSpan={data.length + 1} className="bg-slate-50 border-b border-slate-100 p-0 text-left">
                                <div className="sticky left-0 w-fit px-3 sm:px-5 py-3 text-xs font-black text-slate-400 tracking-widest">기본 정보</div>
                            </th>
                        </tr>
                        {renderRows(BASIC_ROWS)}
                        {CRITERIA.map(criterion => {
                            const theme = CRITERION_THEME[criterion.id];
                            return (
                                <React.Fragment key={criterion.id}>
                                    <tr>
                                        <th scope="rowgroup" colSpan={data.length + 1} className={`border-y p-0 text-left ${theme.soft}`}>
                                            <div className="sticky left-0 w-fit max-w-[100vw] flex items-center gap-3 px-3 sm:px-5 py-3">
                                                <CriterionIcon id={criterion.id} />
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="text-sm sm:text-base font-black text-slate-900 font-heading">{criterion.title}</span>
                                                        <MethodBadge method={criterion.method} />
                                                    </div>
                                                    <p className="text-xs font-medium text-slate-500 break-keep">{criterion.question}</p>
                                                </div>
                                            </div>
                                        </th>
                                    </tr>
                                    {renderRows(criterionRows(criterion, data))}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="px-5 sm:px-8 py-5 bg-slate-50 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <ul className="flex flex-wrap gap-3" aria-label="확인 방법 범례">
                    {(['data', 'portal', 'visit'] as const).map(m => <li key={m}><MethodBadge method={m} /></li>)}
                </ul>
                <p className="text-xs font-bold text-slate-400 break-keep">
                    판정은 유치원 알리미·어린이집 정보공개포털 공시 데이터로 계산합니다. 체크 내용은 이 브라우저에만 저장됩니다.
                </p>
            </div>
        </div>
    );
}
