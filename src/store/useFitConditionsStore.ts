import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { DEFAULT_CONDITIONS, type FitConditions, type FitLocation } from '@/utils/fitConditions';

/**
 * 맞춤 조건은 이 브라우저에만 저장한다(서버로 보내지 않음).
 * 위치는 고른 행정동만 저장하고, 기기 현재 위치는 저장하지 않아 새로고침하면 사라진다.
 */
const safeStorage: StateStorage = {
    getItem: (name) => { try { return localStorage.getItem(name); } catch { return null; } },
    setItem: (name, value) => { try { localStorage.setItem(name, value); } catch { /* 저장 불가 환경 */ } },
    removeItem: (name) => { try { localStorage.removeItem(name); } catch { /* 저장 불가 환경 */ } },
};

interface FitStore {
    conditions: FitConditions;
    location: FitLocation | null;
    setConditions: (patch: Partial<FitConditions>) => void;
    setImportance: (key: keyof FitConditions['importance'], value: FitConditions['importance'][keyof FitConditions['importance']]) => void;
    setLocation: (location: FitLocation | null) => void;
    reset: () => void;
}

export const useFitConditionsStore = create<FitStore>()(
    persist(
        (set) => ({
            conditions: DEFAULT_CONDITIONS,
            location: null,
            setConditions: (patch) => set((s) => ({ conditions: { ...s.conditions, ...patch } })),
            setImportance: (key, value) => set((s) => ({ conditions: { ...s.conditions, importance: { ...s.conditions.importance, [key]: value } } })),
            setLocation: (location) => set({ location }),
            reset: () => set({ conditions: DEFAULT_CONDITIONS, location: null }),
        }),
        {
            name: 'yourpick-fit-conditions',
            version: 1,
            storage: createJSONStorage(() => safeStorage),
            partialize: (s) => ({
                conditions: s.conditions,
                location: s.location?.kind === 'dong' ? s.location : null,
            }),
            merge: (persisted, current) => {
                const p = (persisted ?? {}) as Partial<Pick<FitStore, 'conditions' | 'location'>>;
                return {
                    ...current,
                    conditions: { ...DEFAULT_CONDITIONS, ...p.conditions, importance: { ...DEFAULT_CONDITIONS.importance, ...p.conditions?.importance } },
                    location: p.location?.kind === 'dong' ? p.location : null,
                };
            },
        },
    ),
);
