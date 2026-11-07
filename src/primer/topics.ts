import { PRIMER_GROUPS, parseTopics, type PrimerTopic } from '../domain/primer';

// One JSON file per group, named after it, each a topic array in display order.
const files = import.meta.glob<unknown[]>('./topics/*.json', { eager: true, import: 'default' });

const groupIndex = (path: string) => PRIMER_GROUPS.indexOf(path.replace(/^.*\/|\.json$/g, '') as (typeof PRIMER_GROUPS)[number]);

for (const f of Object.keys(files)) if (groupIndex(f) < 0) throw new Error(`primer file ${f} is not named after a group`);

export const PRIMER_TOPICS: PrimerTopic[] = parseTopics(
  Object.keys(files)
    .sort((a, b) => groupIndex(a) - groupIndex(b))
    .flatMap((f) => files[f]),
);

const byId = new Map(PRIMER_TOPICS.map((t) => [t.id, t]));

export function topicById(id: string): PrimerTopic | undefined {
  return byId.get(id);
}
