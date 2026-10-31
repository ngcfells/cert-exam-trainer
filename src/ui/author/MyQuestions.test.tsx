import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRepo } from '../../storage/memoryRepo';
import { userQ } from '../../storage/testFixtures';
import { PACK_FORMAT } from '../../storage/pack';
import { MyQuestions, packFileName } from './MyQuestions';
import { NOTICE_SETTING } from './ContentNotice';

afterEach(() => vi.restoreAllMocks());

function setup(repo = createMemoryRepo()) {
  const onEdit = vi.fn();
  render(<MyQuestions repo={repo} examCode="DA0-002" onEdit={onEdit} />);
  return { repo, onEdit, user: userEvent.setup() };
}

describe('MyQuestions', () => {
  it('notice gates add until accepted', async () => {
    const { repo, onEdit, user } = setup();
    await screen.findByText(/solely responsible/);
    expect(screen.queryByRole('button', { name: 'Add question' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Import questions (.json)')).not.toBeInTheDocument();
    const go = screen.getByRole('button', { name: 'Continue' });
    expect(go).toBeDisabled();
    await user.click(screen.getByRole('checkbox', { name: 'I understand' }));
    await user.click(go);
    await user.click(await screen.findByRole('button', { name: 'Add question' }));
    expect(onEdit).toHaveBeenCalledWith();
    expect(await repo.getSetting(NOTICE_SETTING)).toBe(true);
  });

  it('lists questions and edits one', async () => {
    const repo = createMemoryRepo();
    await repo.upsertUserQuestion(userQ('u1'));
    const { onEdit, user } = setup(repo);
    await user.click(await screen.findByRole('button', { name: 'Edit: Stem u1' }));
    expect(onEdit).toHaveBeenCalledWith('u1');
    expect(screen.getByRole('table')).toHaveTextContent('Multiple choice (one answer)');
  });

  it('delete removes after confirm', async () => {
    const repo = createMemoryRepo();
    await repo.upsertUserQuestion(userQ('u1'));
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    const { user } = setup(repo);
    const del = await screen.findByRole('button', { name: 'Delete: Stem u1' });
    await user.click(del);
    expect(await repo.getUserQuestions()).toHaveLength(1);
    await user.click(del);
    expect(await screen.findByText('Question deleted.')).toBeInTheDocument();
    expect(await repo.getUserQuestions()).toEqual([]);
    expect(confirm).toHaveBeenCalledTimes(2);
  });

  it('import reports imported and skipped', async () => {
    const repo = createMemoryRepo();
    await repo.setSetting(NOTICE_SETTING, true);
    const { user } = setup(repo);
    const json = JSON.stringify({ format: PACK_FORMAT, version: 1, questions: [userQ('u9'), userQ('da2-seed-001')] });
    await user.upload(await screen.findByLabelText('Import questions (.json)'), new File([json], 'p.json', { type: 'application/json' }));
    expect(await screen.findByText(/Imported 1 question\. Skipped 1: da2-seed-001/)).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Edit: Stem u9' })).toBeInTheDocument();
  });

  it('import errors are reported', async () => {
    const repo = createMemoryRepo();
    await repo.setSetting(NOTICE_SETTING, true);
    const { user } = setup(repo);
    await user.upload(await screen.findByLabelText('Import questions (.json)'), new File(['{'], 'p.json', { type: 'application/json' }));
    expect(await screen.findByText('Import failed: This file is not valid JSON.')).toBeInTheDocument();
  });

  it('names the export file by exam and date', () => {
    expect(packFileName('DA0-002', new Date(2026, 9, 30))).toBe('cert-exam-trainer-questions-DA0-002-2026-10-30.json');
  });
});
