import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRepo } from '../../storage/memoryRepo';
import { userQ } from '../../storage/testFixtures';
import { JSON_STARTERS } from '../../authoring/starters';
import { LeaveGuardProvider, LeaveGuards } from '../nav';
import { QuestionEditor } from './QuestionEditor';

afterEach(() => vi.restoreAllMocks());

function setup(id?: string, repo = createMemoryRepo()) {
  const onDone = vi.fn();
  render(<QuestionEditor repo={repo} examCode="DA0-002" id={id} onDone={onDone} />);
  return { repo, onDone, user: userEvent.setup() };
}

const save = () => screen.getByRole('button', { name: 'Save question' });

describe('QuestionEditor', () => {
  it('mcq save round-trips', async () => {
    const { repo, onDone, user } = setup();
    await user.type(screen.getByLabelText('Question text'), 'Which is a key?');
    for (const [i, t] of ['Primary key', 'Color', 'Font', 'Sound'].entries()) await user.type(screen.getByLabelText(`Option ${i + 1}`), t);
    await user.click(screen.getByLabelText('Option 1 is correct'));
    expect(within(screen.getByRole('region', { name: 'Preview' })).getByText('Which is a key?')).toBeInTheDocument();
    await user.click(save());
    const [q] = await repo.getUserQuestions('DA0-002');
    expect(q).toMatchObject({
      source: 'user', type: 'mcq-single', stem: 'Which is a key?', objectiveIds: ['1.1'],
      answer: { correct: ['a'] }, payload: { options: [{ id: 'a', text: 'Primary key' }, { id: 'b', text: 'Color' }, { id: 'c', text: 'Font' }, { id: 'd', text: 'Sound' }] },
    });
    expect(q.id).toMatch(/^user-/);
    expect(onDone).toHaveBeenCalled();
  });

  it('errors appear only after a save attempt, focus the summary and link to fields', async () => {
    const { repo, user } = setup();
    expect(screen.queryByText('Enter the question text.')).not.toBeInTheDocument();
    await user.click(save());
    const summary = screen.getByRole('group', { name: /problems to fix before saving/ });
    await vi.waitFor(() => expect(summary).toHaveFocus());
    expect(await repo.getUserQuestions()).toEqual([]);
    const stem = screen.getByLabelText('Question text');
    expect(stem).toHaveAttribute('aria-invalid', 'true');
    expect(stem).toHaveAccessibleDescription('Enter the question text.');
    await user.click(within(summary).getByRole('link', { name: 'Enter the question text.' }));
    expect(stem).toHaveFocus();
    expect(screen.getByLabelText('Option 1')).toHaveAccessibleDescription('Option 1 needs text.');
    expect(within(summary).getByRole('link', { name: 'Mark the correct answer.' })).toBeInTheDocument();
  });

  it('add and remove options', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Add option' }));
    expect(screen.getByLabelText('Option 5')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove option 1' }));
    expect(screen.queryByLabelText('Option 5')).not.toBeInTheDocument();
  });

  it('switching type loads that starter', async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText('Question text'), 'Sort these.');
    await user.selectOptions(screen.getByLabelText('Question type'), 'pbq-buckets');
    expect(JSON.parse((screen.getByLabelText('Payload (JSON)') as HTMLTextAreaElement).value)).toEqual(JSON_STARTERS['pbq-buckets'].payload);
    expect(screen.queryByLabelText('Option 1')).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Question type'), 'pbq-order');
    expect(JSON.parse((screen.getByLabelText('Answer (JSON)') as HTMLTextAreaElement).value)).toEqual(JSON_STARTERS['pbq-order'].answer);
    expect(within(screen.getByRole('region', { name: 'Preview' })).getByText('Sort these.')).toBeInTheDocument();
  });

  it('numeric uses the JSON starter, has no PBQ weight and saves', async () => {
    const { repo, user } = setup();
    await user.type(screen.getByLabelText('Question text'), 'What is 5 of 20, as a percent?');
    await user.selectOptions(screen.getByLabelText('Question type'), 'numeric');
    expect(JSON.parse((screen.getByLabelText('Answer (JSON)') as HTMLTextAreaElement).value)).toEqual(JSON_STARTERS.numeric.answer);
    expect(screen.queryByLabelText(/PBQ weight/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Part explanations/)).not.toBeInTheDocument();
    await user.click(save());
    const [q] = await repo.getUserQuestions('DA0-002');
    expect(q).toMatchObject({ type: 'numeric', answer: { value: 25, tolerance: 0.5 } });
    expect(q.pbqWeight).toBeUndefined();
  });

  it('a negative numeric tolerance is linked to the answer editor', async () => {
    const { repo, user } = setup();
    await user.type(screen.getByLabelText('Question text'), 'Q');
    await user.selectOptions(screen.getByLabelText('Question type'), 'numeric');
    const answer = screen.getByLabelText('Answer (JSON)');
    await user.clear(answer);
    await user.type(answer, '{{"value":1,"tolerance":-1}');
    await user.click(save());
    expect(answer).toHaveAccessibleDescription(/answer\.tolerance/);
    expect(await repo.getUserQuestions()).toEqual([]);
  });

  it('switching back to a template restores its edited JSON', async () => {
    const { user } = setup();
    await user.selectOptions(screen.getByLabelText('Question type'), 'pbq-config');
    const payload = screen.getByLabelText('Payload (JSON)');
    await user.clear(payload);
    await user.type(payload, '{{"edited": true}');
    await user.selectOptions(screen.getByLabelText('Question type'), 'mcq-single');
    await user.selectOptions(screen.getByLabelText('Question type'), 'pbq-config');
    expect(screen.getByLabelText('Payload (JSON)')).toHaveValue('{"edited": true}');
  });

  it('invalid json blocks save and shows the error on the field', async () => {
    const { repo, user } = setup();
    await user.type(screen.getByLabelText('Question text'), 'Q');
    await user.selectOptions(screen.getByLabelText('Question type'), 'pbq-config');
    const payload = screen.getByLabelText('Payload (JSON)');
    await user.clear(payload);
    await user.type(payload, '{{nope');
    expect(screen.queryByRole('region', { name: 'Preview' })).not.toBeInTheDocument();
    await user.click(save());
    expect(payload).toHaveAccessibleDescription(/Payload is not valid JSON/);
    expect(await repo.getUserQuestions()).toEqual([]);
  });

  it('schema errors in pbq data are listed by path', async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText('Question text'), 'Q');
    await user.selectOptions(screen.getByLabelText('Question type'), 'pbq-config');
    const answer = screen.getByLabelText('Answer (JSON)');
    await user.clear(answer);
    await user.type(answer, '{{"values":{{"f1":"zz"}}');
    await user.click(save());
    expect(answer).toHaveAccessibleDescription(/"zz" is not a value for part "f1"/);
  });

  it('preview answers survive explanation edits', async () => {
    const repo = createMemoryRepo();
    await repo.upsertUserQuestion(userQ('u1'));
    const { user } = setup('u1', repo);
    const preview = await screen.findByRole('region', { name: 'Preview' });
    await user.click(within(preview).getByLabelText('A'));
    await user.type(screen.getByLabelText('Explanation'), 'More');
    expect(within(preview).getByLabelText('A')).toBeChecked();
  });

  it('edit loads existing question', async () => {
    const repo = createMemoryRepo();
    await repo.upsertUserQuestion(userQ('u1'));
    const { onDone, user } = setup('u1', repo);
    const stem = await screen.findByLabelText('Question text');
    expect(stem).toHaveValue('Stem u1');
    await user.clear(stem);
    await user.type(stem, 'Changed');
    await user.click(save());
    expect(await repo.getUserQuestions()).toEqual([{ ...userQ('u1'), stem: 'Changed' }]);
    expect(onDone).toHaveBeenCalled();
  });

  it('cancel asks before discarding changes', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    const { onDone, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(confirm).not.toHaveBeenCalled();
    expect(onDone).toHaveBeenCalledTimes(1);
    await user.type(screen.getByLabelText('Question text'), 'x');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onDone).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onDone).toHaveBeenCalledTimes(2);
  });

  it('guards leaving the app screen only while there are unsaved changes', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const guards = new LeaveGuards();
    const user = userEvent.setup();
    render(
      <LeaveGuardProvider guards={guards}>
        <QuestionEditor repo={createMemoryRepo()} examCode="DA0-002" onDone={vi.fn()} />
      </LeaveGuardProvider>,
    );
    expect(guards.confirmLeave()).toBe(true);
    await user.type(screen.getByLabelText('Question text'), 'x');
    expect(guards.confirmLeave()).toBe(false);
    expect(confirm).toHaveBeenCalledWith('Discard your changes to this question?');
  });

  it('missing id shows a load error', async () => {
    setup('nope');
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load your data.');
  });
});
