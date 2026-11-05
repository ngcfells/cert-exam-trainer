import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AcronymEntry } from '../../acronyms/list';
import { SOURCE_SETTING } from '../../banks/pool';
import { createMemoryRepo } from '../../storage/memoryRepo';
import { parseSrsRecords } from '../../study/srs';
import { TestNav } from '../testNav';
import { AcronymFlow } from './AcronymFlow';
import { AcronymResults } from './AcronymResults';
import { QuizRunner } from './QuizRunner';
import { applyMarks, DEFAULT_MARKS } from '../marks/prefs';
import { fakeAudio } from '../marks/fakeAudio';
import { resetSoundForTests } from '../marks/sound';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  applyMarks(DEFAULT_MARKS);
  resetSoundForTests();
});

const e = (term: string, expansion: string): AcronymEntry => ({ term, expansion, source: 'community' });
const deck = [e('ETL', 'Extract, Transform, Load'), e('SQL', 'Structured Query Language'), e('CSV', 'Comma-Separated Values')];
const EXAM = 'DA0-002';

describe('FlashcardRunner via AcronymFlow', () => {
  it('flashcard grades feed SRS', async () => {
    const user = userEvent.setup();
    const repo = createMemoryRepo();
    await repo.setSetting(SOURCE_SETTING, 'ours');
    render(<AcronymFlow repo={repo} examCode={EXAM} seed={3} />);
    await user.click(await screen.findByRole('radio', { name: 'All' }));
    const count = screen.getByRole('spinbutton', { name: 'Number of cards' });
    await user.clear(count);
    await user.type(count, '2');
    await user.click(screen.getByRole('button', { name: 'Start' }));

    expect(await screen.findByRole('heading', { name: 'Card 1 of 2' })).toHaveFocus();
    const first = document.querySelector('.acronym-term')!.textContent!;
    await user.click(screen.getByRole('button', { name: 'Show answer' }));
    expect(screen.getByRole('button', { name: 'I knew it' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'I knew it' }));
    const second = document.querySelector('.acronym-term')!.textContent!;
    await user.click(screen.getByRole('button', { name: 'Show answer' }));
    await user.click(screen.getByRole('button', { name: "I didn't know it" }));

    expect(await screen.findByText('1 of 2 known')).toBeInTheDocument();
    const recs = parseSrsRecords(await repo.listRecords('srs'));
    const day = 86_400_000;
    const dueIn = (t: string) => Date.parse(recs.find((r) => r.itemId === t)!.due) - Date.parse(recs.find((r) => r.itemId === t)!.lastReviewed);
    expect(recs.every((r) => r.id.startsWith(`${EXAM}:a:`))).toBe(true);
    expect(dueIn(first)).toBe(day);
    expect(dueIn(second)).toBe(10 * 60_000);

    await user.click(screen.getByRole('button', { name: 'Study again' }));
    expect(await screen.findByRole('heading', { name: /^Acronyms:/ })).toHaveFocus();
  });
});

