import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StudyRunner, type StudyItem } from './StudyRunner';
import { mcq, numeric, pbq } from '../../exam/testFixtures';

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

  it('numeric: Check answer stays disabled until the text is a number', async () => {
    const { user } = setup({ items: [{ kind: 'question', item: { question: numeric('N0', 'A') } }] });
    const check = screen.getByRole('button', { name: 'Check answer' });
    await user.type(screen.getByLabelText('Number N0'), 'abc');
    expect(check).toBeDisabled();
    await user.clear(screen.getByLabelText('Number N0'));
    await user.type(screen.getByLabelText('Number N0'), '25');
    await user.click(check);
    expect(screen.getByRole('status')).toHaveTextContent('Correct');
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

  it('reports only the items the user reached as seen', async () => {
    const { user, onFinish } = setup();
    await user.click(screen.getByRole('button', { name: 'Finish now' }));
    expect(onFinish.mock.calls[0][0].seen).toEqual(['A0']);
  });

  it('moves focus to the verdict after Check answer and to I knew it after Show answer', async () => {
    const { user } = setup({ items: [items[0], items[2]] });
    await user.click(screen.getByLabelText('A0-a'));
    await user.click(screen.getByRole('button', { name: 'Check answer' }));
    expect(screen.getByRole('status')).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Show answer' }));
    expect(screen.getByRole('button', { name: 'I knew it' })).toHaveFocus();
  });

  it('ignores a drag-and-drop change after a PBQ was checked', async () => {
    const p = pbq('P1', 2);
    const { user, onFinish } = setup({ items: [{ kind: 'question', item: { question: p, elementOrder: ['c1', 'c2', 'c3'] } }] });
    await user.selectOptions(screen.getByRole('combobox', { name: 'Prompt 1' }), 'Choice c1');
    await user.click(screen.getByRole('button', { name: 'Check answer' }));
    const target = screen.getAllByText('Prompt 2')[0].closest('li')!.querySelector('.drop-target') ?? screen.getAllByText('Prompt 2')[0];
    fireEvent.drop(target, { dataTransfer: { getData: () => 'c2' } });
    await user.click(screen.getByRole('button', { name: 'Finish' }));
    expect(onFinish.mock.calls[0][0].responses).toEqual({ P1: { p1: 'c1' } });
  });

  it('shows Saving after finishing and blocks further navigation', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Finish now' }));
    expect(screen.getByText('Saving…')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
  });

  it('announces one minute once at 60 seconds and time is up at zero', async () => {
    setup({ timeLimitMs: 61_000 });
    const live = screen.getByTestId('study-announcer');
    act(() => vi.advanceTimersByTime(1_000));
    expect(live).toHaveTextContent('1 minute remaining');
    act(() => vi.advanceTimersByTime(60_000));
    expect(live).toHaveTextContent('Time is up');
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

describe('StudyRunner Finish warning', () => {
  const three: StudyItem[] = [
    { kind: 'question', item: { question: mcq('A0', 'A'), optionOrder: order } },
    { kind: 'question', item: { question: mcq('B0', 'B'), optionOrder: order } },
    { kind: 'question', item: { question: mcq('M0', 'A', 'mcq-multi'), optionOrder: order } },
    { kind: 'acronym', card: { term: 'SQL', expansion: 'Structured Query Language' } },
  ];

  it('counts unanswered and partly answered questions, not cards; Keep going stays', async () => {
    const { user, onFinish } = setup({ items: three, feedback: 'end', warnIncomplete: true });
    await user.click(screen.getByLabelText('A0-a'));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByLabelText('M0-a')); // select two, one pick: partly answered
    await user.click(screen.getByRole('button', { name: 'Finish now' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('You have 2 unanswered or partly answered questions. Finish anyway?');
    await user.click(within(dialog).getByRole('button', { name: 'Keep going' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onFinish).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Finish now' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Finish' }));
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('uses the singular for one question', async () => {
    const { user } = setup({ items: three.slice(0, 2), feedback: 'end', warnIncomplete: true });
    await user.click(screen.getByLabelText('A0-a'));
    await user.click(screen.getByRole('button', { name: 'Finish now' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('You have 1 unanswered or partly answered question. Finish anyway?');
  });

  it('finishes with no dialog when everything is answered', async () => {
    const { user, onFinish } = setup({ items: three.slice(0, 1), feedback: 'end', warnIncomplete: true });
    await user.click(screen.getByLabelText('A0-a'));
    await user.click(screen.getByRole('button', { name: 'Finish' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('never warns without warnIncomplete (lesson checks)', async () => {
    const { user, onFinish } = setup({ items: three, feedback: 'end' });
    await user.click(screen.getByRole('button', { name: 'Finish now' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('a timeout finishes with no dialog', () => {
    const { onFinish } = setup({ items: three, feedback: 'end', warnIncomplete: true, timeLimitMs: 2_000 });
    act(() => vi.advanceTimersByTime(3_000));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onFinish).toHaveBeenCalledTimes(1);
  });
});
