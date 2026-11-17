'use client';

import { useId, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, LocateFixed, MapPin, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { useFitConditionsStore } from '@/store/useFitConditionsStore';
import { COMMUTE_LABEL, hasActiveConditions, locationApplies, type CommuteMode, type Importance, type Need } from '@/utils/fitConditions';

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
type DongEntry = [name: string, lat: number, lng: number];

const NEED_OPTIONS: { value: Need; label: string }[] = [
    { value: 'off', label: '안 따짐' },
    { value: 'preferred', label: '있으면 좋음' },
    { value: 'required', label: '꼭 필요' },
];

const IMPORTANCE_OPTIONS: { value: Importance; label: string }[] = [
    { value: 0, label: '상관없음' },
    { value: 1, label: '보통' },
    { value: 2, label: '중요' },
];

const fieldClass = 'w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-200';
const labelClass = 'block text-xs font-black text-slate-600 mb-1.5';

function Segmented<T extends string | number>({ label, value, options, onChange }: {
    label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void;
}) {
    return (
        <div role="group" aria-label={label} className="flex items-center bg-slate-50 p-1 rounded-xl border border-slate-100">
            {options.map(o => (
                <button
                    key={String(o.value)}
                    type="button"
                    onClick={() => onChange(o.value)}
                    aria-pressed={value === o.value}
                    className={`flex-1 min-h-9 px-2 py-1.5 text-xs font-black rounded-lg transition-all break-keep ${value === o.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}

export default function FitConditionsPanel({ sggCode }: { sggCode: string }) {
    const { conditions: c, location, setConditions, setImportance, setLocation, reset } = useFitConditionsStore();
    const [open, setOpen] = useState(false);
    const [geoMessage, setGeoMessage] = useState<string | null>(null);
    const ids = useId();
    const locationHere = locationApplies(location, sggCode);
    const active = hasActiveConditions(c, locationHere ? location : null);

    const { data: dongs } = useQuery<Record<string, DongEntry[]>>({
        queryKey: ['dongs'],
        queryFn: () => fetch(`${BASE_PATH}/data/dongs.json`).then(r => (r.ok ? r.json() : {})).catch(() => ({})),
        enabled: open,
        staleTime: Infinity,
    });
    const dongList = dongs?.[sggCode] ?? [];

    const useDeviceLocation = () => {
        setGeoMessage(null);
        if (!('geolocation' in navigator)) { setGeoMessage('이 브라우저는 현재 위치를 지원하지 않아요.'); return; }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                // 직선거리 참고용이라 약 100m 단위로만 쓴다. 저장하지 않는다.
                setLocation({ kind: 'device', label: '현재 위치', lat: Math.round(pos.coords.latitude * 1000) / 1000, lng: Math.round(pos.coords.longitude * 1000) / 1000 });
            },
            () => setGeoMessage('현재 위치를 가져오지 못했어요. 동을 직접 골라 주세요.'),
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
        );
    };

    return (
        <section aria-labelledby={`${ids}-title`} className="bg-white rounded-[2rem] border border-slate-100 shadow-premium overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                aria-expanded={open}
                aria-controls={`${ids}-body`}
                className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
            >
                <span className="flex items-center gap-2.5">
                    <span className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center" aria-hidden="true">
                        <SlidersHorizontal className="w-4 h-4" />
                    </span>
                    <span>
                        <span id={`${ids}-title`} className="block text-sm font-black text-slate-900">우리 집 조건으로 맞춰 보기</span>
                        <span className="block text-[11px] font-bold text-slate-400">
                            {active ? '조건 적용 중 · 정렬에서 "맞춤 추천순"을 고르세요' : '선택 사항 · 안 정해도 비교는 그대로 쓸 수 있어요'}
                        </span>
                    </span>
                </span>
                <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>

            {open && (
                <div id={`${ids}-body`} className="px-5 pb-5 pt-1 space-y-5 border-t border-slate-50">
                    {/* 위치 */}
                    <div>
                        <label htmlFor={`${ids}-dong`} className={labelClass}>출발 위치 (선택)</label>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <select
                                id={`${ids}-dong`}
                                className={fieldClass}
                                value={location?.kind === 'dong' && locationHere ? location.label : ''}
                                onChange={(e) => {
                                    const d = dongList.find(x => x[0] === e.target.value);
                                    setLocation(d ? { kind: 'dong', label: d[0], lat: d[1], lng: d[2], sggCode } : null);
                                }}
                            >
                                <option value="">{dongList.length ? '행정동 고르기' : '동 목록 불러오는 중…'}</option>
                                {dongList.map(d => <option key={d[0]} value={d[0]}>{d[0]}</option>)}
                            </select>
                            <button type="button" onClick={useDeviceLocation} className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-black text-slate-700 hover:border-indigo-200 hover:text-indigo-600 whitespace-nowrap">
                                <LocateFixed className="w-4 h-4" aria-hidden="true" /> 현재 위치
                            </button>
                        </div>
                        {location && !locationHere && (
                            <p role="status" className="mt-2 flex flex-wrap items-center gap-2 text-xs font-bold text-amber-700">
                                다른 지역에서 고른 &lsquo;{location.label}&rsquo;은 이 지역에서는 쓰지 않아요. 이 지역의 동을 다시 골라 주세요.
                                <button type="button" onClick={() => setLocation(null)} className="underline text-amber-600 hover:text-amber-800">지우기</button>
                            </p>
                        )}
                        {location && locationHere && (
                            <p className="mt-2 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-600">
                                <MapPin className="w-3.5 h-3.5 text-indigo-500" aria-hidden="true" />
                                {location.label} 기준
                                {location.kind === 'device' && <span className="text-slate-400">(이 화면에서만 쓰고 저장하지 않아요)</span>}
                                <button type="button" onClick={() => setLocation(null)} className="underline text-slate-400 hover:text-slate-600">지우기</button>
                            </p>
                        )}
                        {geoMessage && <p role="status" className="mt-2 text-xs font-bold text-amber-700">{geoMessage}</p>}
                        <p className="mt-2 text-[11px] font-medium text-slate-400 leading-snug break-keep">
                            정확한 주소는 받지 않아요. 고른 동의 대표 지점에서 잰 <b className="font-black">직선거리</b>만 참고로 보여 주며, 실제 통학시간이 아니에요.
                        </p>
                    </div>

                    {/* 연령 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor={`${ids}-age`} className={labelClass}>아이 연령</label>
                            <select
                                id={`${ids}-age`}
                                className={fieldClass}
                                value={c.childAge ?? ''}
                                onChange={(e) => setConditions({ childAge: e.target.value === '' ? null : Number(e.target.value) })}
                            >
                                <option value="">정하지 않음</option>
                                {[0, 1, 2, 3, 4, 5].map(age => <option key={age} value={age}>만 {age}세</option>)}
                            </select>
                        </div>
                        <div>
                            <span className={labelClass}>연령 조건</span>
                            <Segmented label="연령 조건 중요도" value={c.ageNeed} options={NEED_OPTIONS} onChange={(v) => setConditions({ ageNeed: v })} />
                        </div>
                    </div>

                    {/* 방과후 */}
                    <div>
                        <span className={labelClass}>방과후과정·연장보육 이용</span>
                        <Segmented label="방과후과정·연장보육" value={c.afterSchool} options={NEED_OPTIONS} onChange={(v) => setConditions({ afterSchool: v })} />
                    </div>

                    {/* 통학 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor={`${ids}-mode`} className={labelClass}>통학 방법</label>
                            <select
                                id={`${ids}-mode`}
                                className={fieldClass}
                                value={c.commuteMode ?? ''}
                                onChange={(e) => setConditions({ commuteMode: e.target.value === '' ? null : e.target.value as CommuteMode })}
                            >
                                <option value="">정하지 않음</option>
                                {(Object.keys(COMMUTE_LABEL) as CommuteMode[]).map(m => <option key={m} value={m}>{COMMUTE_LABEL[m]}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor={`${ids}-minutes`} className={labelClass}>최대 편도 통학시간 (분)</label>
                            <input
                                id={`${ids}-minutes`}
                                type="number" inputMode="numeric" min={5} max={120} step={5}
                                className={`${fieldClass} disabled:opacity-50 disabled:cursor-not-allowed`}
                                placeholder={c.commuteMode ? '예: 20' : '통학 방법을 먼저 고르세요'}
                                disabled={c.commuteMode === null}
                                aria-describedby={`${ids}-minutes-hint`}
                                value={c.maxCommuteMinutes ?? ''}
                                onChange={(e) => setConditions({ maxCommuteMinutes: e.target.value === '' ? null : Math.max(1, Math.min(180, Number(e.target.value))) })}
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <Segmented label="통학 조건 중요도" value={c.commuteNeed} options={NEED_OPTIONS} onChange={(v) => setConditions({ commuteNeed: v })} />
                            <p id={`${ids}-minutes-hint`} className="mt-1.5 text-[11px] font-medium text-slate-400 break-keep">최대 통학시간은 통학 방법을 고른 뒤에 쓸 수 있어요. 통학시간 계산은 아직 지원하지 않아 모든 기관이 &lsquo;확인 필요&rsquo;로 표시돼요. 통학차량은 운영 여부만 공시되고 노선·탑승 가능 여부는 알 수 없어요.</p>
                        </div>
                    </div>

                    {/* 예산 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor={`${ids}-budget`} className={labelClass}>월 예산 (만원)</label>
                            <input
                                id={`${ids}-budget`}
                                type="number" inputMode="numeric" min={0} max={500}
                                className={fieldClass}
                                placeholder="예: 30"
                                value={c.monthlyBudget ?? ''}
                                onChange={(e) => setConditions({ monthlyBudget: e.target.value === '' ? null : Math.max(0, Math.min(1000, Number(e.target.value))) })}
                            />
                        </div>
                        <div>
                            <span className={labelClass}>예산 조건</span>
                            <Segmented label="예산 조건 중요도" value={c.budgetNeed} options={NEED_OPTIONS} onChange={(v) => setConditions({ budgetNeed: v })} />
                        </div>
                        <p className="sm:col-span-2 -mt-2 text-[11px] font-medium text-slate-400 break-keep">기관별 실제 원비는 아직 모으지 않아 &lsquo;확인 필요&rsquo;로 표시돼요.</p>
                    </div>

                    {/* 중요도 */}
                    <div>
                        <span className={labelClass}>무엇을 중요하게 볼까요?</span>
                        <div className="space-y-2">
                            {([
                                ['care', '① 돌봄 여유'],
                                ['stability', '② 교사 안정성'],
                                ['safety', '⑥ 안전·위생'],
                                ['education', '교육과정'],
                            ] as const).map(([key, label]) => (
                                <div key={key} className="grid grid-cols-[6.5rem_1fr] items-center gap-2">
                                    <span className="text-xs font-black text-slate-700 break-keep">{label}</span>
                                    <Segmented label={`${label} 중요도`} value={c.importance[key]} options={IMPORTANCE_OPTIONS} onChange={(v) => setImportance(key, v)} />
                                </div>
                            ))}
                        </div>
                        <p className="mt-1.5 text-[11px] font-medium text-slate-400 break-keep">교육과정은 공시로 비교할 자료가 없어 점수에 넣지 않아요. 정보가 없는 기준은 빼고 계산해서 깎지 않아요.</p>
                    </div>

                    <div className="flex justify-end">
                        <button type="button" onClick={() => { reset(); setGeoMessage(null); }} className="inline-flex items-center gap-1.5 text-xs font-black text-slate-400 hover:text-slate-700">
                            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" /> 조건 모두 지우기
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
}
