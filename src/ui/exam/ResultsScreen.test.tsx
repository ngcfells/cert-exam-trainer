import { afterEach, describe, it, expect, vi } from 'vitest';
import { applyMarks, DEFAULT_MARKS } from '../marks/prefs';
import { fakeAudio } from '../marks/fakeAudio';
import { resetSoundForTests } from '../marks/sound';
import userEvent from '@testing-library/user-event';
import { cleanup, render, screen, within } from '@testing-library/react';
import { dataPlusQuestions } from '../../banks/dataplus/questions';
import { ResultsScreen } from './ResultsScreen';
import type { AssembledExam } from '../../exam/assemble';
import { buildResult } from '../../exam/result';
import { scoreExam } from '../../exam/scoring';
import { mcq, meta3, pbq } from '../../exam/testFixtures';
import { pbqFixture } from '../../domain/pbqFixtures';
import type { PartMap } from '../../domain/pbq';
import type { Question } from '../../domain/types';

vi.mock('../../primer/topics', async () => (await import('../../primer/testTopics')).mockTopicsModule());

describe('ResultsScreen', () => {
  it('reviews each PBQ part', () => {
    const q = { ...pbq('P1', 2), partExplanations: { p2: 'Prompt 2 goes with c2.' } };
    const exam: AssembledExam = { exam: 'T-001', seed: 1, items: [{ question: q }], mcqCount: 0, pbqWeightSum: 2 };
    const responses = { P1: { p1: 'c1', p2: 'c3' } };
    const report = scoreExam(exam, responses, meta3);
    const result = buildResult({ exam, responses, flagged: [], report, startedAt: new Date(0), finishedAt: new Date(1), autoSubmitted: false });
    render(<ResultsScreen meta={meta3} exam={exam} result={result} report={report} saveError={null} />);

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
    render(<ResultsScreen meta={meta3} exam={exam} result={result} report={report} saveError={null} />);
    return within(screen.getByRole('table', { name: 'Parts' })).getAllByRole('row').slice(1);
  }

  it('reviews terminal and hotspot parts by their own rules', () => {
    const rows = partRows(pbqFixture('terminal'), { t1: 'grep ERROR app.log' });
    expect(rows[0]).toHaveTextContent('Find errorsgrep ERROR app.loggrep ERROR <any word>, or grep -i error <any word>Correct');
    // The bundled question checks real option text, not fixture placeholders.
    cleanup();
    const real = dataPlusQuestions.find((x) => x.id === 'da2-pbq-terminal-001')!;
    const realRows = partRows(real, { fix: 'rerun' });
    expect(realRows[1]).toHaveTextContent(
      'Choose the best next actionRerun the load unchangedRoute invalid rows to a reject table, then reload the valid rowsIncorrect',
    );
  });

  function missedOne(props: Partial<Parameters<typeof ResultsScreen>[0]> = {}) {
    const exam: AssembledExam = { exam: 'T-001', seed: 1, items: [{ question: mcq('B0', 'B') }, { question: mcq('A0', 'A') }], mcqCount: 2, pbqWeightSum: 0 };
    const responses = { B0: ['b'], A0: ['a'] };
    const report = scoreExam(exam, responses, meta3);
    const result = buildResult({ exam, responses, flagged: [], report, startedAt: new Date(0), finishedAt: new Date(1), autoSubmitted: false });
    render(<ResultsScreen meta={meta3} exam={exam} result={result} report={report} saveError={null} {...props} />);
  }

  it('practice mode shows a percent and no pass or fail', () => {
    missedOne({ mode: 'practice' });
    expect(screen.getByRole('heading', { name: 'Practice complete: 50% correct' })).toBeInTheDocument();
    expect(screen.queryByText('FAIL')).not.toBeInTheDocument();
    expect(screen.queryByText(/passing score/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/scaled score/i)).not.toBeInTheDocument();
  });

  it('Drill these calls onDrill with the weakest objective ids', async () => {
    const onDrill = vi.fn();
    missedOne({ onDrill });
    await userEvent.setup().click(screen.getByRole('button', { name: 'Drill these' }));
    expect(onDrill).toHaveBeenCalledWith(['B.1']);
  });

  it.each(['mock', 'practice'] as const)('a missed command question has Command help in %s results', (mode) => {
    const q = { ...mcq('C0', 'A'), stem: 'Run `grep ERROR app.log`.' };
    const exam: AssembledExam = { exam: 'T-001', seed: 1, items: [{ question: q }, { question: mcq('A0', 'A') }], mcqCount: 2, pbqWeightSum: 0 };
    const responses = { C0: ['b'], A0: ['b'] };
    const report = scoreExam(exam, responses, meta3);
    const result = buildResult({ exam, responses, flagged: [], report, startedAt: new Date(0), finishedAt: new Date(1), autoSubmitted: false });
    render(<ResultsScreen meta={meta3} exam={exam} result={result} report={report} saveError={null} mode={mode} />);
    const items = within(screen.getByRole('heading', { name: 'Review' }).nextElementSibling as HTMLElement).getAllByRole('listitem');
    expect(within(items[0]).getByRole('button', { name: 'Command help' })).toBeInTheDocument();
    expect(within(items[1]).queryByRole('button', { name: 'Command help' })).not.toBeInTheDocument();
  });

  it('has no Drill button without onDrill', () => {
    missedOne();
    expect(screen.queryByRole('button', { name: /drill/i })).not.toBeInTheDocument();
  });

  it('shows untouched hotspot spots as not selected', () => {
    const rows = partRows(pbqFixture('hotspot'), { s1: 'on' });
    expect(rows[0]).toHaveTextContent('Web serverSelectedSelectedCorrect');
    expect(rows[1]).toHaveTextContent('CacheNot selectedNot selectedCorrect');
    expect(rows[2]).toHaveTextContent('DatabaseNot selectedSelectedIncorrect');
  });
});

describe('ResultsScreen answer marks', () => {
  afterEach(() => {
    applyMarks(DEFAULT_MARKS);
    vi.unstubAllGlobals();
    resetSoundForTests();
  });

  function review(responses: Record<string, string[] | PartMap>) {
    const exam: AssembledExam = { exam: 'T-001', seed: 1, items: [{ question: pbq('P1', 2) }, { question: mcq('A0', 'A') }], mcqCount: 1, pbqWeightSum: 2 };
    const report = scoreExam(exam, responses, meta3);
    const result = buildResult({ exam, responses, flagged: [], report, startedAt: new Date(0), finishedAt: new Date(1), autoSubmitted: false });
    render(<ResultsScreen meta={meta3} exam={exam} result={result} report={report} saveError={null} mode="practice" />);
    return screen.getAllByRole('listitem').filter((li) => li.querySelector('.mark'));
  }

  it('marks a partly right item and an unanswered one, with no sound', () => {
    const log = fakeAudio();
    applyMarks({ style: 'banner', sound: true });
    const [partly, unanswered] = review({ P1: { p1: 'c1', p2: 'c3' } });
    expect(partly.querySelector('.mark.mark-partly')).not.toBeNull();
    expect(partly.firstElementChild).toHaveClass('mark');
    expect(partly).toHaveTextContent(/^Partly correct/);
    expect(unanswered.querySelector('.mark.mark-wrong')).toHaveTextContent('Incorrect. Not answered');
    expect(log.created).toBe(0);
  });

  it('the Parts table shows a small mark with an icon per part', () => {
    const [partly] = review({ P1: { p1: 'c1', p2: 'c3' } });
    const cells = within(within(partly).getByRole('table', { name: 'Parts' })).getAllByRole('row').slice(1).map((r) => r.lastElementChild!);
    expect(cells.map((c) => c.textContent)).toEqual(['Correct', 'Incorrect']);
    for (const c of cells) {
      expect(c.querySelector('.mark-small')).not.toBeNull();
      expect(c.querySelectorAll('svg[aria-hidden="true"]')).toHaveLength(1);
    }
  });
});

describe('ResultsScreen ended by leaving', () => {
  it('says the exam ended because the user left, not that time ran out', () => {
    const exam: AssembledExam = { exam: 'T-001', seed: 1, items: [{ question: mcq('A0', 'A'), optionOrder: ['a', 'b', 'c', 'd'] }], mcqCount: 1, pbqWeightSum: 0 };
    const report = scoreExam(exam, {}, meta3);
    const result = buildResult({ exam, responses: {}, flagged: [], report, startedAt: new Date(0), finishedAt: new Date(1), autoSubmitted: false, endedBy: 'left' });
    render(<ResultsScreen meta={meta3} exam={exam} result={result} report={report} saveError={null} />);
    expect(screen.getByText('Ended because you left the exam.')).toBeInTheDocument();
    expect(screen.queryByText(/Time ran out/)).not.toBeInTheDocument();
  });
});
