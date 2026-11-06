import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRepo } from '../../storage/memoryRepo';
import { examResultSchema } from '../../exam/result';
import { parseSrsRecords } from '../../study/srs';
import { recordCheck } from '../../study/lessonStatus';
import { TestNav } from '../testNav';
import { checkExam, LearnFlow } from './LearnFlow';

type User = ReturnType<typeof userEvent.setup>;
const LESSON = 'Fixture: percent change';

function setup(repo = createMemoryRepo(), lessonId?: string, onParent = () => {}) {
  const user = userEvent.setup();
  render(
    <TestNav onParent={onParent}>
      <LearnFlow repo={repo} examCode="DA0-002" lessonId={lessonId} />
    </TestNav>,
  );
  return { repo, user };
}

const statusOf = async (title: string) => (await screen.findByRole('button', { name: new RegExp(title) })).closest('li')!;

async function answerAllRight(user: User) {
  await user.type(screen.getByLabelText(/Visits rose from 40 to 50/), '25');
  await user.click(screen.getByRole('button', { name: 'Check answer' }));
  await user.click(screen.getByRole('button', { name: 'Next' }));
  await user.click(screen.getByLabelText('Primary key'));
  await user.click(screen.getByRole('button', { name: 'Check answer' }));
  await user.click(screen.getByRole('button', { name: 'Next' }));
  await user.click(screen.getByLabelText('Median'));
  await user.click(screen.getByLabelText('Mode'));
  await user.click(screen.getByRole('button', { name: 'Check answer' }));
  await user.click(screen.getByRole('button', { name: 'Finish' }));
}

describe('checkExam', () => {
  it('shuffles MCQ options by seed, so a retake is not a fixed layout', () => {
    const ids = ['da2-fx-num-001', 'da2-seed-001', 'da2-seed-002'];
    const layouts = new Set(Array.from({ length: 12 }, (_, s) => JSON.stringify(checkExam('DA0-002', ids, s + 1).items.map((i) => i.optionOrder))));
    expect(layouts.size).toBeGreaterThan(1);
    expect(checkExam('DA0-002', ids, 5)).toEqual(checkExam('DA0-002', ids, 5));
  });
});

describe('LearnFlow', () => {
  it('lists lessons under area headings with a status', async () => {
    setup();
    expect(await screen.findByRole('heading', { name: 'Learn: CompTIA Data+ (DA0-002)' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'A. Business math and percentages' })).toBeInTheDocument();
    expect(within(await statusOf(LESSON)).getByText('Not started')).toBeInTheDocument();
  });

  it('shows the four parts, a spoken formula and the check; opening marks it in progress', async () => {
    const { user } = setup();
    await user.click(await screen.findByRole('button', { name: new RegExp(LESSON) }));
    expect(await screen.findByRole('heading', { level: 2, name: LESSON })).toHaveFocus();
    for (const h of ['What it means', 'The formula', 'Worked example', 'Exam trap', 'Check your understanding']) {
      expect(screen.getByRole('heading', { level: 3, name: h })).toBeInTheDocument();
    }
    expect(screen.getByRole('math', { name: /new value minus old value, divided by old value, times 100/ })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Fixture steps' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '← Back to lessons' }));
    expect(within(await statusOf(LESSON)).getByText('In progress')).toBeInTheDocument();
  });

  it('a lesson check has no calculator or whiteboard', async () => {
    const { user } = setup();
    await user.click(await screen.findByRole('button', { name: new RegExp(LESSON) }));
    await user.click(await screen.findByRole('button', { name: 'Start the check (3 questions)' }));
    expect(await screen.findByRole('heading', { name: /^Item 1 of/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Calculator' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Whiteboard' })).not.toBeInTheDocument();
  });

  it('a full correct check saves a lesson result with reviews and marks the lesson done', async () => {
    const { repo, user } = setup();
    await user.click(await screen.findByRole('button', { name: new RegExp(LESSON) }));
    await user.click(await screen.findByRole('button', { name: 'Start the check (3 questions)' }));
    await answerAllRight(user);
    expect(await screen.findByRole('heading', { name: 'Lesson check complete: 100%' })).toBeInTheDocument();
    const [rec] = await repo.listRecords('results');
    expect(examResultSchema.parse(rec).mode).toBe('lesson');
    expect(parseSrsRecords(await repo.listRecords('srs')).map((r) => r.itemId).sort()).toEqual(['da2-fx-num-001', 'da2-seed-001', 'da2-seed-002']);
    await user.click(screen.getByRole('button', { name: '← Back to lesson' }));
    await user.click(await screen.findByRole('button', { name: '← Back to lessons' }));
    expect(within(await statusOf(LESSON)).getByText('Done')).toBeInTheDocument();
  });

  it('finishing after one right answer scores over all three and does not mark it done', async () => {
    const { repo, user } = setup();
    await user.click(await screen.findByRole('button', { name: new RegExp(LESSON) }));
    await user.click(await screen.findByRole('button', { name: /Start the check/ }));
    await user.type(screen.getByLabelText(/Visits rose/), '25');
    await user.click(screen.getByRole('button', { name: 'Check answer' }));
    await user.click(screen.getByRole('button', { name: 'Finish now' }));
    expect(await screen.findByRole('heading', { name: 'Lesson check complete: 33%' })).toBeInTheDocument();
    expect(examResultSchema.parse((await repo.listRecords('results'))[0]).questionIds).toEqual(['da2-fx-num-001']);
    await user.click(screen.getByRole('button', { name: '← Back to lesson' }));
    await user.click(await screen.findByRole('button', { name: '← Back to lessons' }));
    expect(within(await statusOf(LESSON)).getByText('In progress')).toBeInTheDocument();
  });

  it('shows Done for a stored passing score and a not-found message for an unknown lesson', async () => {
    const repo = createMemoryRepo();
    await recordCheck(repo, 'DA0-002', 'fx-percent-change', 0.9);
    setup(repo);
    expect(within(await statusOf(LESSON)).getByText('Done')).toBeInTheDocument();
  });

  it('an unknown lesson id says so and offers a way back', async () => {
    const { user } = setup(createMemoryRepo(), 'nope');
    expect(await screen.findByText('Lesson not found.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '← Back to lessons' }));
    expect(await screen.findByRole('heading', { name: /^Learn:/ })).toBeInTheDocument();
  });

  it('Back climbs check → lesson → list → exam page, and no in-screen back button remains', async () => {
    const onParent = vi.fn();
    const { user } = setup(createMemoryRepo(), undefined, onParent);
    await user.click(await screen.findByRole('button', { name: new RegExp(LESSON) }));
    await user.click(await screen.findByRole('button', { name: /Start the check/ }));
    expect(screen.getByRole('button', { name: '← Back to lesson' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '← Back to lesson' }));
    expect(await screen.findByRole('heading', { level: 2, name: LESSON })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^back to/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '← Back to lessons' }));
    expect(await screen.findByRole('heading', { name: /^Learn:/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^back to/i })).not.toBeInTheDocument();
    expect(onParent).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: '← Back' }));
    expect(onParent).toHaveBeenCalledTimes(1);
  });
});
