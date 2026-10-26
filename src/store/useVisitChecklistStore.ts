import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** 기관별 방문·포털 확인 체크 (`<기관키>` → `<기준id>:<항목id>` 목록). 이 브라우저에만 저장된다. */
interface VisitChecklistStore {
    checks: Record<string, string[]>;
    toggle: (institutionKey: string, itemKey: string) => void;
}

export const useVisitChecklistStore = create<VisitChecklistStore>()(
    persist(
        (set) => ({
            checks: {},
            toggle: (institutionKey, itemKey) =>
                set((state) => {
                    const current = state.checks[institutionKey] ?? [];
                    const next = current.includes(itemKey)
                        ? current.filter(key => key !== itemKey)
                        : [...current, itemKey];
                    return { checks: { ...state.checks, [institutionKey]: next } };
                }),
        }),
        { name: 'yourpick-visit-checklist', version: 1 },
    ),
);

export function institutionKey(item: { sidoCode?: string; sggCode?: string; id: string }): string {
    return `${item.sidoCode || '11'}_${item.sggCode || '11620'}_${item.id}`;
}
