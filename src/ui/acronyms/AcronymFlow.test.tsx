import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { saveUserAcronym } from '../../acronyms/userList';
import { listExams } from '../../banks';
import { SOURCE_SETTING } from '../../banks/pool';
import { createMemoryRepo } from '../../storage/memoryRepo';
import { userQ } from '../../storage/testFixtures';
import { review } from '../../study/srs';
import { AcronymFlow } from './AcronymFlow';

const EXAM = 'DA0-002';

async function repoWith(filter: string, mine: [string, string][] = []) {
  const repo = createMemoryRepo();
  await repo.setSetting(SOURCE_SETTING, filter);
  for (const [t, x] of mine) await saveUserAcronym(repo, EXAM, t, x);
  return repo;
}

describe('AcronymFlow setup', () => {
  it('empty list shows message', async () => {
    render(<AcronymFlow repo={await repoWith('mine')} examCode={EXAM} />);
    expect(await screen.findByText('No acronyms for this exam with the current source setting.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start' })).toBeNull();
  });

  it('choose is disabled with one entry', async () => {
    const user = userEvent.setup();
    render(<AcronymFlow repo={await repoWith('mine', [['ARR', 'Annual Recurring Revenue']])} examCode={EXAM} />);
    await user.click(await screen.findByRole('radio', { name: 'Quiz' }));
    expect(screen.getByRole('radio', { name: 'Choose' })).toBeDisabled();
    expect(screen.getByRole('radio', { name: 'Type it' })).toBeChecked();
    expect(screen.getByText(/needs at least 2 acronyms/)).toBeInTheDocument();
  });

  it('nothing due suggests all', async () => {
    const user = userEvent.setup();
    const repo = await repoWith('ours');
    const now = new Date();
    for (const a of listExams().find((m) => m.code === EXAM)!.acronyms) {
      await repo.putRecord('srs', review(undefined, { exam: EXAM, kind: 'acronym', itemId: a.term, quality: 5 }, now));
    }
    render(<AcronymFlow repo={repo} examCode={EXAM} />);
    expect(await screen.findByText('Nothing due. Choose "All" to study every card.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled();
    await user.click(screen.getByRole('radio', { name: 'All' }));
    expect(screen.getByRole('button', { name: 'Start' })).toBeEnabled();
  });

  it('shows counts and the full list', async () => {
    render(<AcronymFlow repo={await repoWith('ours')} examCode={EXAM} />);
    expect(await screen.findByText(`${listExams().find((m) => m.code === EXAM)!.acronyms.length} acronyms, 0 due for review`)).toBeInTheDocument();
    const table = screen.getByRole('table', { name: /full list/i });
    expect(within(table).getByRole('cell', { name: 'Structured Query Language' })).toBeInTheDocument();
  });

  it('my acronyms saves and lists a term found in my questions', async () => {
    const user = userEvent.setup();
    const repo = createMemoryRepo();
    await repo.upsertUserQuestion({ ...userQ('u1'), stem: 'Which ARR matters most?' });
    render(<AcronymFlow repo={repo} examCode={EXAM} />);
    const found = await screen.findByRole('region', { name: 'My acronyms' });
    await user.click(within(found).getByRole('button', { name: 'Add ARR' }));
    expect(screen.getByRole('textbox', { name: 'Acronym' })).toHaveValue('ARR');
    await user.type(screen.getByRole('textbox', { name: 'Meaning' }), 'Annual Recurring Revenue');
    await user.click(screen.getByRole('button', { name: 'Save acronym' }));
    expect(await screen.findByText('Saved ARR.')).toBeInTheDocument();
    expect(within(found).getByRole('cell', { name: 'Annual Recurring Revenue' })).toBeInTheDocument();
    expect(within(found).queryByRole('button', { name: 'Add ARR' })).toBeNull();
  });

  it('my acronyms shows a save error and deletes after confirm', async () => {
    const user = userEvent.setup();
    const repo = await repoWith('both', [['ARR', 'Annual Recurring Revenue']]);
    render(<AcronymFlow repo={repo} examCode={EXAM} />);
    const mine = await screen.findByRole('region', { name: 'My acronyms' });
    await user.type(screen.getByRole('textbox', { name: 'Acronym' }), 'sql');
    await user.type(screen.getByRole('textbox', { name: 'Meaning' }), 'x');
    await user.click(screen.getByRole('button', { name: 'Save acronym' }));
    expect(await screen.findByText('SQL is already in the stock list (shown when questions use Stock).')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Acronym' })).toHaveAttribute('aria-invalid', 'true');
    await user.click(within(mine).getByRole('button', { name: 'Edit ARR' }));
    const term = screen.getByRole('textbox', { name: 'Acronym' });
    await user.clear(term);
    await user.type(term, 'ARRS');
    await user.click(screen.getByRole('button', { name: 'Save acronym' }));
    expect(await within(mine).findByRole('rowheader', { name: 'ARRS' })).toBeInTheDocument();
    expect(within(mine).queryByRole('rowheader', { name: 'ARR' })).toBeNull();
    await user.click(within(mine).getByRole('button', { name: 'Edit ARRS' }));
    await user.clear(term);
    await user.type(term, 'ARR');
    await user.click(screen.getByRole('button', { name: 'Save acronym' }));
    await within(mine).findByRole('rowheader', { name: 'ARR' });
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true);
    await user.click(within(mine).getByRole('button', { name: 'Delete ARR' }));
    expect(await screen.findByText('Deleted ARR.')).toBeInTheDocument();
  });
});