describe('AcronymFlow Back', () => {
  it('goes from a run to the setup, asking once a card is rated', async () => {
    const user = userEvent.setup();
    const repo = createMemoryRepo();
    await repo.setSetting(SOURCE_SETTING, 'ours');
    const onParent = vi.fn();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(
      <TestNav onParent={onParent}>
        <AcronymFlow repo={repo} examCode={EXAM} seed={3} />
      </TestNav>,
    );
    await user.click(await screen.findByRole('radio', { name: 'All' }));
    expect(screen.queryByRole('button', { name: /^(cancel|back)$/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Start' }));
    await user.click(await screen.findByRole('button', { name: 'Show answer' }));
    await user.click(screen.getByRole('button', { name: 'I knew it' }));

    await user.click(screen.getByRole('button', { name: '← Back to acronyms' }));
    expect(confirm).toHaveBeenCalledWith('Leave this exam? Your answers will be lost.');
    expect(screen.getByRole('heading', { name: /^Card 2 of/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '← Back to acronyms' }));
    expect(await screen.findByRole('heading', { name: /^Acronyms:/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '← Back' })).toBeInTheDocument();
    expect(onParent).not.toHaveBeenCalled();
    confirm.mockRestore();
  });
});

describe('QuizRunner', () => {
  it('typed quiz accepts normalized answer', async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    render(<QuizRunner deck={deck.slice(0, 1)} entries={deck} show="term" answer="type" minutes={0} seed={1} onFinish={onFinish} />);
    expect(screen.getByRole('textbox', { name: 'Your answer' })).toHaveAccessibleDescription('What does ETL stand for?');
    await user.type(screen.getByRole('textbox', { name: 'Your answer' }), '  extract transform LOAD{Enter}');
    expect(screen.getByRole('status')).toHaveTextContent('Correct');
    expect(screen.getByRole('status')).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Finish' }));
    expect(onFinish).toHaveBeenCalledWith([{ term: 'ETL', correct: true, given: '  extract transform LOAD' }], false);
  });

  it('typed quiz accepts an alternate meaning, and a miss lists the alternates', async () => {
    const mttr: AcronymEntry = { term: 'MTTR', expansion: 'Mean Time to Recovery', alternates: ['Mean Time to Repair'], source: 'community' };
    const user = userEvent.setup();
    const { unmount } = render(<QuizRunner deck={[mttr]} entries={[mttr, ...deck]} show="term" answer="type" minutes={0} seed={1} onFinish={vi.fn()} />);
    await user.type(screen.getByRole('textbox', { name: 'Your answer' }), 'mean time to repair{Enter}');
    expect(screen.getByRole('status')).toHaveTextContent('Correct');
    unmount();
    render(<QuizRunner deck={[mttr]} entries={[mttr, ...deck]} show="term" answer="type" minutes={0} seed={1} onFinish={vi.fn()} />);
    await user.type(screen.getByRole('textbox', { name: 'Your answer' }), 'mean time to respond{Enter}');
    expect(screen.getByRole('status')).toHaveTextContent(/^Incorrect\s*The answer is: Mean Time to Recovery \(also: Mean Time to Repair\)$/);
    expect(screen.getByRole('status').querySelector('.mark-wrong')).not.toBeNull();
  });

  it('count as correct flips a miss', async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    render(<QuizRunner deck={deck.slice(0, 1)} entries={deck} show="term" answer="type" minutes={0} seed={1} onFinish={onFinish} />);
    await user.type(screen.getByRole('textbox', { name: 'Your answer' }), 'extract transfrom load');
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByRole('status')).toHaveTextContent(/Incorrect\s*The answer is: Extract, Transform, Load/);
    const log = fakeAudio();
    act(() => applyMarks({ style: 'banner', sound: true }));
    await user.click(screen.getByRole('button', { name: 'Count as correct' }));
    expect(screen.getByRole('status')).toHaveTextContent(/^Correct$/);
    expect(screen.getByRole('status').querySelector('.mark-right')).not.toBeNull();
    expect(log.freqs).toEqual([660, 880]);
    expect(screen.getByRole('status')).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Finish' }));
    expect(onFinish.mock.calls[0][0][0].correct).toBe(true);
  });

  it('choice quiz marks the right option', async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    render(<QuizRunner deck={deck.slice(1, 2)} entries={deck} show="expansion" answer="choose" minutes={0} seed={1} onFinish={onFinish} />);
    const group = screen.getByRole('group', { name: 'Which acronym stands for Structured Query Language?' });
    expect(within(group).getAllByRole('radio')).toHaveLength(3);
    await user.click(within(group).getByRole('radio', { name: 'SQL' }));
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByRole('status')).toHaveTextContent('Correct');
    expect(within(group).getByRole('radio', { name: 'SQL' })).toBeDisabled();
  });

  it('timeout grades only answered cards', () => {
    vi.useFakeTimers();
    let t = 0;
    const onFinish = vi.fn();
    render(<QuizRunner deck={deck} entries={deck} show="term" answer="type" minutes={2} seed={1} now={() => t} onFinish={onFinish} />);
    expect(screen.getByRole('timer', { name: 'Time left' })).toHaveTextContent('2:00');
    fireEvent.change(screen.getByRole('textbox', { name: 'Your answer' }), { target: { value: 'nope' } });
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    t = 61_000;
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText('1 minute remaining')).toBeInTheDocument();
    t = 120_000;
    act(() => vi.advanceTimersByTime(1000));
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledWith([{ term: 'ETL', correct: false, given: 'nope' }], true);
  });
});

describe('AcronymResults', () => {
  it('results list missed cards', () => {
    render(
      <AcronymResults
        deck={deck}
        grades={[{ term: 'ETL', correct: true, given: 'x' }, { term: 'SQL', correct: false, given: 'sequel' }]}
        mode="quiz"
        timedOut
        saveError="Review scheduling could not be saved."
        onAgain={() => {}}
       
      />,
    );
    expect(screen.getByText('1 of 2 correct')).toBeInTheDocument();
    expect(screen.getByText('Time ran out.')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Review scheduling could not be saved.');
    const table = screen.getByRole('table', { name: 'Missed' });
    expect(within(table).getByRole('rowheader', { name: 'SQL' })).toBeInTheDocument();
    expect(within(table).getByRole('cell', { name: 'sequel' })).toBeInTheDocument();
    expect(within(table).queryByRole('rowheader', { name: 'ETL' })).toBeNull();
  });
});
