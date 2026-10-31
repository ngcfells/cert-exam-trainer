import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { registerExam } from '../../banks';
import { bank, meta3 } from '../../exam/testFixtures';
import { examResultSchema } from '../../exam/result';
import { parseSrsRecords } from '../../study/srs';
import { createMemoryRepo } from '../../storage/memoryRepo';
import type { ExamMeta } from '../../domain/types';
import { TestNav } from '../testNav';
import { PracticeFlow } from './PracticeFlow';
import { CramFlow } from './CramFlow';

const meta: ExamMeta = {
  ...meta3,
  acronyms: [
    { term: 'ETL', expansion: 'Extract, transform, load', source: 'official' },
    { term: 'KPI', expansion: 'Key performance indicator', source: 'official' },
  ],
};
registerExam(meta, bank({ A: 3, B: 2, C: 1 }));

beforeEach(() => vi.stubEnv('DEV', false));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

type User = ReturnType<typeof userEvent.setup>;

async function answerRightAndCheck(user: User) {
  const legend = screen.getAllByRole('group').find((g) => g.querySelector('legend.stem'))!.querySelector('legend')!.textContent!;
  const id = legend.replace('Stem ', '');
  await user.click(screen.getByLabelText(`${id}-a`));
  await user.click(screen.getByRole('button', { name: 'Check answer' }));
}

