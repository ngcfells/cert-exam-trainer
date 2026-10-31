import { describe, expect, it } from 'vitest';
import { HARVEST_UA, parseHarvestArgs, runHarvest } from './harvest-lib';
import type { HarvestSource } from '../src/acronyms/harvest';

type Reply = { status?: number; type?: string; body?: string; location?: string } | 'throw';

function fakeFetch(map: Record<string, Reply>) {
  const calls: { url: string; ua: string | null }[] = [];
  const fn = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, ua: new Headers(init?.headers).get('user-agent') });
    const r = map[url];
    if (r === 'throw') throw new TypeError('network down');
    if (!r) return new Response('nope', { status: 404 });
    const headers: Record<string, string> = { 'content-type': r.type ?? 'text/html; charset=utf-8' };
    if (r.location) headers.location = r.location;
    const status = r.status ?? 200;
    return new Response(status >= 300 && status < 400 ? null : r.body ?? '', { status, headers });
  }) as typeof fetch;
  return { fn, calls };
}

function sleeper() {
  const waits: number[] = [];
  return { sleep: async (ms: number) => { waits.push(ms); }, waits };
}

const s = (id: string, url: string): HarvestSource => ({ id, url, kind: 'study' });

describe('runHarvest', () => {
  it('respects robots and records skips', async () => {
    const f = fakeFetch({
      'https://a.test/robots.txt': { body: 'User-agent: *\nDisallow: /private', type: 'text/plain' },
      'https://a.test/ok': { body: '<p>SQL KPI</p>' },
    });
    const out = await runHarvest({ sources: [s('ok', 'https://a.test/ok'), s('no', 'https://a.test/private/x')], fetch: f.fn, sleep: sleeper().sleep });
    expect(out.skipped).toEqual([{ id: 'no', reason: 'robots' }]);
    expect(out.perSource.map((p) => p.id)).toEqual(['ok']);
    expect(Object.fromEntries(out.perSource[0].tokens)).toEqual({ SQL: 1, KPI: 1 });
    expect(f.calls.filter((c) => c.url.endsWith('robots.txt'))).toHaveLength(1);
  });

  it('skips host when robots.txt fails', async () => {
    const f = fakeFetch({
      'https://bad.test/robots.txt': { status: 500 },
      'https://gone.test/p': { body: '<p>ETL</p>' },
      'https://down.test/robots.txt': 'throw',
    });
    const out = await runHarvest({
      sources: [s('b1', 'https://bad.test/p'), s('b2', 'https://bad.test/q'), s('g', 'https://gone.test/p'), s('d', 'https://down.test/p')],
      fetch: f.fn, sleep: sleeper().sleep,
    });
    expect(out.failed).toEqual([
      { id: 'b1', reason: 'robots unavailable' }, { id: 'b2', reason: 'robots unavailable' }, { id: 'd', reason: 'robots unavailable' },
    ]);
    expect(out.perSource.map((p) => p.id)).toEqual(['g']);
    expect(f.calls.some((c) => c.url.startsWith('https://bad.test/p'))).toBe(false);
  });

  it('waits between requests to one origin, honouring crawl-delay', async () => {
    const f = fakeFetch({
      'https://a.test/1': { body: 'x' }, 'https://a.test/2': { body: 'y' },
      'https://slow.test/robots.txt': { body: 'User-agent: *\nCrawl-delay: 10', type: 'text/plain' },
      'https://slow.test/1': { body: 'z' },
    });
    const z = sleeper();
    await runHarvest({ sources: [s('1', 'https://a.test/1'), s('2', 'https://a.test/2'), s('3', 'https://slow.test/1')], fetch: f.fn, sleep: z.sleep });
    // a.test: robots → wait → /1 → wait → /2; slow.test: robots → wait 10s → /1.
    expect(z.waits).toEqual([5000, 5000, 10000]);
  });

  it('records a failed page and continues', async () => {
    const f = fakeFetch({
      'https://a.test/busy': { status: 503 },
      'https://a.test/file': { type: 'application/pdf', body: 'SQL' },
      'https://a.test/err': 'throw',
      'https://a.test/ok': { body: '<p>JSON</p>' },
    });
    const out = await runHarvest({
      sources: [s('busy', 'https://a.test/busy'), s('file', 'https://a.test/file'), s('err', 'https://a.test/err'), s('ok', 'https://a.test/ok')],
      fetch: f.fn, sleep: sleeper().sleep,
    });
    expect(out.failed).toEqual([{ id: 'busy', reason: 'HTTP 503' }, { id: 'file', reason: 'not html' }, { id: 'err', reason: 'TypeError' }]);
    expect(out.perSource.map((p) => p.id)).toEqual(['ok']);
  });

  it('cuts off very large pages', async () => {
    const f = fakeFetch({ 'https://a.test/big': { body: '<p>ETL</p>' + 'x'.repeat(2_100_000) + '<p>ZZQ</p>' } });
    const out = await runHarvest({ sources: [s('big', 'https://a.test/big')], fetch: f.fn, sleep: sleeper().sleep });
    expect(out.perSource[0].tokens.has('ETL')).toBe(true);
    expect(out.perSource[0].tokens.has('ZZQ')).toBe(false);
  });

  it('checks robots.txt on every redirect hop', async () => {
    const f = fakeFetch({
      'https://a.test/go': { status: 301, location: 'https://b.test/private/x' },
      'https://b.test/robots.txt': { body: 'User-agent: *\nDisallow: /private', type: 'text/plain' },
      'https://a.test/ok': { status: 302, location: '/final' },
      'https://a.test/final': { body: '<p>ETL</p>' },
    });
    const out = await runHarvest({ sources: [s('go', 'https://a.test/go'), s('ok', 'https://a.test/ok')], fetch: f.fn, sleep: sleeper().sleep });
    expect(out.skipped).toEqual([{ id: 'go', reason: 'robots' }]);
    expect(out.perSource.map((p) => p.id)).toEqual(['ok']);
    expect(f.calls.some((c) => c.url === 'https://b.test/private/x')).toBe(false);
  });

  it('follows a robots.txt redirect', async () => {
    const f = fakeFetch({
      'https://a.test/robots.txt': { status: 301, location: 'https://www.a.test/robots.txt' },
      'https://www.a.test/robots.txt': { body: 'User-agent: *\nDisallow: /x', type: 'text/plain' },
    });
    const out = await runHarvest({ sources: [s('x', 'https://a.test/x')], fetch: f.fn, sleep: sleeper().sleep });
    expect(out.skipped).toEqual([{ id: 'x', reason: 'robots' }]);
  });

  it('skips a site whose crawl-delay is over the cap', async () => {
    const f = fakeFetch({ 'https://slow.test/robots.txt': { body: 'User-agent: *\nCrawl-delay: 86400', type: 'text/plain' } });
    const z = sleeper();
    const out = await runHarvest({ sources: [s('slow', 'https://slow.test/p')], fetch: f.fn, sleep: z.sleep });
    expect(out.skipped).toEqual([{ id: 'slow', reason: 'crawl-delay' }]);
    expect(z.waits).toEqual([]);
  });

  it('treats robots 401 and 403 as unavailable', async () => {
    const f = fakeFetch({ 'https://a.test/robots.txt': { status: 401 }, 'https://b.test/robots.txt': { status: 403 } });
    const out = await runHarvest({ sources: [s('a', 'https://a.test/p'), s('b', 'https://b.test/p')], fetch: f.fn, sleep: sleeper().sleep });
    expect(out.failed.map((x) => x.reason)).toEqual(['robots unavailable', 'robots unavailable']);
  });

  it('records a timeout as TimeoutError', async () => {
    const fn = (async (input: RequestInfo | URL) => {
      if (String(input).endsWith('robots.txt')) return new Response('', { status: 404 });
      throw new DOMException('timed out', 'TimeoutError');
    }) as typeof fetch;
    const out = await runHarvest({ sources: [s('t', 'https://a.test/t')], fetch: fn, sleep: sleeper().sleep });
    expect(out.failed).toEqual([{ id: 't', reason: 'TimeoutError' }]);
  });

  it('sends the harvester user agent', async () => {
    const f = fakeFetch({ 'https://a.test/ok': { body: '' } });
    await runHarvest({ sources: [s('ok', 'https://a.test/ok')], fetch: f.fn, sleep: sleeper().sleep });
    expect(f.calls.length).toBe(2);
    expect(f.calls.every((c) => c.ua === HARVEST_UA)).toBe(true);
  });
});

describe('parseHarvestArgs', () => {
  it('has defaults, with dumps on', () => {
    expect(parseHarvestArgs(['--sources', 'a.json'])).toEqual({ sources: 'a.json', out: '', includeDumps: true, delayMs: 5000 });
    expect(parseHarvestArgs(['--', '--sources', 'a.json', '--no-dumps', '--out', 'r.json', '--delay-ms', '8000']))
      .toEqual({ sources: 'a.json', out: 'r.json', includeDumps: false, delayMs: 8000 });
  });
  it('rejects bad input', () => {
    expect(() => parseHarvestArgs(['--sources', 'a.json', '--delay-ms', '500'])).toThrow(/2000/);
    expect(() => parseHarvestArgs([])).toThrow(/--sources/);
    expect(() => parseHarvestArgs(['--sources', 'a.json', '--fast'])).toThrow(/--fast/);
    expect(() => parseHarvestArgs(['--sources'])).toThrow(/needs a value/);
  });
});
