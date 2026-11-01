import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRepo } from '../../storage/memoryRepo';
import { userQ } from '../../storage/testFixtures';
import { JSON_STARTERS } from '../../authoring/starters';
import { LeaveGuards } from '../nav';
import { LeaveGuardProvider } from '../testNav';
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

  describe('how many to pick', () => {
    const multiQ = (correct: string[], pick?: number | 'all') => ({
      ...userQ('m1'),
      type: 'mcq-multi' as const,
      stem: 'Which apply?',
      payload: { options: ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id, text: id.toUpperCase() })) },
      answer: { correct },
      ...(pick === undefined ? {} : { pick }),
    });
    const pickControl = () => screen.getByLabelText('How many to pick') as HTMLSelectElement;
    const shownOptions = () => [...pickControl().options].map((o) => o.text);

    async function newMulti(user: ReturnType<typeof userEvent.setup>, marked: number[]) {
      await user.type(screen.getByLabelText('Question text'), 'Which apply?');
      for (const [i, t] of ['A', 'B', 'C', 'D'].entries()) await user.type(screen.getByLabelText(`Option ${i + 1}`), t);
      await user.selectOptions(screen.getByLabelText('Question type'), 'mcq-multi');
      for (const i of marked) await user.click(screen.getByLabelText(`Option ${i} is correct`));
    }

    it('labels the type and offers only two, three and all', async () => {
      const { user } = setup();
      expect(screen.queryByLabelText('How many to pick')).not.toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Multiple choice (more than one answer)' })).toBeInTheDocument();
      await user.selectOptions(screen.getByLabelText('Question type'), 'mcq-multi');
      expect(shownOptions()).toEqual(['Select two', 'Select three', 'Select all that apply']);
      expect(pickControl()).toHaveDisplayValue('Select two');
    });

    it('saves select two with two correct answers', async () => {
      const { repo, user } = setup();
      await newMulti(user, [1, 3]);
      await user.click(save());
      expect((await repo.getUserQuestions())[0]).toMatchObject({ type: 'mcq-multi', pick: 2, answer: { correct: ['a', 'c'] } });
    });

    it('a mismatch blocks save with an error on the correct answers, and the control does not change itself', async () => {
      const { repo, user } = setup();
      await newMulti(user, [1, 2, 3]);
      expect(pickControl()).toHaveDisplayValue('Select two');
      await user.click(save());
      expect(await repo.getUserQuestions()).toEqual([]);
      const summary = screen.getByRole('group', { name: /to fix before saving/ });
      expect(within(summary).getByRole('link', { name: 'Select two needs exactly 2 correct answers.' })).toBeInTheDocument();
      expect(screen.getByRole('group', { name: 'Options' })).toHaveAccessibleDescription(/Select two needs exactly 2 correct answers\./);
      await user.selectOptions(pickControl(), 'Select three');
      await user.click(save());
      expect((await repo.getUserQuestions())[0]).toMatchObject({ pick: 3 });
    });

    it('select all saves as all', async () => {
      const { repo, user } = setup();
      await newMulti(user, [1, 2]);
      await user.selectOptions(pickControl(), 'Select all that apply');
      await user.click(save());
      expect((await repo.getUserQuestions())[0]).toMatchObject({ pick: 'all' });
    });

    it.each([
      [['a', 'c', 'e'], undefined, 'Select three', 3],
      [['a', 'b', 'c', 'd'], undefined, 'Select all that apply', 'all'],
      [['a', 'c'], 'all', 'Select all that apply', 'all'],
    ] as const)('an existing question with %j (pick %s) shows %s and saves %s', async (correct, pick, shown, saved) => {
      const repo = createMemoryRepo();
      await repo.upsertUserQuestion(multiQ([...correct], pick));
      const { user } = setup('m1', repo);
      await screen.findByLabelText('Question text');
      expect(pickControl()).toHaveDisplayValue(shown);
      await user.click(save());
      expect((await repo.getUserQuestions())[0]).toMatchObject({ pick: saved });
    });

    it('changing the pick clears the preview answers', async () => {
      const repo = createMemoryRepo();
      await repo.upsertUserQuestion(multiQ(['a', 'c'], 'all'));
      const { user } = setup('m1', repo);
      const preview = await screen.findByRole('region', { name: 'Preview' });
      for (const t of ['A', 'B', 'D']) await user.click(within(preview).getByLabelText(t));
      await user.selectOptions(pickControl(), 'Select two');
      expect(within(preview).getByLabelText('A')).not.toBeChecked();
      expect(within(preview).getByLabelText('B')).toBeEnabled();
    });

    it('multi to single drops pick', async () => {
      const repo = createMemoryRepo();
      await repo.upsertUserQuestion(multiQ(['a', 'c'], 2));
      const { user } = setup('m1', repo);
      await user.selectOptions(await screen.findByLabelText('Question type'), 'mcq-single');
      await user.click(save());
      const [q] = await repo.getUserQuestions();
      expect(q.type).toBe('mcq-single');
      expect(q).not.toHaveProperty('pick');
    });
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
