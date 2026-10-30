import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockExamFlow } from './MockExamFlow';
import { ExamSetup } from './ExamSetup';
import { listExams } from '../../banks';
import { Home } from '../Home';
import { createMemoryRepo } from '../../storage/memoryRepo';
import { dataPlusQuestions } from '../../banks/dataplus/questions';
import { examResultSchema } from '../../exam/result';
import type { McqAnswer, McqPayload } from '../../domain/types';
import type { Repo } from '../../storage';

beforeEach(() => vi.stubEnv('DEV', false));
afterEach(() => vi.unstubAllEnvs());

const optionText = (id: string, which: 'right' | 'wrong') => {
  const q = dataPlusQuestions.find((x) => x.id === id)!;
  const correct = (q.answer as McqAnswer).correct;
  const opts = (q.payload as McqPayload).options;
  return opts.find((o) => (which === 'right' ? correct.includes(o.id) : !correct.includes(o.id)))!.text;
};

async function answerCurrent(user: ReturnType<typeof userEvent.setup>, which: 'right' | 'wrong') {
  const stem = screen.getByRole('group').querySelector('legend')!.textContent!;
  const q = dataPlusQuestions.find((x) => x.stem === stem)!;
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
  render(<MockExamFlow repo={repo} examCode="DA0-002" seed={5} onExit={() => {}} />);
  await user.click(await screen.findByRole('button', { name: 'Start exam' }));
  return { user, repo };
}

async function submit(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Submit exam' }));
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Submit' }));
}

describe('MockExamFlow', () => {
  it('starts from Home and shows the short-bank notice', async () => {
    const user = userEvent.setup();
    const onStartExam = vi.fn();
    render(<Home repo={createMemoryRepo()} persistent onStartExam={onStartExam} />);
    await user.click(await screen.findByRole('button', { name: /start mock exam/i }));
    expect(onStartExam).toHaveBeenCalledWith('DA0-002');

    render(<MockExamFlow repo={createMemoryRepo()} examCode="DA0-002" seed={5} onExit={() => {}} />);
    expect(await screen.findByText(/2 questions/)).toBeInTheDocument();
    expect(screen.getByText(/shorter than the real one \(90\)/)).toBeInTheDocument();
  });

  it('scores a perfect run and saves the result', async () => {
    const { user, repo } = await start();
    await answerCurrent(user, 'right');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await answerCurrent(user, 'right');
    await user.click(screen.getByRole('button', { name: 'Review' }));
    await submit(user);
    expect(await screen.findByRole('heading', { name: 'Your score: 900 / 900' })).toBeInTheDocument();
    expect(screen.getByText('PASS')).toBeInTheDocument();
    const recs = await repo.listRecords('results');
    expect(recs).toHaveLength(1);
    expect(examResultSchema.parse(recs[0]).seed).toBe(5);
  });

  it('reviews wrong and unanswered items with explanations', async () => {
    const { user } = await start();
    await answerCurrent(user, 'wrong');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Review' }));
    await submit(user);
    expect(await screen.findByText('FAIL')).toBeInTheDocument();
    expect(screen.getByText('Not answered')).toBeInTheDocument();
    for (const id of ['da2-seed-001', 'da2-seed-002']) {
      expect(screen.getByText(dataPlusQuestions.find((q) => q.id === id)!.explanation)).toBeInTheDocument();
    }
  });

  it('still shows results when saving fails', async () => {
    const repo = createMemoryRepo();
    repo.putRecord = () => Promise.reject(new Error('quota'));
    const { user } = await start(repo);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Review' }));
    await submit(user);
    expect(await screen.findByRole('heading', { name: /your score/i })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Your result could not be saved to history.');
  });

  it('keeps the alert region mounted so a save error is announced', async () => {
    const { user } = await start();
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Review' }));
    await submit(user);
    await screen.findByRole('heading', { name: /your score/i });
    expect(screen.getByRole('alert')).toBeEmptyDOMElement();
  });

  it('moves focus to the results heading after submitting', async () => {
    const { user } = await start();
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Review' }));
    await submit(user);
    expect(await screen.findByRole('heading', { name: /your score/i })).toHaveFocus();
  });

  it('disables Start when assembly yields no questions', () => {
    const meta = listExams()[0];
    render(<ExamSetup meta={meta} plannedCount={0} onStart={() => {}} onCancel={() => {}} />);
    expect(screen.getByRole('button', { name: 'Start exam' })).toBeDisabled();
    expect(screen.getByText('No questions available for this exam yet.')).toBeInTheDocument();
  });

  it('reads history to deprioritize recent questions', async () => {
    const repo = createMemoryRepo();
    const spy = vi.spyOn(repo, 'listRecords');
    render(<MockExamFlow repo={repo} examCode="DA0-002" seed={5} onExit={() => {}} />);
    await screen.findByRole('button', { name: 'Start exam' });
    expect(spy).toHaveBeenCalledWith('results');
  });
});
