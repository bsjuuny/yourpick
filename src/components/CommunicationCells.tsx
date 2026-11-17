'use client';

import { useId } from 'react';
import { CircleHelp, NotebookPen } from 'lucide-react';
import type { Institution } from '@/types/institution';
import type { ClassHistoryEntry } from '@/utils/ageClasses';
import { COMMUNICATION_ITEMS, COMMUNICATION_SOURCE_NOTE, TOPIC_ORDER, preEntryQuestions, type QuestionContext } from '@/utils/preEntryQuestions';
import { MEMO_MAX_LENGTH, usePreEntryNotesStore } from '@/store/usePreEntryNotesStore';
import { institutionKey } from '@/store/useVisitChecklistStore';

/** 7개 소통 항목. 공시에 없으므로 모두 '기관 확인 필요'(감점 없음). */
export function CommunicationCell() {
    return (
        <div className="text-left space-y-1">
            <ul className="space-y-0.5">
                {COMMUNICATION_ITEMS.map(c => (
                    <li key={c.id} className="flex items-start gap-1.5 text-[11px] font-bold text-slate-600 leading-snug break-keep">
                        <CircleHelp className="w-3.5 h-3.5 mt-px flex-shrink-0 text-amber-600" aria-hidden="true" />
                        <span>{c.title}: <span className="text-amber-700">기관 확인 필요</span></span>
                    </li>
                ))}
            </ul>
            <p className="text-[11px] font-medium text-slate-400 break-keep">{COMMUNICATION_SOURCE_NOTE} · 자료가 없다고 낮게 평가하지 않아요</p>
        </div>
    );
}

/** 입학 전 확인 질문 + 개인 메모(이 브라우저에만 저장). */
export function QuestionsCell({ item, ctx }: { item: Institution; ctx: Omit<QuestionContext, 'history'> & { history?: ClassHistoryEntry[] } }) {
    const key = institutionKey(item);
    const notes = usePreEntryNotesStore(s => s.notes[key]) ?? {};
    const setNote = usePreEntryNotesStore(s => s.setNote);
    const ids = useId();
    const questions = preEntryQuestions(item, ctx);
    const memoCount = questions.filter(q => notes[q.id]).length;
    return (
        <details className="text-left group/q">
            <summary className="cursor-pointer list-none text-[11px] font-black text-indigo-700 hover:text-indigo-900 select-none">
                <span className="inline-flex items-center gap-1">
                    <NotebookPen className="w-3.5 h-3.5" aria-hidden="true" />
                    확인 질문 {questions.length}개{memoCount > 0 ? ` · 메모 ${memoCount}` : ''}
                    <span className="group-open/q:hidden">· 펼치기</span><span className="hidden group-open/q:inline">· 접기</span>
                </span>
            </summary>
            <div className="mt-2 space-y-3">
                {TOPIC_ORDER.map(topic => {
                    const list = questions.filter(q => q.topic === topic);
                    if (list.length === 0) return null;
                    return (
                        <div key={topic}>
                            <p className="text-[11px] font-black text-slate-500 mb-1">{topic}</p>
                            <ol className="space-y-2">
                                {list.map(q => {
                                    const inputId = `${ids}-${q.id}`;
                                    return (
                                        <li key={q.id} className="space-y-1">
                                            <label htmlFor={inputId} className="block text-[11px] font-bold text-slate-700 leading-snug break-keep">{q.text}</label>
                                            <p className="text-[10px] font-medium text-slate-400 break-keep">근거: {q.why}</p>
                                            <textarea
                                                id={inputId}
                                                rows={2}
                                                maxLength={MEMO_MAX_LENGTH}
                                                placeholder="기관에 물어본 답 메모 (나만 보기)"
                                                value={notes[q.id] ?? ''}
                                                onChange={(e) => setNote(key, q.id, e.target.value)}
                                                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] font-medium text-slate-700 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-200"
                                            />
                                        </li>
                                    );
                                })}
                            </ol>
                        </div>
                    );
                })}
                <p className="text-[10px] font-medium text-slate-400 break-keep">메모는 이 브라우저에만 저장되고 다른 사람에게 보이지 않아요. 기관에 들은 답은 공식 확인 자료가 아니라서 평가·추천에 쓰지 않아요.</p>
            </div>
        </details>
    );
}
