import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExamRunner } from './ExamRunner';
import { LEAVE_RUN, LeaveGuards } from '../nav';
import { LeaveGuardProvider } from '../testNav';
import type { AssembledExam } from '../../exam/assemble';
import { mcq } from '../../exam/testFixtures';
import { PanelProbe, WithPanels } from '../panels/testPanels';

const exam: AssembledExam = {
  exam: 'T-001',
  seed: 1,
  items: [
    { question: mcq('A0', 'A'), optionOrder: ['a', 'b', 'c', 'd'] },
    { question: mcq('B0', 'B'), optionOrder: ['a', 'b', 'c', 'd'] },
  ],
  mcqCount: 2,
  pbqWeightSum: 0,
};

const T0 = new Date('2026-01-01T00:00:00Z');

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(T0);
});
afterEach(() => vi.useRealTimers());

function setup(timeLimitMs = 600_000) {
  const onSubmit = vi.fn();
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  render(<ExamRunner exam={exam} timeLimitMs={timeLimitMs} startedAt={T0} onSubmit={onSubmit} />);
  return { onSubmit, user };
}

describe('ExamRunner', () => {
  it('asks before leaving from the start (it is timed), and stops once submitted', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const guards = new LeaveGuards();
    const onSubmit = vi.fn();
    render(
      <LeaveGuardProvider guards={guards}>
        <ExamRunner exam={exam} timeLimitMs={2_000} startedAt={T0} onSubmit={onSubmit} />
      </LeaveGuardProvider>,
    );
    expect(guards.confirmLeave()).toBe(false);
    expect(confirm).toHaveBeenCalledWith(LEAVE_RUN);
    confirm.mockClear();
    act(() => {
      vi.advanceTimersByTime(3_000);
    });
    expect(onSubmit).toHaveBeenCalled();
    expect(guards.confirmLeave()).toBe(true);
    expect(confirm).not.toHaveBeenCalled();
    confirm.mockRestore();
  });

  it('navigates with Previous and Next', async () => {
    const { user } = setup();
    expect(screen.getByText('Question 1 of 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Question 2 of 2')).toBeInTheDocument();
    expect(screen.getByText('Stem B0')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Previous' }));
    expect(screen.getByText('Stem A0')).toBeInTheDocument();
  });

  it('reflects answers and flags in the review grid and jumps', async () => {
    const { user } = setup();
    await user.click(screen.getByLabelText('A0-a'));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: /flag for review/i }));
    await user.click(screen.getByRole('button', { name: 'Review' }));
    expect(screen.getByRole('button', { name: 'Question 1, answered' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Question 2, unanswered, flagged' }));
    expect(screen.getByText('Stem B0')).toBeInTheDocument();
  });

  it('marks a select-two item with one pick as unanswered in the grid', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const multiExam: AssembledExam = { ...exam, items: [{ question: mcq('M0', 'A', 'mcq-multi'), optionOrder: ['a', 'b', 'c', 'd'] }], mcqCount: 1 };
    render(<ExamRunner exam={multiExam} timeLimitMs={600_000} startedAt={T0} onSubmit={onSubmit} />);
    await user.click(screen.getByLabelText('M0-a'));
    await user.click(screen.getByRole('button', { name: 'Review' }));
    expect(screen.getByRole('button', { name: 'Question 1, unanswered' })).toBeInTheDocument();
  });

  it('confirms before submitting without counting unanswered items', async () => {
    const { user, onSubmit } = setup();
    await user.click(screen.getByLabelText('A0-b'));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Review' }));
    await user.click(screen.getByRole('button', { name: 'Submit exam' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).not.toHaveTextContent(/unanswered/i);
    expect(dialog).toHaveTextContent("You can't change your answers after you submit.");
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Submit exam' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Submit' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ responses: { A0: ['b'] }, flagged: [], autoSubmitted: false });
  });

  it('auto-submits exactly once at zero, even with the dialog open', async () => {
    const { user, onSubmit } = setup(60_000);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Review' }));
    await user.click(screen.getByRole('button', { name: 'Submit exam' }));
    act(() => {
      vi.setSystemTime(T0.getTime() + 61_000);
      vi.advanceTimersByTime(1000);
    });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0].autoSubmitted).toBe(true);
    act(() => vi.advanceTimersByTime(5000));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('ignores answers after the deadline and submits instead', async () => {
    const { user, onSubmit } = setup(60_000);
    vi.setSystemTime(T0.getTime() + 60_500); // past the deadline, before the next tick
    await user.click(screen.getByLabelText('A0-a'));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ responses: {}, autoSubmitted: true });
  });

  it('keeps ticking when the parent passes a new onSubmit', () => {
    const { rerender } = render(<ExamRunner exam={exam} timeLimitMs={600_000} startedAt={T0} onSubmit={() => {}} />);
    act(() => vi.advanceTimersByTime(600));
    rerender(<ExamRunner exam={exam} timeLimitMs={600_000} startedAt={T0} onSubmit={() => {}} />);
    act(() => vi.advanceTimersByTime(600));
    expect(screen.getByRole('timer')).toHaveTextContent('9:59'); // ticked at 1.0 s
  });

  it('focuses Cancel when the submit dialog opens', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Review' }));
    await user.click(screen.getByRole('button', { name: 'Submit exam' }));
    expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' })).toHaveFocus();
  });

  it('computes remaining time from the deadline', () => {
    setup(60_000);
    act(() => {
      vi.setSystemTime(T0.getTime() + 29_000); // the tick below adds 1 s
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByRole('timer')).toHaveTextContent('0:30');
  });
});

