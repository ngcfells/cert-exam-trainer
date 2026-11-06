import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockExamFlow } from './MockExamFlow';
import { ExamSetup } from './ExamSetup';
import { listExams } from '../../banks';
import { ExamPage } from '../ExamPage';
import { createMemoryRepo } from '../../storage/memoryRepo';
import { dataPlusQuestions } from '../../banks/dataplus/questions';
import { examResultSchema } from '../../exam/result';
import { parseSrsRecords } from '../../study/srs';
import { correctParts, partLabel, valueText } from '../../domain/pbq';
import type { McqAnswer, McqPayload, NumericAnswer, Question } from '../../domain/types';
import type { Repo } from '../../storage';
import { loadInProgress, saveInProgress } from '../../exam/inProgress';
import { sampleMock } from '../../exam/testMock';
import { recoverMock } from './recover';
import { usePanels } from '../panels/PanelProvider';
import { PanelProbe, WithPanels } from '../panels/testPanels';

beforeEach(() => vi.stubEnv('DEV', false));
afterEach(() => vi.unstubAllEnvs());

const optionText = (id: string, which: 'right' | 'wrong') => {
  const q = dataPlusQuestions.find((x) => x.id === id)!;
  const correct = (q.answer as McqAnswer).correct;
  const opts = (q.payload as McqPayload).options;
  return opts.find((o) => (which === 'right' ? correct.includes(o.id) : !correct.includes(o.id)))!.text;
};

type User = ReturnType<typeof userEvent.setup>;

async function answerPbq(user: User, q: Question) {
  const key = correctParts(q);
  if (q.type === 'pbq-order') {
    for (const [pos, id] of Object.entries(key)) {
      const text = valueText(q, pos, id);
      const at = () => screen.getAllByRole('listitem').findIndex((li) => li.textContent!.includes(text));
      while (at() > Number(pos)) await user.click(screen.getByRole('button', { name: `Move ${text} up` }));
    }
    return;
  }
  if (q.type === 'pbq-hotspot') {
    for (const [part, v] of Object.entries(key)) if (v === 'on') await user.click(screen.getByRole('checkbox', { name: partLabel(q, part) }));
    return;
  }
  for (const [part, id] of Object.entries(key)) {
    const box = screen.queryByRole('textbox', { name: partLabel(q, part) });
    if (box) {
      await user.type(box, id);
      continue;
    }
    await user.selectOptions(screen.getByRole('combobox', { name: partLabel(q, part) }), valueText(q, part, id));
  }
}

async function answerCurrent(user: User, which: 'right' | 'wrong') {
  const num = dataPlusQuestions.find((x) => x.type === 'numeric' && screen.queryByLabelText(x.stem));
  if (num) {
    await user.type(screen.getByLabelText(num.stem), which === 'right' ? String((num.answer as NumericAnswer).value) : '99999');
    return;
  }
  const stem = screen.getAllByRole('group')[0].querySelector('legend')!.textContent!;
  const q = dataPlusQuestions.find((x) => x.stem === stem)!;
  if (q.type.startsWith('pbq')) {
    if (which === 'right') await answerPbq(user, q);
    return;
  }
  if (which === 'right') {
    for (const c of (q.answer as McqAnswer).correct) {
      await user.click(screen.getByLabelText((q.payload as McqPayload).options.find((o) => o.id === c)!.text));
    }
  } else {
    await user.click(screen.getByLabelText(optionText(q.id, 'wrong')));
  }
}

async function start(repo: Repo = createMemoryRepo()) {
  const user = userEvent.setup();
  render(<MockExamFlow repo={repo} examCode="DA0-002" seed={5} />);
  await user.click(await screen.findByRole('checkbox', { name: 'I understand' }));
  await user.click(screen.getByRole('button', { name: 'Start exam' }));
  return { user, repo };
}

/** Answers every item, then opens the review screen. */
async function answerAll(user: User, which: 'right' | 'wrong' | 'skip') {
  for (;;) {
    if (which !== 'skip') await answerCurrent(user, which);
    const review = screen.queryByRole('button', { name: 'Review' });
    if (review) return user.click(review);
    await user.click(screen.getByRole('button', { name: 'Next' }));
  }
}

async function submit(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Submit exam' }));
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Submit' }));
}

