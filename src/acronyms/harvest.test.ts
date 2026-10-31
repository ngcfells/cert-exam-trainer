import { describe, expect, it } from 'vitest';
import {
  buildReport, crawlDelay, htmlToText, isAllowed, parseRobots, selectSources, sourcesFileSchema, tallyTokens,
  type HarvestSource,
} from './harvest';

const src = (id: string, kind: HarvestSource['kind']): HarvestSource => ({ id, url: `https://example.com/${id}`, kind });

describe('sources file', () => {
  it('rejects a sources file with a repeated id or a non-http url', () => {
    expect(sourcesFileSchema.safeParse({ exam: 'DA0-002', sources: [src('a', 'study'), src('a', 'dump')] }).success).toBe(false);
    expect(sourcesFileSchema.safeParse({ exam: 'DA0-002', sources: [{ id: 'a', url: 'ftp://x.org/', kind: 'study' }] }).success).toBe(false);
    expect(sourcesFileSchema.safeParse({ exam: 'DA0-002', sources: [src('a', 'study')] }).success).toBe(true);
  });

  it('includes dump sources unless turned off', () => {
    const all = [src('a', 'study'), src('b', 'dump')];
    expect(selectSources(all, false)).toEqual({ use: [all[0]], skipped: [{ id: 'b', reason: 'dump-off' }] });
    expect(selectSources(all, true)).toEqual({ use: all, skipped: [] });
  });
});

describe('robots', () => {
  it('robots: disallow prefix, allow override, empty disallow, wildcard and $', () => {
    const r = parseRobots('User-agent: *\nDisallow: /forum/\nAllow: /forum/public\nDisallow: /*.pdf$\nCrawl-delay: 10\n');
    expect(isAllowed(r, '/forum/x')).toBe(false);
    expect(isAllowed(r, '/forum/public/1')).toBe(true);
    expect(isAllowed(r, '/a.pdf')).toBe(false);
    expect(isAllowed(r, '/a.pdf?x')).toBe(true);
    expect(isAllowed(r, '/other')).toBe(true);
    expect(crawlDelay(r)).toBe(10);
    expect(isAllowed(parseRobots('User-agent: *\nDisallow:\n'), '/x')).toBe(true);
    const specific = parseRobots('User-agent: *\nDisallow: /\n\nUser-agent: cert-exam-trainer\nDisallow: /private\n');
    expect(isAllowed(specific, '/x')).toBe(true);
    expect(isAllowed(specific, '/private/1')).toBe(false);
    expect(crawlDelay(specific)).toBeUndefined();
  });

  it('robots: a group with several user-agent lines, comments, and other bots ignored', () => {
    const r = parseRobots('# hi\nUser-agent: googlebot\nUser-agent: *\nDisallow: /a # note\n\nUser-agent: badbot\nDisallow: /\n');
    expect(isAllowed(r, '/a/1')).toBe(false);
    expect(isAllowed(r, '/b')).toBe(true);
  });
});

describe('text and tokens', () => {
  it('htmlToText drops script and style and decodes entities', () => {
    const t = htmlToText('<p>ETL &amp; ELT</p><script>var API=1</script><style>.CSS{}</style>&#65;&#x42;C&nbsp;x');
    expect(t).toContain('ETL & ELT');
    expect(t).toContain('ABC x');
    expect(t).not.toContain('API');
    expect(t).not.toContain('CSS');
  });

  it('tallyTokens counts acronyms and ignores NOT_ACRONYMS', () => {
    expect(Object.fromEntries(tallyTokens('<p>Use SQL SELECT</p><p>SQL and KPI</p>'))).toEqual({ SQL: 2, KPI: 1 });
  });
});

describe('report', () => {
  it('splits missing from known', () => {
    const report = buildReport({
      exam: 'DA0-002', known: new Set(['SQL']), at: '2026-10-30T00:00:00.000Z', skipped: [], failed: [],
      perSource: [
        { id: 'a', tokens: new Map([['SQL', 2], ['KPI', 1]]) },
        { id: 'b', tokens: new Map([['KPI', 3]]) },
      ],
    });
    expect(report.missing).toEqual([{ term: 'KPI', count: 4, sources: ['a', 'b'] }]);
    expect(report.known).toEqual([{ term: 'SQL', count: 2, sources: ['a'] }]);
    expect(report.format).toBe('cert-exam-trainer-acronym-harvest');
  });

  it('report holds tokens only', () => {
    const tokens = tallyTokens('<p>Which tool loads the warehouse nightly? ETL or ELT</p>');
    const report = buildReport({ exam: 'DA0-002', known: new Set(), at: 'x', skipped: [], failed: [], perSource: [{ id: 'p', tokens }] });
    const json = JSON.stringify(report);
    expect(json).not.toContain('warehouse');
    expect(json).not.toContain('nightly');
    expect(json).toContain('ETL');
  });
});
