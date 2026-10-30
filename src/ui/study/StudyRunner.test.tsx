import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StudyRunner, type StudyItem } from './StudyRunner';
import { mcq } from '../../exam/testFixtures';

const T0 = new Date('2026-01-01T00:00:00Z');
const order = ['a', 'b', 'c', 'd'];
const items: StudyItem[] = [
  { kind: 'question', item: { question: mcq('A0', 'A'), optionOrder: order } },
  { kind: 'question', item: { question: mcq('B0', 'B'), optionOrder: order } },
  { kind: 'acronym', card: { term: 'SQL', expansion: 'Structured Query Language' } },
];

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(T0);
});
afterEach(() => vi.useRealTimers());

function setup(props: Partial<Parameters<typeof StudyRunner>[0]> = {}) {
  const onFinish = vi.fn();
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  render(<StudyRunner items={items} feedback="instant" startedAt={T0} onFinish={onFinish} {...props} />);
  return { onFinish, user };
}

describe('StudyRunner', () => {
  it('instant: Check answer shows Incorrect with the explanation and locks the options', async () => {
    const { user } = setup();
    expect(screen.getByRole('heading', { name: 'Item 1 of 3' })).toHaveFocus();
    const check = screen.getByRole('button', { name: 'Check answer' });
    expect(check).toBeDisabled();
    await user.click(screen.getByLabelText('A0-b'));
    await user.click(check);
    expect(screen.getByRole('status')).toHaveTextContent('Incorrect');
    expect(screen.getByText('Explanation A0')).toBeInTheDocument();
    expect(screen.getByLabelText('A0-a')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Check answer' })).not.toBeInTheDocument();
  });

  it('end feedback hides Check and reports answered items as checked at Finish', async () => {
    const { user, onFinish } = setup({ feedback: 'end', items: items.slice(0, 2) });
    expect(screen.queryByRole('button', { name: 'Check answer' })).not.toBeInTheDocument();
    await user.click(screen.getByLabelText('A0-a'));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Finish' }));
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish.mock.calls[0][0]).toMatchObject({ responses: { A0: ['a'] }, checked: ['A0'], acronymGrades: [], timedOut: false });
  });

  it('an unchecked answer in instant mode is not reported as checked', async () => {
    const { user, onFinish } = setup();
    await user.click(screen.getByLabelText('A0-a'));
    await user.click(screen.getByRole('button', { name: 'Finish now' }));
    expect(onFinish.mock.calls[0][0].checked).toEqual([]);
  });

  it('reveals and grades an acronym card', async () => {
    const { user, onFinish } = setup({ items: [items[2]] });
    expect(screen.getByText('SQL')).toBeInTheDocument();
    expect(screen.queryByText('Structured Query Language')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Show answer' }));
    expect(screen.getByText('Structured Query Language')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'I knew it' }));
    expect(screen.getByRole('status')).toHaveTextContent('Marked as known');
    await user.click(screen.getByRole('button', { name: 'Finish' }));
    expect(onFinish.mock.calls[0][0].acronymGrades).toEqual([{ term: 'SQL', knew: true }]);
  });

  it('countdown at zero finishes once with timedOut and only checked items', async () => {
    const { user, onFinish } = setup({ timeLimitMs: 120_000 });
    expect(screen.getByRole('timer')).toHaveTextContent('2:00');
    await user.click(screen.getByLabelText('A0-a'));
    await user.click(screen.getByRole('button', { name: 'Check answer' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByLabelText('B0-a'));
    act(() => vi.advanceTimersByTime(61_000));
    expect(screen.getByTestId('study-announcer')).toHaveTextContent('1 minute remaining');
    act(() => vi.advanceTimersByTime(60_000));
    act(() => vi.advanceTimersByTime(5_000));
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish.mock.calls[0][0]).toMatchObject({ checked: ['A0'], timedOut: true });
  });
});