describe('MockExamFlow', () => {
  it('starts from Home and shows the short-bank notice', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(<ExamPage repo={createMemoryRepo()} examCode="DA0-002" onNavigate={onNavigate} />);
    await user.click(await screen.findByRole('button', { name: 'Start mock exam: DA0-002' }));
    expect(onNavigate).toHaveBeenCalledWith({ name: 'mock', exam: 'DA0-002' });

    render(<MockExamFlow repo={createMemoryRepo()} examCode="DA0-002" seed={5} />);
    expect(await screen.findByText(/^\d+ questions$/)).toBeInTheDocument();
    expect(screen.getByText(/shorter than the real one \(90\)/)).toBeInTheDocument();
  });

  it('scores a perfect run and saves the result', async () => {
    const { user, repo } = await start();
    await answerAll(user, 'right');
    await submit(user);
    expect(await screen.findByRole('heading', { name: 'Your score: 900 / 900' })).toBeInTheDocument();
    expect(screen.getByText('PASS')).toBeInTheDocument();
    const recs = await repo.listRecords('results');
    expect(recs).toHaveLength(1);
    expect(examResultSchema.parse(recs[0]).seed).toBe(5);
  });

  it('schedules reviews for every answered question', async () => {
    const { user, repo } = await start();
    await answerAll(user, 'right');
    await submit(user);
    await screen.findByRole('heading', { name: /your score/i });
    const result = examResultSchema.parse((await repo.listRecords('results'))[0]);
    const srs = parseSrsRecords(await repo.listRecords('srs'));
    expect(srs.map((r) => r.itemId).sort()).toEqual([...result.questionIds].sort());
    expect(srs.every((r) => r.reps === 1)).toBe(true);
  });

  it('does not schedule unanswered questions', async () => {
    const { user, repo } = await start();
    await answerAll(user, 'skip');
    await submit(user);
    await screen.findByRole('heading', { name: /your score/i });
    expect(await repo.listRecords('srs')).toEqual([]);
  });

  it('reviews wrong and unanswered items with explanations', async () => {
    const { user } = await start();
    await answerAll(user, 'wrong');
    await submit(user);
    expect(await screen.findByText('FAIL')).toBeInTheDocument();
    expect(screen.getAllByText('Not answered').length).toBeGreaterThan(0);
    for (const id of ['da2-seed-001', 'da2-seed-002']) {
      expect(screen.getByText(dataPlusQuestions.find((q) => q.id === id)!.explanation)).toBeInTheDocument();
    }
  });

  it('still shows results when saving fails', async () => {
    const repo = createMemoryRepo();
    repo.putRecord = () => Promise.reject(new Error('quota'));
    const { user } = await start(repo);
    await answerAll(user, 'skip');
    await submit(user);
    expect(await screen.findByRole('heading', { name: /your score/i })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Your result could not be saved to history.');
  });

  it('reports a failed review-scheduling save but keeps the result', async () => {
    const repo = createMemoryRepo();
    const put = repo.putRecord.bind(repo);
    repo.putRecord = (store, rec) => (store === 'srs' ? Promise.reject(new Error('quota')) : put(store, rec));
    const { user } = await start(repo);
    await answerAll(user, 'right');
    await submit(user);
    expect(await screen.findByRole('heading', { name: /your score/i })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/^Review scheduling could not be saved\.$/);
    expect(await repo.listRecords('results')).toHaveLength(1);
  });

  it('keeps the alert region mounted so a save error is announced', async () => {
    const { user } = await start();
    await answerAll(user, 'skip');
    await submit(user);
    await screen.findByRole('heading', { name: /your score/i });
    expect(screen.getByRole('alert')).toBeEmptyDOMElement();
  });

  it('moves focus to the results heading after submitting', async () => {
    const { user } = await start();
    await answerAll(user, 'skip');
    await submit(user);
    expect(await screen.findByRole('heading', { name: /your score/i })).toHaveFocus();
  });

  it('disables Start when assembly yields no questions', () => {
    const meta = listExams().find((m) => m.code === 'DA0-002')!;
    render(<ExamSetup meta={meta} plannedCount={0} onStart={() => {}} />);
    expect(screen.getByRole('button', { name: 'Start exam' })).toBeDisabled();
    expect(screen.getByText('No questions available for this exam yet.')).toBeInTheDocument();
  });

  it('warns that leaving ends the exam, and Start waits for I understand', async () => {
    const meta = listExams().find((m) => m.code === 'DA0-002')!;
    const user = userEvent.setup();
    const onStart = vi.fn();
    const { unmount } = render(<ExamSetup meta={meta} plannedCount={5} onStart={onStart} />);
    expect(
      screen.getByText(
        'Leaving the app ends this exam and scores it as it stands. That includes switching tabs or apps, locking your phone, and notifications or alarms that take over the screen. Silence notifications before you start.',
      ),
    ).toBeInTheDocument();
    const start = screen.getByRole('button', { name: 'Start exam' });
    expect(start).toBeDisabled();
    await user.click(screen.getByRole('checkbox', { name: 'I understand' }));
    expect(start).toBeEnabled();
    await user.click(start);
    expect(onStart).toHaveBeenCalledTimes(1);
    unmount();
    render(<ExamSetup meta={meta} plannedCount={5} onStart={onStart} />);
    expect(screen.getByRole('checkbox', { name: 'I understand' })).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Start exam' })).toBeDisabled();
  });

  it('leaving mid-exam saves the attempt and shows results with the left line', async () => {
    const { repo } = await start();
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    expect(await screen.findByRole('heading', { name: /your score/i })).toBeInTheDocument();
    expect(screen.getByText('Ended because you left the exam.')).toBeInTheDocument();
    expect(examResultSchema.parse((await repo.listRecords('results'))[0]).endedBy).toBe('left');
  });

  it('saves the mock as it goes, and clears the record once it is scored', async () => {
    const { user, repo } = await start();
    await waitFor(async () => expect((await loadInProgress(repo))?.exam.seed).toBe(5));
    expect((await loadInProgress(repo))?.responses).toEqual({});
    await answerCurrent(user, 'right');
    await waitFor(async () => expect(Object.keys((await loadInProgress(repo))?.responses ?? {})).toHaveLength(1));
    await answerAll(user, 'skip');
    await submit(user);
    expect(await screen.findByRole('heading', { name: /your score/i })).toBeInTheDocument();
    await waitFor(async () => expect(await loadInProgress(repo)).toBeNull());
  });

  it('closes a panel opened while the result was saving, so results never sit under a dialog', async () => {
    const repo = createMemoryRepo();
    let release = () => {};
    const put = repo.putRecord.bind(repo);
    repo.putRecord = (store, rec) =>
      store === 'results' ? new Promise<void>((ok) => (release = () => void put(store, rec).then(ok))) : put(store, rec);
    function OpenSettings() {
      const { open } = usePanels();
      return <button onClick={() => open('settings', null)}>open settings</button>;
    }
    const user = userEvent.setup();
    render(
      <WithPanels>
        <MockExamFlow repo={repo} examCode="DA0-002" seed={5} />
        <OpenSettings />
        <PanelProbe />
      </WithPanels>,
    );
    await user.click(await screen.findByRole('checkbox', { name: 'I understand' }));
    await user.click(screen.getByRole('button', { name: 'Start exam' }));
    await answerAll(user, 'skip');
    await submit(user);
    // The save is still running: the app header's Settings is live. Open it now.
    await user.click(screen.getByRole('button', { name: 'open settings' }));
    expect(screen.getByTestId('panel-probe')).toHaveAttribute('data-current', 'settings');
    release();
    expect(await screen.findByRole('heading', { name: /your score/i })).toBeInTheDocument();
    expect(screen.getByTestId('panel-probe')).toHaveAttribute('data-current', '');
  });

  it('opens on the results of a recovered mock', async () => {
    const repo = createMemoryRepo();
    await saveInProgress(repo, sampleMock());
    const got = (await recoverMock(repo))!;
    render(<MockExamFlow repo={repo} examCode="DA0-002" recovered={got.finished} />);
    expect(await screen.findByRole('heading', { name: /your score/i })).toBeInTheDocument();
    expect(screen.getByText('Ended because you left the exam.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start exam' })).not.toBeInTheDocument();
  });

  it('reads history to deprioritize recent questions', async () => {
    const repo = createMemoryRepo();
    const spy = vi.spyOn(repo, 'listRecords');
    render(<MockExamFlow repo={repo} examCode="DA0-002" seed={5} />);
    await screen.findByRole('button', { name: 'Start exam' });
    expect(spy).toHaveBeenCalledWith('results');
  });
});
