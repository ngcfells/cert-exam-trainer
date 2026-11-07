import { parseTopics, type PrimerTopic } from '../domain/primer';

// Test-only topics, so UI tests do not depend on the shipped content.
// Use with: vi.mock('<path>/primer/topics', async () => (await import('<path>/primer/testTopics')).mockTopicsModule());

const base = (id: string, group: string, aliases: string[]) => ({
  id,
  group,
  title: id,
  purpose: `What ${id} is for.`,
  aliases,
  what: [`\`${id}\` does one thing.`],
  forms: [{ bash: `\`${id} -x\``, powershell: 'Same command', does: 'Runs it.' }],
  example: { intro: 'A small run.', lines: [{ line: `${id} -x file`, note: 'Prints the result.' }] },
  trap: { wrong: `Thinking ${id} changes the file.`, why: 'It only prints.' },
  more: [{ heading: `More about ${id}`, paragraphs: ['Extra detail.'], forms: [{ bash: `\`${id} -y\``, powershell: 'No close equivalent. Windows has no such flag.', does: 'Other mode.' }] }],
  links: [{ label: `${id} manual`, url: `https://example.com/${id}` }],
});

export const TEST_TOPICS: PrimerTopic[] = parseTopics([
  base('terminal', 'basics', []),
  base('paths', 'basics', ['cd', 'ls']),
  base('grep', 'text', ['grep', 'Select-String']),
  base('sed', 'text', ['sed']),
  {
    ...base('sql', 'data', ['select']),
    anyCase: true,
    where: 'You type these at a database prompt.',
    forms: [{ bash: '`SELECT * FROM t`', does: 'Reads every row.' }],
    more: [{ heading: 'More about sql', paragraphs: ['Joins.'] }],
  },
]);

export const TEST_LINKS = [{ label: 'Try Linux', url: 'https://example.com/linux', what: 'A whole system in your browser.' }];

export function mockTopicsModule() {
  const byId = new Map(TEST_TOPICS.map((t) => [t.id, t]));
  return { PRIMER_TOPICS: TEST_TOPICS, topicById: (id: string) => byId.get(id), PRACTICE_LINKS: TEST_LINKS };
}
