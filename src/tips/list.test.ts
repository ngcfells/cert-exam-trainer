import { describe, expect, it } from 'vitest';
import { EXAM_METAS } from '../banks/metas';
import { OWNER_TIP_IDS, TIPS } from './list';
import { fillTip, PLACEHOLDERS } from './picker';

const general = TIPS.filter((t) => t.exam === undefined);

describe('the tip list', () => {
  it('has unique kebab-case ids, the owner tips among them', () => {
    const ids = TIPS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    for (const id of OWNER_TIP_IDS) expect(ids).toContain(id);
  });

  it('has at least 100 general tips, at least 40 in each group', () => {
    expect(general.length).toBeGreaterThanOrEqual(100);
    expect(general.filter((t) => t.group === 'test-room').length).toBeGreaterThanOrEqual(40);
    expect(general.filter((t) => t.group === 'study').length).toBeGreaterThanOrEqual(40);
  });

  it.each(EXAM_METAS.map((m) => m.code))('%s has 5 to 10 tips', (code) => {
    const n = TIPS.filter((t) => t.exam === code).length;
    expect(n).toBeGreaterThanOrEqual(5);
    expect(n).toBeLessThanOrEqual(10);
  });

  it('names only shipped exams', () => {
    const codes = EXAM_METAS.map((m) => m.code);
    for (const t of TIPS) if (t.exam !== undefined) expect(codes).toContain(t.exam);
  });

  it('keeps each text 20 to 280 characters on one line', () => {
    for (const t of TIPS) {
      expect(t.text.length, t.id).toBeGreaterThanOrEqual(20);
      expect(t.text.length, t.id).toBeLessThanOrEqual(280);
      expect(t.text, t.id).not.toMatch(/\n/);
    }
  });

  it('uses only known placeholders, and every shipped exam fills them all', () => {
    for (const t of TIPS) {
      for (const [, name] of t.text.matchAll(/\{(\w*)\}/g)) expect(PLACEHOLDERS as readonly string[], t.id).toContain(name);
      for (const m of EXAM_METAS) expect(fillTip(t.text, m), `${t.id} for ${m.code}`).not.toMatch(/[{}]/);
    }
  });
});
