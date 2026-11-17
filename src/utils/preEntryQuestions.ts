import type { Institution } from '../types/institution';
import { childPath, compareHistory, currentSchoolYear, mixedSummary, operationStatus, type ClassHistoryEntry } from './ageClasses';

/**
 * 운영 변경·학부모 소통 (연령반 2단계, 2026-11-17).
 *
 * 유치원알리미·어린이집 정보공개 공시에는 반 통합 안내 방식, 의견 수렴 절차, 반편성 변경 기준,
 * 담임 배정 기준, 운영위원회, 문의·이의제기 절차, 적응 지원 계획이 없다(공개 API 확인).
 * 그래서 모두 '기관 확인 필요'로 두고, 입학 전에 물어볼 질문을 공시 사실과 미확인 항목에서 만든다.
 *
 * 원칙: 실제로 문제가 있었다는 인상을 주는 말(분쟁·갈등·불만·다툼·민원 등)을 쓰지 않는다.
 * 자료가 없다고 감점하지 않는다. 질문은 기관 평가에 쓰지 않는다.
 */

export interface CommunicationItem {
    id: string;
    title: string;
}

export const COMMUNICATION_ITEMS: CommunicationItem[] = [
    { id: 'notice', title: '반 통합 시 사전 안내 방식' },
    { id: 'opinion', title: '학부모 의견 수렴 절차' },
    { id: 'criteria', title: '반편성 변경 기준' },
    { id: 'teacher', title: '통합 이후 담임 배정 기준' },
    { id: 'committee', title: '운영위원회 관련 정보' },
    { id: 'inquiry', title: '학부모 문의 및 이의제기 절차' },
    { id: 'adapt', title: '반 통합 이후 적응 지원 계획' },
];

export const COMMUNICATION_SOURCE_NOTE = '유치원알리미·어린이집 정보공개 공시 항목에 없어 기관 확인 필요';

export type QuestionTopic = '운영 변경' | '반 통합' | '학부모 소통' | '담임 배정' | '적응 지원';

export interface PreEntryQuestion {
    id: string;
    topic: QuestionTopic;
    text: string;
    /** 이 질문을 만든 근거(공시 사실 또는 '공시 항목 없음') */
    why: string;
}

export interface QuestionContext {
    birthYear: number | null;
    entryYear: number | null;
    stayYears: number | null;
    history?: ClassHistoryEntry[];
    now?: Date;
}

export const TOPIC_ORDER: QuestionTopic[] = ['운영 변경', '반 통합', '학부모 소통', '담임 배정', '적응 지원'];

