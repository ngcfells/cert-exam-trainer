import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StudyRunner, type StudyItem } from './StudyRunner';
import { mcq, numeric, pbq } from '../../exam/testFixtures';
import { applyMarks, DEFAULT_MARKS } from '../marks/prefs';
import { fakeAudio } from '../marks/fakeAudio';
import { resetSoundForTests } from '../marks/sound';
import { StrictMode } from 'react';
import { dataPlusMeta } from '../../banks/dataplus/meta';
import { applyTips, getTips, resetTipsForTests } from '../tips/prefs';
import { WithPanels } from '../panels/testPanels';
import { usePanels } from '../panels/PanelProvider';
import { CommandHelpPanel } from '../primer/CommandHelpPanel';

vi.mock('../../primer/topics', async () => (await import('../../primer/testTopics')).mockTopicsModule());

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

describe('StudyRunner answer marks', () => {
  afterEach(() => {
    applyMarks(DEFAULT_MARKS);
    vi.unstubAllGlobals();
    resetSoundForTests();
  });

  it('a checked right answer shows the banner mark', async () => {
    const { user } = setup();
    await user.click(screen.getByLabelText('A0-a'));
    await user.click(screen.getByRole('button', { name: 'Check answer' }));
    const status = screen.getByRole('status');
    expect(status.tagName).toBe('DIV');
    expect(status.querySelector('.mark-banner.mark-right')).not.toBeNull();
    expect(status).toHaveTextContent('Correct');
  });

  it('plays once on Check and never on a revisit', async () => {
    const log = fakeAudio();
    act(() => applyMarks({ style: 'smiley', sound: true }));
    const { user } = setup();
    await user.click(screen.getByLabelText('A0-b'));
    await user.click(screen.getByRole('button', { name: 'Check answer' }));
    expect(log.freqs).toEqual([220]);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Previous' }));
    expect(screen.getByRole('status').querySelector('.mark-smiley.mark-wrong')).not.toBeNull();
    expect(log.freqs).toEqual([220]);
  });

  it('a graded acronym card gets words, not a mark', async () => {
    const { user } = setup({ items: [items[2]] });
    await user.click(screen.getByRole('button', { name: 'Show answer' }));
    await user.click(screen.getByRole('button', { name: 'I knew it' }));
    expect(screen.getByRole('status')).toHaveTextContent('Marked as known');
    expect(screen.getByRole('status').querySelector('.mark')).toBeNull();
  });
});

describe('StudyRunner study tips', () => {
  const qs = (n: number): StudyItem[] =>
    Array.from({ length: n }, (_, i) => ({ kind: 'question', item: { question: mcq(`Q${i}`, 'A'), optionOrder: order } }));
  const TIP = /^(Study|Test-room) tip$/;
  const tipBox = () => screen.queryByRole('region', { name: TIP });

  beforeEach(() => applyTips({ on: true, progress: { count: 0, gap: 10, seen: [] } }));
  afterEach(() => resetTipsForTests());

  async function next(user: ReturnType<typeof userEvent.setup>, times: number) {
    for (let i = 0; i < times; i++) await user.click(screen.getByRole('button', { name: 'Next' }));
  }

  it('opens a tip above the question on the tenth new question', async () => {
    const { user } = setup({ items: qs(12), tipsFor: dataPlusMeta });
    await next(user, 8);
    expect(tipBox()).toBeNull();
    await next(user, 1);
    const box = tipBox()!;
    expect(box).not.toBeNull();
    const fieldset = document.querySelector('fieldset.study-lock')!;
    expect(box.compareDocumentPosition(fieldset) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(getTips().progress.count).toBe(0);
  });

  it('announces a new tip through a live region that is there from the start', async () => {
    const { user } = setup({ items: qs(12), tipsFor: dataPlusMeta });
    const live = screen.getByTestId('tip-announcer');
    expect(live).toHaveAttribute('aria-live', 'polite');
    expect(live).toHaveTextContent('');
    await next(user, 9);
    const box = tipBox()!;
    expect(screen.getByTestId('tip-announcer')).toBe(live);
    expect(live.textContent).toMatch(/^(Study|Test-room) tip: /);
    expect(live.textContent).toContain(box.querySelector('.tip-text')!.textContent);
    await user.click(screen.getByRole('button', { name: 'Close tip' }));
    expect(live).toHaveTextContent('');
  });

  it('has no tip announcer without tipsFor', () => {
    setup({ items: qs(3) });
    expect(screen.queryByTestId('tip-announcer')).toBeNull();
  });

  it('does not count a question twice after going back', async () => {
    const { user } = setup({ items: qs(12), tipsFor: dataPlusMeta });
    await next(user, 4);
    expect(getTips().progress.count).toBe(5);
    for (let i = 0; i < 3; i++) await user.click(screen.getByRole('button', { name: 'Previous' }));
    await next(user, 3);
    expect(getTips().progress.count).toBe(5);
  });

  it('counts once per question under StrictMode', async () => {
    const onFinish = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <StrictMode>
        <StudyRunner items={qs(12)} feedback="instant" startedAt={T0} onFinish={onFinish} tipsFor={dataPlusMeta} />
      </StrictMode>,
    );
    expect(getTips().progress.count).toBe(1);
    await next(user, 9);
    expect(screen.getAllByRole('region', { name: TIP })).toHaveLength(1);
    expect(getTips().progress.count).toBe(0);
  });

  it('Close tip removes the box and moves focus to the item heading', async () => {
    const { user } = setup({ items: qs(12), tipsFor: dataPlusMeta });
    await next(user, 9);
    await user.click(screen.getByRole('button', { name: 'Close tip' }));
    expect(tipBox()).toBeNull();
    expect(screen.getByRole('heading', { name: 'Item 10 of 12' })).toHaveFocus();
  });

  it('keeps the box and its tip while moving, even when the next tip falls due', async () => {
    const { user } = setup({ items: qs(25), tipsFor: dataPlusMeta });
    await next(user, 9);
    const text = tipBox()!.textContent;
    await user.click(screen.getByRole('button', { name: 'Previous' }));
    expect(tipBox()!.textContent).toBe(text);
    await next(user, 1);
    act(() => applyTips({ ...getTips(), progress: { ...getTips().progress, count: 0, gap: 10 } }));
    await next(user, 10);
    expect(tipBox()!.textContent).toBe(text);
    expect(screen.getAllByRole('region', { name: TIP })).toHaveLength(1);
    expect(getTips().progress.count).toBe(0);
  });

  it('shows no tip and counts nothing without tipsFor (lesson checks)', async () => {
    const { user } = setup({ items: qs(12) });
    await next(user, 9);
    expect(tipBox()).toBeNull();
    expect(getTips().progress.count).toBe(0);
  });

  it('shows no tip when tips are off', async () => {
    act(() => applyTips({ on: false, progress: { count: 0, gap: 10, seen: [] } }));
    const { user } = setup({ items: qs(12), tipsFor: dataPlusMeta });
    await next(user, 9);
    expect(tipBox()).toBeNull();
  });

  it('does not count acronym cards', async () => {
    const cards: StudyItem[] = ['A', 'B', 'C', 'D', 'E'].map((t) => ({ kind: 'acronym', card: { term: t, expansion: `${t} x` } }));
    const { user } = setup({ items: [...qs(9), ...cards], tipsFor: dataPlusMeta });
    await next(user, 13);
    expect(tipBox()).toBeNull();
    expect(getTips().progress.count).toBe(9);
  });

  it('lets the question be answered and checked with the box open', async () => {
    const { user } = setup({ items: qs(12), tipsFor: dataPlusMeta });
    await next(user, 9);
    expect(tipBox()).not.toBeNull();
    await user.click(screen.getByLabelText('Q9-a'));
    await user.click(screen.getByRole('button', { name: 'Check answer' }));
    expect(screen.getByRole('status')).toHaveTextContent('Correct');
  });
});

