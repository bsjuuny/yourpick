import type { Institution } from '../types/institution';

const collator = new Intl.Collator('ko');

/** No distance origin is collected; alphabetical order is explicit and deterministic. */
export function compareInstitutions(a: Institution, b: Institution, sortBy: 'name' | 'capacity'): number {
    if (sortBy === 'capacity') {
        const difference = (b.capacity || 0) - (a.capacity || 0);
        if (difference) return difference;
    }
    return collator.compare(a.name, b.name)
        || collator.compare(a.source, b.source)
        || collator.compare(a.id, b.id);
}
