import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { ResultsScreen } from './ResultsScreen';
import type { AssembledExam } from '../../exam/assemble';
import { buildResult } from '../../exam/result';
import { scoreExam } from '../../exam/scoring';
import { meta3, pbq } from '../../exam/testFixtures';
import { pbqFixture } from '../../domain/pbqFixtures';
import type { PartMap } from '../../domain/pbq';
import type { Question } from '../../domain/types';

describe('ResultsScreen', () => {
  it('reviews each PBQ part', () => {
    const q = { ...pbq('P1', 2), partExplanations: { p2: 'Prompt 2 goes with c2.' } };
    const exam: AssembledExam = { exam: 'T-001', seed: 1, items: [{ question: q }], mcqCount: 0, pbqWeightSum: 2 };
    const responses = { P1: { p1: 'c1', p2: 'c3' } };
    const report = scoreExam(exam, responses, meta3);
    const result = buildResult({ exam, responses, flagged: [], report, startedAt: new Date(0), finishedAt: new Date(1), autoSubmitted: false });
    render(<ResultsScreen meta={meta3} exam={exam} result={result} report={report} saveError={null} onHome={() => {}} />);

    const table = screen.getByRole('table', { name: 'Parts' });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows[0]).toHaveTextContent('Prompt 1Choice c1Choice c1Correct');
    expect(rows[1]).toHaveTextContent('Prompt 2Choice c3Choice c2Incorrect');
    expect(screen.getByText('Prompt 2 goes with c2.')).toBeInTheDocument();
  });

  function partRows(q: Question, given: PartMap) {
    const exam: AssembledExam = { exam: 'T-001', seed: 1, items: [{ question: q }], mcqCount: 0, pbqWeightSum: 3 };
    const responses = { [q.id]: given };
    const report = scoreExam(exam, responses, meta3);
    const result = buildResult({ exam, responses, flagged: [], report, startedAt: new Date(0), finishedAt: new Date(1), autoSubmitted: false });
    render(<ResultsScreen meta={meta3} exam={exam} result={result} report={report} saveError={null} onHome={() => {}} />);
    return within(screen.getByRole('table', { name: 'Parts' })).getAllByRole('row').slice(1);
  }

  it('reviews terminal and hotspot parts by their own rules', () => {
    const rows = partRows(pbqFixture('terminal'), { t1: 'grep ERROR app.log' });
    expect(rows[0]).toHaveTextContent('Find errorsgrep ERROR app.loggrep ERROR *Correct');
    expect(rows[1]).toHaveTextContent('Next actionNot answeredT-a2Incorrect');
  });

  it('shows untouched hotspot spots as not selected', () => {
    const rows = partRows(pbqFixture('hotspot'), { s1: 'on' });
    expect(rows[0]).toHaveTextContent('Web serverSelectedSelectedCorrect');
    expect(rows[1]).toHaveTextContent('CacheNot selectedNot selectedCorrect');
    expect(rows[2]).toHaveTextContent('DatabaseNot selectedSelectedIncorrect');
  });
});
