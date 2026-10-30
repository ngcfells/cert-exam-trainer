import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRepo } from '../../storage/memoryRepo';
import { userQ } from '../../storage/testFixtures';
import { PBQ_STARTERS } from '../../authoring/starters';
import { QuestionEditor } from './QuestionEditor';

function setup(id?: string, repo = createMemoryRepo()) {
  const onDone = vi.fn();
  render(<QuestionEditor repo={repo} examCode="DA0-002" id={id} onDone={onDone} />);
  return { repo, onDone, user: userEvent.setup() };
}

describe('QuestionEditor', () => {
  it('mcq save round-trips', async () => {
    const { repo, onDone, user } = setup();
    const save = screen.getByRole('button', { name: 'Save question' });
    expect(save).toBeDisabled();
    expect(screen.getByText('Enter the question text.')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Question text'), 'Which is a key?');
    for (const [i, t] of ['Primary key', 'Color', 'Font', 'Sound'].entries()) await user.type(screen.getByLabelText(`Option ${i + 1}`), t);
    expect(screen.getByText('Mark the correct answer.')).toBeInTheDocument();
    await user.click(screen.getByLabelText('Option 1 is correct'));
    expect(screen.getByText('Ready to save.')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Preview' })).getByText('Which is a key?')).toBeInTheDocument();
    await user.click(save);
    const [q] = await repo.getUserQuestions('DA0-002');
    expect(q).toMatchObject({
      source: 'user', type: 'mcq-single', stem: 'Which is a key?', objectiveIds: ['1.1'],
      answer: { correct: ['a'] }, payload: { options: [{ id: 'a', text: 'Primary key' }, { id: 'b', text: 'Color' }, { id: 'c', text: 'Font' }, { id: 'd', text: 'Sound' }] },
    });
    expect(q.id).toMatch(/^user-/);
    expect(onDone).toHaveBeenCalled();
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
    expect(JSON.parse((screen.getByLabelText('Payload (JSON)') as HTMLTextAreaElement).value)).toEqual(PBQ_STARTERS['pbq-buckets'].payload);
    expect(screen.queryByLabelText('Option 1')).not.toBeInTheDocument();
    expect(screen.getByText('Ready to save.')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Question type'), 'pbq-order');
    expect(JSON.parse((screen.getByLabelText('Answer (JSON)') as HTMLTextAreaElement).value)).toEqual(PBQ_STARTERS['pbq-order'].answer);
    expect(within(screen.getByRole('region', { name: 'Preview' })).getByText('Sort these.')).toBeInTheDocument();
  });

  it('invalid json shows error and disables save', async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText('Question text'), 'Q');
    await user.selectOptions(screen.getByLabelText('Question type'), 'pbq-config');
    const payload = screen.getByLabelText('Payload (JSON)');
    await user.clear(payload);
    await user.type(payload, '{{nope');
    expect(screen.getByText(/Payload is not valid JSON/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save question' })).toBeDisabled();
    expect(screen.queryByRole('region', { name: 'Preview' })).not.toBeInTheDocument();
  });

  it('schema errors in pbq data are listed by path', async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText('Question text'), 'Q');
    await user.selectOptions(screen.getByLabelText('Question type'), 'pbq-config');
    const answer = screen.getByLabelText('Answer (JSON)');
    await user.clear(answer);
    await user.type(answer, '{{"values":{{"f1":"zz"}}');
    expect(screen.getByText(/"zz" is not a value for part "f1"/)).toBeInTheDocument();
  });

  it('edit loads existing question', async () => {
    const repo = createMemoryRepo();
    await repo.upsertUserQuestion(userQ('u1'));
    const { onDone, user } = setup('u1', repo);
    const stem = await screen.findByLabelText('Question text');
    expect(stem).toHaveValue('Stem u1');
    await user.clear(stem);
    await user.type(stem, 'Changed');
    await user.click(screen.getByRole('button', { name: 'Save question' }));
    expect(await repo.getUserQuestions()).toEqual([{ ...userQ('u1'), stem: 'Changed' }]);
    expect(onDone).toHaveBeenCalled();
  });

  it('missing id shows a load error', async () => {
    setup('nope');
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load your data.');
  });
});
