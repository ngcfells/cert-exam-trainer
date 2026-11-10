import { describe, expect, it } from 'vitest';
import { PRIMER_GROUPS } from '../domain/primer';
import { PRIMER_TOPICS, topicById } from './topics';

describe('bundled primer topics', () => {
  it('load in group order and can be found by id', () => {
    expect(PRIMER_TOPICS.length).toBeGreaterThan(0);
    const order = PRIMER_TOPICS.map((t) => PRIMER_GROUPS.indexOf(t.group));
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(topicById(PRIMER_TOPICS[0].id)).toBe(PRIMER_TOPICS[0]);
    expect(topicById('no-such-topic')).toBeUndefined();
  });

  it('sit in the file named after their group', () => {
    const files = import.meta.glob<{ group: string }[]>('./topics/*.json', { eager: true, import: 'default' });
    for (const [f, topics] of Object.entries(files)) for (const t of topics) expect(f).toBe(`./topics/${t.group}.json`);
  });
});
