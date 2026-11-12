import type { QuestionType } from '../domain/types';

// Where each exam's shipped bank lives (src/banks/<dir>/items/) and how its item ids start.
// Plain data with no import.meta.glob, so Node tools and the Vite config can import it.
export const BANKS: Record<string, { dir: string; idPrefix: string }> = {
  'DA0-002': { dir: 'dataplus', idPrefix: 'da2' },
  'CY0-001': { dir: 'secai', idPrefix: 'cy1' },
  'AT0-001': { dir: 'autoops', idPrefix: 'at1' },
  'CS0-004': { dir: 'cysa', idPrefix: 'cs4' },
};

export function bankFor(code: string): { dir: string; idPrefix: string } {
  const bank = BANKS[code];
  if (!bank) throw new Error(`unknown exam "${code}"`);
  return bank;
}

/** The short type name used in ids: mcq, num, or the PBQ template without its "pbq-" prefix. */
export function typeShort(type: QuestionType): string {
  if (type.startsWith('mcq')) return 'mcq';
  if (type === 'numeric') return 'num';
  return type.slice(4);
}

/** For example itemIdPrefix('CY0-001', '2.6', 'mcq-multi') === 'cy1-2-6-mcq-'. */
export function itemIdPrefix(code: string, objectiveId: string, type: QuestionType): string {
  return `${bankFor(code).idPrefix}-${objectiveId.replace('.', '-')}-${typeShort(type)}-`;
}