export function preEntryQuestions(item: Institution, ctx: QuestionContext): PreEntryQuestion[] {
    const now = ctx.now ?? new Date();
    const qs: PreEntryQuestion[] = [];
    const add = (q: PreEntryQuestion) => { if (!qs.some(x => x.id === q.id)) qs.push(q); };

    // 운영 변경 — 우리 아이 학년도별
    if (ctx.birthYear !== null) {
        const path = childPath(item, ctx.birthYear, ctx.entryYear ?? currentSchoolYear(now), now, ctx.stayYears);
        for (const y of path.years) {
            const status = operationStatus(y.status, !y.current);
            if (!y.current) {
                add({ id: `plan-${y.schoolYear}`, topic: '운영 변경', text: `${y.schoolYear}학년도에 만 ${y.age}세반을 운영(모집)할 계획인가요?`, why: `현재 공시: ${y.status.label}` });
            }
            if (y.status.kind === 'none') {
                add({ id: `gap-${y.age}`, topic: '운영 변경', text: `만 ${y.age}세반이 없는 해에는 아이가 어느 반에서 지내게 되나요?`, why: `현재 공시: ${status === '운영계획 확인 필요' ? '해당 연령반 미운영 확인' : status}` });
            }
            if (y.status.kind === 'unknown' || y.status.kind === 'mixed-unknown-range') {
                add({ id: `info-${y.age}`, topic: '운영 변경', text: `만 ${y.age}세반은 지금 어떻게 운영되고 있나요?`, why: `공시: ${y.status.label}` });
            }
        }
    } else {
        add({ id: 'plan-general', topic: '운영 변경', text: '다음 학년도 연령별 반 편성 계획을 알려 주실 수 있나요?', why: '다음 학년도 운영계획은 공시 항목에 없음' });
    }

    // 반 연령은 출생연도로 계산한 표준 반편성 기준이다. 1·2월생 상위반, 발달·취학유예에 따른 하위반 등 예외가 있다
    // (2026 보육사업안내). 예외가 필요하면 기관과 정해야 하므로 질문으로 둔다(Codex PR #6 지적 5).
    if (ctx.birthYear !== null) {
        add({ id: 'class-exception', topic: '운영 변경', text: '아이 생일이나 발달에 따라 표준 연령과 다른 반(상위반·하위반)으로 다닐 수 있나요?', why: '반 연령은 출생연도 기준 표준 반편성으로 계산(예외는 기관 확인)' });
    }

    const mixed = mixedSummary(item);
    if (mixed.has) {
        add({ id: 'mixed-criteria', topic: '운영 변경', text: '혼합연령반은 어떤 기준으로 편성하나요?', why: `현재 공시: ${mixed.text}` });
    } else {
        add({ id: 'mixed-plan', topic: '운영 변경', text: '원아 수에 따라 혼합연령반으로 운영할 계획이 있나요?', why: '혼합반 계획은 공시 항목에 없음' });
    }

    const history = compareHistory(item, ctx.history);
    const shrink = history.changes.find(c => c.kind === '줄어듦' || c.kind === '없어짐');
    add({
        id: 'merge-criteria', topic: '반 통합', text: '원아 수가 줄면 반을 합치는 기준이 있나요?',
        why: shrink ? `저장 스냅샷: 만 ${shrink.age}세 학급 축소 확인 (${shrink.steps[0].date} → ${shrink.steps[shrink.steps.length - 1].date})` : '반 통합 기준은 공시 항목에 없음',
    });
    add({ id: 'merge-notice', topic: '반 통합', text: '반을 합치게 되면 학부모에게 언제, 어떤 방법으로 안내하나요?', why: '사전 안내 방식은 공시 항목에 없음' });
    add({ id: 'merge-friends', topic: '반 통합', text: '반이 바뀔 때 아이들의 기존 친구 관계는 어떻게 고려하나요?', why: '반편성 변경 기준은 공시 항목에 없음' });
    if (item.source === '어린이집') {
        add({ id: 'time-merge', topic: '반 통합', text: '이른 아침이나 저녁 시간에는 다른 반과 함께 지내나요(시간대별 통합보육)?', why: '시간대별 통합보육은 공시 항목에 없음' });
    }
    add({ id: 'opinion', topic: '학부모 소통', text: '반 운영이 바뀔 때 학부모 의견은 어떤 절차로 듣고 정하나요?', why: '의견 수렴 절차는 공시 항목에 없음' });
    add({ id: 'committee', topic: '학부모 소통', text: '운영위원회에는 학부모가 어떻게 참여할 수 있나요?', why: '운영위원회 정보는 공시 항목에 없음' });
    add({ id: 'inquiry', topic: '학부모 소통', text: '궁금한 점이나 의견은 누구에게, 어떤 방법으로 전하면 되나요?', why: '문의·이의제기 절차는 공시 항목에 없음' });
    add({ id: 'teacher', topic: '담임 배정', text: '반이 합쳐지면 담임교사는 어떻게 정하나요?', why: '담임 배정 기준은 공시 항목에 없음' });
    add({ id: 'adapt', topic: '적응 지원', text: '반이 바뀌면 아이들의 적응을 어떻게 돕나요?', why: '적응 지원 계획은 공시 항목에 없음' });
    return qs;
}
