import { z } from 'zod';
import { PRIMER_GROUPS, parseTopics, type PrimerTopic } from '../domain/primer';
import links from './links.json';

// One JSON file per group, named after it, each a topic array in display order.
const files = import.meta.glob<unknown[]>('./topics/*.json', { eager: true, import: 'default' });

const groupIndex = (path: string) => PRIMER_GROUPS.indexOf(path.replace(/^.*\/|\.json$/g, '') as (typeof PRIMER_GROUPS)[number]);

for (const f of Object.keys(files)) if (groupIndex(f) < 0) throw new Error(`primer file ${f} is not named after a group`);

export const PRIMER_TOPICS: PrimerTopic[] = parseTopics(
  Object.keys(files)
    .sort((a, b) => groupIndex(a) - groupIndex(b))
    .flatMap((f) => files[f]),
);

const linkSchema = z.array(z.object({ label: z.string().min(1), url: z.string().url().startsWith('https://'), what: z.string().min(1) }).strict());

/** The "Practice safely" links on the primer screen. */
export const PRACTICE_LINKS: PracticeLink[] = linkSchema.parse(links);
export type PracticeLink = z.infer<typeof linkSchema>[number];

const byId = new Map(PRIMER_TOPICS.map((t) => [t.id, t]));

export function topicById(id: string): PrimerTopic | undefined {
  return byId.get(id);
}
