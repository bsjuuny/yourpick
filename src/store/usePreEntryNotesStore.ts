import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

/**
 * 입학 전 확인 질문에 대한 개인 메모 (연령반 2단계).
 * 기관에 직접 물어 들은 답은 공식 확인 자료가 아니므로 이 브라우저에만 저장한다.
 * 다른 이용자에게 보이지 않고, 기관 평가·추천에 쓰지 않는다.
 */
const safeStorage: StateStorage = {
    getItem: (name) => { try { return localStorage.getItem(name); } catch { return null; } },
    setItem: (name, value) => { try { localStorage.setItem(name, value); } catch { /* 저장 불가 환경 */ } },
    removeItem: (name) => { try { localStorage.removeItem(name); } catch { /* 저장 불가 환경 */ } },
};

export const MEMO_MAX_LENGTH = 500;

interface PreEntryNotesStore {
    /** 기관키 → 질문 id → 메모 */
    notes: Record<string, Record<string, string>>;
    setNote: (institutionKey: string, questionId: string, text: string) => void;
    clearInstitution: (institutionKey: string) => void;
}

export const usePreEntryNotesStore = create<PreEntryNotesStore>()(
    persist(
        (set) => ({
            notes: {},
            setNote: (institutionKey, questionId, text) => set((s) => {
                const current = { ...(s.notes[institutionKey] ?? {}) };
                const value = text.slice(0, MEMO_MAX_LENGTH);
                if (value.trim() === '') delete current[questionId];
                else current[questionId] = value;
                return { notes: { ...s.notes, [institutionKey]: current } };
            }),
            clearInstitution: (institutionKey) => set((s) => {
                const next = { ...s.notes };
                delete next[institutionKey];
                return { notes: next };
            }),
        }),
        { name: 'yourpick-pre-entry-notes', version: 1, storage: createJSONStorage(() => safeStorage) },
    ),
);
