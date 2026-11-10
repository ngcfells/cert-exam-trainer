import { describe, expect, it } from 'vitest';
import { parseTopics, primerText, topicSchema } from './primer';

const shell = {
  id: 'grep',
  group: 'text',
  title: 'grep',
  purpose: 'Find lines that contain a word.',
  aliases: ['grep', 'Select-String'],
  what: ['`grep` prints the lines that match.'],
  forms: [{ bash: '`grep ERROR app.log`', powershell: '`Select-String ERROR app.log`', does: 'Shows lines with ERROR.' }],
  example: { intro: 'A log file.', lines: [{ line: 'grep -c ERROR app.log', note: 'Counts the lines.' }] },
  trap: { wrong: 'Thinking grep edits the file.', why: 'It only prints.' },
  more: [{ heading: 'Options', paragraphs: ['`-i` ignores case.'], forms: [{ bash: '`grep -i x f`', powershell: 'Same command', does: 'Ignores case.' }] }],
  links: [{ label: 'GNU grep manual', url: 'https://www.gnu.org/software/grep/manual/' }],
};

const single = {
  ...shell,
  id: 'sql',
  group: 'data',
  title: 'SQL',
  aliases: ['select'],
  anyCase: true,
  where: 'You type these at a database prompt, not in a shell.',
  forms: [{ bash: '`SELECT * FROM t`', does: 'Reads every row.' }],
  more: [{ heading: 'Joins', paragraphs: ['`ON` names the match.'] }],
};

const issue = (x: unknown) => {
  const r = topicSchema.safeParse(x);
  return r.success ? null : r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
};

describe('primer topic schema', () => {
  it('accepts a full shell topic', () => expect(issue(shell)).toBeNull());

  it('accepts a single-column topic with where and no powershell', () => expect(issue(single)).toBeNull());

  it('rejects a shell topic row without powershell', () => {
    expect(issue({ ...shell, forms: [{ bash: '`grep x f`', does: 'x' }] })?.[0]).toMatch(/^forms\.0\.powershell: /);
  });

  it('rejects powershell on a topic with where', () => {
    expect(issue({ ...single, forms: [{ bash: '`SELECT 1`', powershell: 'Same command', does: 'x' }] })?.[0]).toMatch(/^forms\.0\.powershell: /);
  });

  it('rejects a powershell cell that is not code, "Same command" or "No close equivalent. <why>"', () => {
    const cell = (powershell: string) => issue({ ...shell, forms: [{ bash: '`chmod 600 f`', powershell, does: 'x' }] });
    expect(cell('icacls')).not.toBeNull();
    expect(cell('No close equivalent.')).not.toBeNull();
    expect(cell('`icacls f /grant x`')).toBeNull();
    expect(cell('Same command')).toBeNull();
    expect(cell('No close equivalent. Windows uses access lists, not mode bits.')).toBeNull();
    const more = issue({ ...shell, more: [{ heading: 'h', paragraphs: ['p'], forms: [{ bash: '`a`', powershell: 'icacls', does: 'x' }] }] });
    expect(more?.[0]).toMatch(/^more\.0\.forms\.0\.powershell: /);
  });

  it('rejects a repeated alias within a topic', () => {
    expect(issue({ ...shell, aliases: ['grep', 'grep'] })?.[0]).toMatch(/^aliases: /);
  });

  it('rejects an http link', () => {
    expect(issue({ ...shell, links: [{ label: 'x', url: 'http://example.com/' }] })?.[0]).toMatch(/^links\.0\.url: /);
  });

  it('parseTopics names the failing topic', () => {
    expect(() => parseTopics([{ id: 'grep' }])).toThrow(/^primer topic grep is invalid: /);
  });

  it('parseTopics rejects a repeated topic id', () => {
    expect(() => parseTopics([shell, shell])).toThrow('primer topic grep is repeated');
  });

  it('primerText includes title, purpose, what, forms, example notes, trap, more and link labels', () => {
    const t = primerText(parseTopics([shell])[0]);
    for (const s of ['grep', 'Find lines', 'prints the lines', '`Select-String ERROR app.log`', 'Shows lines with ERROR.', 'A log file.', 'grep -c ERROR app.log', 'Counts the lines.', 'Thinking grep', 'It only prints.', 'Options', '`-i` ignores case.', 'Ignores case.', 'GNU grep manual']) {
      expect(t).toContain(s);
    }
  });
});