describe('StudyRunner tools', () => {
  function setupTools(props: Partial<Parameters<typeof StudyRunner>[0]> = {}) {
    const onFinish = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <WithPanels>
        <StudyRunner items={items} feedback="instant" startedAt={T0} onFinish={onFinish} {...props} />
      </WithPanels>,
    );
    return { onFinish, user };
  }

  it('shows both tool buttons in the header with tools', () => {
    setupTools({ tools: true });
    const bar = screen.getByRole('banner');
    expect(within(bar).getByRole('button', { name: 'Calculator' })).toBeInTheDocument();
    expect(within(bar).getByRole('button', { name: 'Whiteboard' })).toBeInTheDocument();
  });

  it('shows neither without tools (lesson checks)', () => {
    setupTools();
    expect(screen.queryByRole('button', { name: 'Calculator' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Whiteboard' })).not.toBeInTheDocument();
  });

  it('a timeout closes an open panel', async () => {
    const { user, onFinish } = setupTools({ tools: true, timeLimitMs: 10_000 });
    await user.click(screen.getByRole('button', { name: 'Calculator' }));
    expect(screen.getByRole('dialog', { name: 'Calculator' })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(11_000));
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog', { name: 'Calculator' })).not.toBeInTheDocument();
  });

  const cmd: StudyItem = { kind: 'question', item: { question: { ...mcq('C0', 'A'), stem: 'Which run of `grep ERROR app.log` is right?' }, optionOrder: order } };
  function setupHelp(props: Partial<Parameters<typeof StudyRunner>[0]> = {}) {
    const onFinish = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    function Host() {
      const { current } = usePanels();
      return current === 'command-help' ? <CommandHelpPanel /> : null;
    }
    render(
      <WithPanels>
        <StudyRunner items={[cmd, ...items]} feedback="instant" startedAt={T0} onFinish={onFinish} {...props} />
        <Host />
      </WithPanels>,
    );
    return { onFinish, user };
  }

  it('shows Command help on a command question in practice', () => {
    setupHelp({ tools: true });
    expect(within(screen.getByRole('banner')).getByRole('button', { name: 'Command help' })).toBeInTheDocument();
  });

  it('shows no Command help on a question without command code', async () => {
    const { user } = setupHelp({ tools: true });
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.queryByRole('button', { name: 'Command help' })).not.toBeInTheDocument();
  });

  it('shows no Command help in a lesson check (tools off)', () => {
    setupHelp();
    expect(screen.queryByRole('button', { name: 'Command help' })).not.toBeInTheDocument();
  });

  it('a timeout with Command help open closes it and finishes once', async () => {
    const { user, onFinish } = setupHelp({ tools: true, timeLimitMs: 10_000 });
    await user.click(screen.getByRole('button', { name: 'Command help' }));
    expect(screen.getByRole('dialog', { name: 'Command help' })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(11_000));
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish.mock.calls[0][0]).toMatchObject({ timedOut: true });
    expect(screen.queryByRole('dialog', { name: 'Command help' })).not.toBeInTheDocument();
  });

  it('Finish closes an open panel', async () => {
    const { user, onFinish } = setupTools({ tools: true });
    await user.click(screen.getByRole('button', { name: 'Whiteboard' }));
    // The panel is modal in a browser; this stands in for a finish that arrives while it is open.
    await user.click(screen.getByRole('button', { name: 'Finish now' }));
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog', { name: 'Whiteboard' })).not.toBeInTheDocument();
  });
});
