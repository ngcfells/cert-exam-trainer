import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { dataPlusFixtureQuestions } from '../banks/dataplus/fixture';
import { dataPlusMeta } from '../banks/dataplus/meta';
import type { Question } from '../domain/types';
import { applyReviewWrite } from './reviewWrite';

const [a, b] = dataPlusFixtureQuestions;
let root: string;
let items: string;
const read = (f: string) => JSON.parse(readFileSync(path.join(items, f), 'utf8')) as Question[];

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), 'review-'));
  items = path.join(root, 'items');
  mkdirSync(items);
  writeFileSync(path.join(items, '1.1.json'), JSON.stringify([a, { ...b, objectiveIds: ['1.1'] }], null, 2) + '\n');
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

const opts = () => ({ itemsDir: items, rejectLog: path.join(root, 'rejections.jsonl'), meta: dataPlusMeta });

describe('applyReviewWrite', () => {
  it('replaces the item in place, keeping file order and format', () => {
    expect(applyReviewWrite({ question: { ...a, stem: 'New?' } }, opts())).toEqual({ status: 200, body: 'ok' });
    expect(read('1.1.json').map((q) => q.stem)).toEqual(['New?', b.stem]);
    expect(readFileSync(path.join(items, '1.1.json'), 'utf8')).toMatch(/^\[\n {2}\{/);
    expect(readFileSync(path.join(items, '1.1.json'), 'utf8').endsWith(']\n')).toBe(true);
  });

  it('leaves an unchanged item byte-identical (key order kept)', () => {
    const before = readFileSync(path.join(items, '1.1.json'), 'utf8');
    applyReviewWrite({ question: JSON.parse(before)[0] }, opts());
    expect(readFileSync(path.join(items, '1.1.json'), 'utf8')).toBe(before);
  });

  it('moves the item when its first objective changes and drops an emptied file', () => {
    applyReviewWrite({ question: { ...a, objectiveIds: ['5.2'] } }, opts());
    applyReviewWrite({ question: { ...b, objectiveIds: ['5.2'] } }, opts());
    expect(readdirSync(items)).toEqual(['5.2.json']);
    expect(read('5.2.json').map((q) => q.id)).toEqual([a.id, b.id]);
  });

  it('rejects an invalid item with its issues', () => {
    const r = applyReviewWrite({ question: { ...a, stem: '' } }, opts());
    expect(r.status).toBe(400);
    expect(r.body).toMatch(/^stem: /);
  });

  it('rejects an unknown objective and an unknown id', () => {
    expect(applyReviewWrite({ question: { ...a, objectiveIds: ['9.9'] } }, opts())).toEqual({ status: 400, body: 'unknown objective 9.9' });
    expect(applyReviewWrite({ question: { ...a, id: 'nope' } }, opts())).toEqual({ status: 404, body: 'no bank item nope' });
  });

  it('logs a reject note', () => {
    applyReviewWrite({ question: { ...a, status: 'draft' }, note: 'two answers fit' }, opts());
    const line = JSON.parse(readFileSync(opts().rejectLog, 'utf8').trim()) as { id: string; note: string; at: string };
    expect(line).toMatchObject({ id: a.id, note: 'two answers fit' });
    expect(Number.isNaN(Date.parse(line.at))).toBe(false);
  });
});
