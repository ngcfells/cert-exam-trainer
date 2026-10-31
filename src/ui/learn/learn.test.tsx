import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRepo } from '../../storage/memoryRepo';
import { examResultSchema } from '../../exam/result';
import { parseSrsRecords } from '../../study/srs';
import { recordCheck } from '../../study/lessonStatus';
import { LearnFlow } from './LearnFlow';

type User = ReturnType<typeof userEvent.setup>;
const LESSON = 'Fixture: percent change';

function setup(repo = createMemoryRepo(), lessonId?: string) {
  const user = userEvent.setup();
  render(<LearnFlow repo={repo} examCode="DA0-002" lessonId={lessonId} onExit={() => {}} />);
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
    await user.click(screen.getByRole('button', { name: 'Back to lessons' }));
    expect(within(await statusOf(LESSON)).getByText('In progress')).toBeInTheDocument();
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
    await user.click(screen.getByRole('button', { name: 'Back to lesson' }));
    await user.click(await screen.findByRole('button', { name: 'Back to lessons' }));
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
    await user.click(screen.getByRole('button', { name: 'Back to lesson' }));
    await user.click(await screen.findByRole('button', { name: 'Back to lessons' }));
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
    await user.click(screen.getByRole('button', { name: 'Back to lessons' }));
    expect(await screen.findByRole('heading', { name: /^Learn:/ })).toBeInTheDocument();
  });
});
