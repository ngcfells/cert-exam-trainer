import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { AssembledExam } from '../../exam/assemble';
import { buildResult } from '../../exam/result';
import { scoreExam } from '../../exam/scoring';
import { mcq, meta3 } from '../../exam/testFixtures';
import { usePanels } from '../panels/PanelProvider';
import { WithPanels } from '../panels/testPanels';
import { ExamRunner } from './ExamRunner';
import { ResultsScreen } from './ResultsScreen';

vi.mock('../../report/config', () => ({ reportConfig: () => ({ url: 'https://relay.test', siteKey: '0xKEY' }) }));

const exam: AssembledExam = {
  exam: 'T-001',
  seed: 1,
  items: [{ question: mcq('B0', 'B') }, { question: mcq('A0', 'A') }, { question: mcq('C0', 'C') }],
  mcqCount: 3,
  pbqWeightSum: 0,
};

function ContextProbe() {
  const { reportContext } = usePanels();
  return <span data-testid="report-context">{JSON.stringify(reportContext)}</span>;
}

/** B0 and C0 are missed; A0 is right. */
function show(flagged: string[], mode?: 'mock' | 'practice') {
  const responses = { B0: ['b'], A0: ['a'], C0: ['b'] };
  const report = scoreExam(exam, responses, meta3);
  const result = buildResult({ exam, responses, flagged, report, startedAt: new Date(0), finishedAt: new Date(1), autoSubmitted: false });
  render(
    <WithPanels>
      <ResultsScreen meta={meta3} exam={exam} result={result} report={report} saveError={null} mode={mode} />
      <ContextProbe />
    </WithPanels>,
  );
}

describe('ResultsScreen report buttons', () => {
  it('puts a report button on each reviewed item', async () => {
    const user = userEvent.setup();
    show([], 'practice');
    const review = screen.getByRole('heading', { name: 'Review' }).nextElementSibling as HTMLElement;
    const buttons = within(review).getAllByRole('button', { name: /^Report a problem with question/ });
    expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual(['Report a problem with question 1', 'Report a problem with question 3']);
    await user.click(buttons[1]);
    expect(JSON.parse(screen.getByTestId('report-context').textContent!)).toEqual({ questionId: 'C0', exam: meta3.code, mode: 'results' });
  });

  it('lists flagged questions after a mock', async () => {
    const user = userEvent.setup();
    show(['A0', 'C0']);
    const section = screen.getByRole('region', { name: 'Questions you flagged' });
    expect(within(section).getByText('You flagged 2 questions for your review. Is anything wrong with them?')).toBeInTheDocument();
    const rows = within(section).getAllByRole('listitem');
    expect(rows.map((r) => r.textContent)).toEqual(['Question 2 Report a problem', 'Question 3 Report a problem']);
    await user.click(within(rows[0]).getByRole('button', { name: 'Report a problem with question 2' }));
    expect(JSON.parse(screen.getByTestId('report-context').textContent!)).toEqual({ questionId: 'A0', exam: meta3.code, mode: 'results' });
  });

  it('says question, not questions, for one flag', () => {
    show(['A0']);
    expect(screen.getByText('You flagged 1 question for your review. Is anything wrong with it?')).toBeInTheDocument();
  });

  it('no flagged section in practice', () => {
    show(['A0'], 'practice');
    expect(screen.queryByRole('region', { name: 'Questions you flagged' })).toBeNull();
  });

  it('no flagged section when nothing was flagged', () => {
    show([]);
    expect(screen.queryByRole('region', { name: 'Questions you flagged' })).toBeNull();
  });
});

describe('ExamRunner', () => {
  it('shows no report button', async () => {
    render(
      <WithPanels>
        <ExamRunner exam={exam} timeLimitMs={600_000} startedAt={new Date()} onSubmit={() => {}} />
      </WithPanels>,
    );
    await act(async () => {});
    expect(screen.queryByRole('button', { name: /Report/ })).toBeNull();
  });
});
