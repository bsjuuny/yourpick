import { create } from 'zustand';
import { InstitutionType } from '@/types/institution';

interface CompareStore {
    compareIds: string[];
    addCompareId: (id: string) => void;
    removeCompareId: (id: string) => void;
    clearCompareIds: () => void;
}

export const useCompareStore = create<CompareStore>((set) => ({
    compareIds: [],
    addCompareId: (id) =>
        set((state) => {
            if (state.compareIds.length >= 5) {
                alert('비교 항목은 최대 5개까지만 추가할 수 있습니다.');
                return state;
            }
            if (state.compareIds.includes(id)) return state;
            return { compareIds: [...state.compareIds, id] };
        }),
    removeCompareId: (id) =>
        set((state) => ({
            compareIds: state.compareIds.filter((compareId) => compareId !== id),
        })),
    clearCompareIds: () => set({ compareIds: [] }),
}));