describe('PracticeFlow', () => {
  it('with no types checked, Start is disabled and says no questions match', async () => {
    const user = userEvent.setup();
    render(<PracticeFlow repo={createMemoryRepo()} examCode="T-001" seed={1} />);
    expect(await screen.findByRole('status')).toHaveTextContent(/Only 6 questions match/);
    await user.click(screen.getByRole('checkbox', { name: 'Multiple choice' }));
    expect(screen.getByRole('status')).toHaveTextContent('No questions match these choices.');
    expect(screen.getByRole('button', { name: 'Start practice' })).toBeDisabled();
  });

  it('mine with no questions shows empty message', async () => {
    const repo = createMemoryRepo();
    await repo.setSetting('sourceFilter', 'mine');
    render(<PracticeFlow repo={repo} examCode="T-001" seed={1} />);
    expect(await screen.findByRole('status')).toHaveTextContent('No questions match these choices.');
    expect(screen.getByRole('button', { name: 'Start practice' })).toBeDisabled();
  });

  it('notes when the count is above the pool', async () => {
    const user = userEvent.setup();
    render(<PracticeFlow repo={createMemoryRepo()} examCode="T-001" seed={1} />);
    const count = await screen.findByRole('spinbutton', { name: 'Number of questions' });
    await user.clear(count);
    await user.type(count, '2');
    expect(screen.getByRole('status')).toHaveTextContent('6 questions match.');
    await user.clear(count);
    await user.type(count, '9');
    expect(screen.getByRole('status')).toHaveTextContent('Only 6 questions match; the session will use all of them.');
  });

  it('an instant run saves a practice result and review records', async () => {
    const user = userEvent.setup();
    const repo = createMemoryRepo();
    render(<PracticeFlow repo={repo} examCode="T-001" seed={1} />);
    const count = await screen.findByRole('spinbutton', { name: 'Number of questions' });
    await user.clear(count);
    await user.type(count, '2');
    await user.click(screen.getByRole('button', { name: 'Start practice' }));
    await answerRightAndCheck(user);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Finish' }));
    expect(await screen.findByRole('heading', { name: 'Practice complete: 50% correct' })).toBeInTheDocument();
    const result = examResultSchema.parse((await repo.listRecords('results'))[0]);
    expect(result.mode).toBe('practice');
    expect(parseSrsRecords(await repo.listRecords('srs'))).toHaveLength(1);
  });

  it('Finish now saves and scores only the questions the user reached', async () => {
    const user = userEvent.setup();
    const repo = createMemoryRepo();
    render(<PracticeFlow repo={repo} examCode="T-001" seed={1} />);
    await user.click(await screen.findByRole('button', { name: 'Start practice' }));
    await answerRightAndCheck(user);
    await user.click(screen.getByRole('button', { name: 'Finish now' }));
    expect(await screen.findByRole('heading', { name: 'Practice complete: 100% correct' })).toBeInTheDocument();
    expect(examResultSchema.parse((await repo.listRecords('results'))[0]).questionIds).toHaveLength(1);
  });

  it('shows an error when loading fails, with the nav bar as the way back', async () => {
    const repo = createMemoryRepo();
    repo.listRecords = () => Promise.reject(new Error('idb'));
    const onParent = vi.fn();
    render(
      <TestNav onParent={onParent}>
        <PracticeFlow repo={repo} examCode="T-001" />
      </TestNav>,
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load your data.');
    await userEvent.setup().click(screen.getByRole('button', { name: '← Back' }));
    expect(onParent).toHaveBeenCalled();
  });

  it('a drill preset checks only the given objectives', async () => {
    render(<PracticeFlow repo={createMemoryRepo()} examCode="T-001" seed={1} presetObjectiveIds={['B.1']} />);
    expect(await screen.findByRole('checkbox', { name: 'B.1 Objective B1' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'A.1 Objective A1' })).not.toBeChecked();
    expect(screen.getByRole('status')).toHaveTextContent(/Only 2 questions match/);
  });

  it('the whole-domain box toggles its objectives', async () => {
    const user = userEvent.setup();
    render(<PracticeFlow repo={createMemoryRepo()} examCode="T-001" seed={1} />);
    await user.click(await screen.findByRole('checkbox', { name: 'All of domain A' }));
    expect(screen.getByRole('checkbox', { name: 'A.1 Objective A1' })).not.toBeChecked();
    expect(screen.getByRole('status')).toHaveTextContent(/Only 3 questions match/);
  });
});

describe('CramFlow', () => {
  it('shows an error when loading fails', async () => {
    const repo = createMemoryRepo();
    repo.listRecords = () => Promise.reject(new Error('idb'));
    render(<CramFlow repo={repo} examCode="T-001" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load your data.');
  });

  it('a timed-out session saves only checked items and ends on the summary', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const repo = createMemoryRepo();
    render(<CramFlow repo={repo} examCode="T-001" seed={1} />);
    await user.click(await screen.findByRole('checkbox', { name: 'Use a countdown' }));
    const minutes = screen.getByRole('spinbutton', { name: 'Minutes' });
    await user.clear(minutes);
    await user.type(minutes, '1');
    await user.click(screen.getByRole('button', { name: 'Start cram' }));
    await answerRightAndCheck(user);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    act(() => vi.advanceTimersByTime(62_000));
    expect(await screen.findByRole('heading', { name: /^Cram complete/ })).toBeInTheDocument();
    expect(screen.getByText('Time ran out, so the session ended.')).toBeInTheDocument();
    const srs = parseSrsRecords(await repo.listRecords('srs'));
    expect(srs).toHaveLength(1);
    expect(srs[0].kind).toBe('question');
    expect(examResultSchema.parse((await repo.listRecords('results'))[0]).mode).toBe('cram');
  });

  it('reports acronyms known in the summary and schedules them', async () => {
    const user = userEvent.setup();
    const repo = createMemoryRepo();
    render(<CramFlow repo={repo} examCode="T-001" seed={1} />);
    await user.click(await screen.findByRole('button', { name: 'Start cram' }));
    for (;;) {
      const show = screen.queryByRole('button', { name: 'Show answer' });
      if (show) {
        await user.click(show);
        await user.click(screen.getByRole('button', { name: 'I knew it' }));
      }
      const finish = screen.queryByRole('button', { name: 'Finish' });
      if (finish) {
        await user.click(finish);
        break;
      }
      await user.click(screen.getByRole('button', { name: 'Next' }));
    }
    expect(await screen.findByText('Acronyms: 2 of 2 known')).toBeInTheDocument();
    const acr = parseSrsRecords(await repo.listRecords('srs')).filter((r) => r.kind === 'acronym');
    expect(acr.map((r) => r.itemId).sort()).toEqual(['ETL', 'KPI']);
  });
});
