import { describe, expect, it } from 'vitest';
import { lessonText } from '../../domain/lesson';
import { primerText } from '../../domain/primer';
import { shownTopics } from '../../primer/match';
import { shippedLessons } from '../lessons';
import { describeBankTargets, describeShippedBank } from '../shippedChecks';
import { cysaItems } from './items';
import { cysaMeta } from './meta';

const lessons = shippedLessons.filter((l) => l.exam === cysaMeta.code);

// Checks on the shipped CS0-004 bank, including the locked content targets.
// The command primer topics shown for this bank must pass its acronym list too, and so must the lessons.
describeShippedBank(cysaMeta, cysaItems, { extraText: [...lessons.map(lessonText), ...shownTopics(cysaItems).map(primerText)] });
describeBankTargets(cysaMeta, cysaItems);

describe('shipped CS0-004 lessons', () => {
  const byId = new Map(cysaItems.map((q) => [q.id, q]));
  const domainOf = (obj: string) => cysaMeta.objectives.find((o) => o.id === obj)?.domainId;

  it('are grouped by the domain of their first objective, and name real objectives', () => {
    const bad = lessons.flatMap((l) => [
      ...(l.objectiveIds.some((o) => !domainOf(o)) ? [`${l.id}: unknown objective`] : []),
      ...(domainOf(l.objectiveIds[0]) !== l.area ? [`${l.id}: area ${l.area}`] : []),
    ]);
    expect(bad).toEqual([]);
  });

  it('check with approved multiple-choice questions from the lesson objectives', () => {
    const bad = lessons.flatMap((l) =>
      l.checkIds
        .filter((id) => {
          const q = byId.get(id);
          return !q || q.status !== 'approved' || !q.type.startsWith('mcq') || !q.objectiveIds.some((o) => l.objectiveIds.includes(o));
        })
        .map((id) => `${l.id}: ${id}`),
    );
    expect(bad).toEqual([]);
  });

  it('use a rule, not a formula, and have unique ids that start with their domain', () => {
    expect(lessons.filter((l) => l.formula).map((l) => l.id)).toEqual([]);
    const ids = lessons.map((l) => l.id);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
    expect(lessons.filter((l) => !l.id.startsWith(`cs${l.area}-`)).map((l) => l.id)).toEqual([]);
  });
});
