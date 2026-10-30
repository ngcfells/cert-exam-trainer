import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { registerExam } from '../../banks';
import { bank, meta3 } from '../../exam/testFixtures';
import type { ExamResult } from '../../exam/result';
import { review } from '../../study/srs';
import { createMemoryRepo } from '../../storage/memoryRepo';
import type { ExamMeta } from '../../domain/types';
import { ProgressScreen } from './ProgressScreen';

const meta: ExamMeta = { ...meta3, acronyms: [{ term: 'ETL', expansion: 'Extract, transform, load', source: 'official' }] };
registerExam(meta, bank({ A: 2, B: 2, C: 1 }));

beforeEach(() => vi.stubEnv('DEV', false));
afterEach(() => vi.unstubAllEnvs());

const result = (id: string, t: string, responses: ExamResult['responses'], extra: Partial<ExamResult> = {}): ExamResult => ({
  id,
  exam: 'T-001',
  seed: 1,
  startedAt: t,
  finishedAt: t,
  autoSubmitted: false,
  questionIds: Object.keys(responses),
  optionOrders: {},
  responses,
  flagged: [],
  score: 450,
  passed: false,
  ...extra,
});

describe('ProgressScreen', () => {
  it('shows Not attempted and No attempts yet with no results', async () => {
    render(<ProgressScreen repo={createMemoryRepo()} examCode="T-001" onExit={() => {}} />);
    expect(await screen.findByText('No attempts yet.')).toBeInTheDocument();
    const domains = screen.getByRole('table', { name: 'Mastery by domain' });
    expect(within(domains).getAllByText('Not attempted')).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Drill weakest objectives' })).toBeDisabled();
    expect(screen.queryByTestId('trend')).not.toBeInTheDocument();
  });

  it('shows mastery, history newest first, a trend line, due counts and drills', async () => {
    const repo = createMemoryRepo();
    await repo.putRecord('results', result('r1', '2026-01-01T00:00:00.000Z', { A0: ['a'], A1: ['b'] }));
    await repo.putRecord('results', result('r2', '2026-01-02T00:00:00.000Z', { B0: ['a'] }, { mode: 'practice', score: 900 }));
    await repo.putRecord('results', result('r3', '2026-01-03T00:00:00.000Z', { B1: ['a'] }, { score: 700, passed: true }));
    const past = new Date('2026-01-01T00:00:00Z');
    await repo.putRecord('srs', review(undefined, { exam: 'T-001', kind: 'question', itemId: 'A1', quality: 1 }, past));
    await repo.putRecord('srs', review(undefined, { exam: 'T-001', kind: 'acronym', itemId: 'ETL', quality: 1 }, past));
    const onDrill = vi.fn();
    render(<ProgressScreen repo={repo} examCode="T-001" onExit={() => {}} onDrill={onDrill} />);

    const objA = await screen.findByRole('table', { name: 'A. Domain A objectives' });
    expect(within(objA).getByRole('row', { name: /A\.1 Objective A1/ })).toHaveTextContent('50%');
    expect(within(objA).getByRole('row', { name: /A\.1 Objective A1/ })).toHaveTextContent('2');

    const rows = within(screen.getByRole('table', { name: 'History' })).getAllByRole('row').slice(1);
    expect(rows.map((r) => r.textContent)).toEqual([
      expect.stringMatching(/Mock exam.*700 \/ 900.*PASS/),
      expect.stringMatching(/Practice.*100%/),
      expect.stringMatching(/Mock exam.*450 \/ 900.*FAIL/),
    ]);
    expect(screen.getByTestId('trend')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText('Review due now: 1 question, 1 acronym')).toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole('button', { name: 'Drill weakest objectives' }));
    expect(onDrill).toHaveBeenCalledWith(['A.1', 'B.1', 'C.1']);
  });
});