describe('ExamRunner tools', () => {
  function setupTools(timeLimitMs = 600_000) {
    const onSubmit = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const r = render(
      <WithPanels>
        <ExamRunner exam={exam} timeLimitMs={timeLimitMs} startedAt={T0} onSubmit={onSubmit} />
        <PanelProbe />
      </WithPanels>,
    );
    return { onSubmit, user, ...r };
  }
  const probe = () => screen.getByTestId('panel-probe');

  it('shows Calculator and Whiteboard in the top bar', () => {
    setupTools();
    const bar = screen.getByRole('banner');
    expect(within(bar).getByRole('button', { name: 'Calculator' })).toBeInTheDocument();
    expect(within(bar).getByRole('button', { name: 'Whiteboard' })).toBeInTheDocument();
  });

  it('keeps the timer counting with the calculator open, and shows time left in the panel', async () => {
    const { user } = setupTools();
    await user.click(screen.getByRole('button', { name: 'Calculator' }));
    const panel = screen.getByRole('dialog', { name: 'Calculator' });
    act(() => vi.advanceTimersByTime(5_000));
    expect(screen.getByRole('timer')).toHaveTextContent('9:55');
    expect(within(panel).getByText(/Time left: 9:5\d/)).toBeInTheDocument();
  });

  it('auto-submit closes an open panel', async () => {
    const { user, onSubmit } = setupTools(10_000);
    await user.click(screen.getByRole('button', { name: 'Whiteboard' }));
    expect(screen.getByRole('dialog', { name: 'Whiteboard' })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(11_000));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ autoSubmitted: true });
    expect(screen.queryByRole('dialog', { name: 'Whiteboard' })).not.toBeInTheDocument();
    expect(probe()).toHaveAttribute('data-current', '');
  });

  it('sets the mock deadline while running and clears it on submit', () => {
    setupTools(10_000);
    expect(probe()).toHaveAttribute('data-deadline', String(T0.getTime() + 10_000));
    act(() => vi.advanceTimersByTime(11_000));
    expect(probe()).toHaveAttribute('data-deadline', '');
  });

  it('clears the mock deadline when the runner unmounts mid-exam', () => {
    function Host({ show }: { show: boolean }) {
      return (
        <WithPanels>
          {show && <ExamRunner exam={exam} timeLimitMs={600_000} startedAt={T0} onSubmit={() => {}} />}
          <PanelProbe />
        </WithPanels>
      );
    }
    const { rerender } = render(<Host show />);
    expect(probe()).not.toHaveAttribute('data-deadline', '');
    rerender(<Host show={false} />);
    expect(probe()).toHaveAttribute('data-deadline', '');
  });
});
