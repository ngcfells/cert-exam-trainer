import { describe, it, expect, vi, afterEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BackupControls } from './BackupControls';
import { StorageBanner } from './StorageBanner';
import { createMemoryRepo } from '../storage/memoryRepo';
import { exportBackup } from '../storage/backup';
import { userQ } from '../storage/testFixtures';

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('BackupControls', () => {
  it('revokes the download URL only after the click has been handled', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:x');
    const revoke = (URL.revokeObjectURL = vi.fn());
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<BackupControls repo={createMemoryRepo()} onImported={() => {}} />);
    vi.useFakeTimers({ toFake: ['setTimeout'] });
    fireEvent.click(screen.getByRole('button', { name: 'Export backup' }));
    for (let i = 0; i < 50 && click.mock.calls.length === 0; i++) await Promise.resolve();
    expect(click).toHaveBeenCalled();
    expect(revoke).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(revoke).toHaveBeenCalledWith('blob:x');
  });

  it('reports an export failure', async () => {
    const repo = createMemoryRepo();
    repo.listSettings = () => Promise.reject(new Error('boom'));
    render(<BackupControls repo={repo} onImported={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: 'Export backup' }));
    expect(await screen.findByText('Export failed. Please try again.')).toBeInTheDocument();
  });

  it('hides raw errors on unexpected import failures', async () => {
    const repo = createMemoryRepo();
    repo.listRecords = () => Promise.reject(new Error('secret internals'));
    const source = createMemoryRepo();
    await source.upsertUserQuestion(userQ('u1'));
    const json = JSON.stringify(await exportBackup(source));
    render(<BackupControls repo={repo} onImported={() => {}} />);
    await userEvent.upload(screen.getByLabelText(/import backup/i, { selector: 'input[type=file]' }), new File([json], 'b.json'));
    expect(await screen.findByText('Import failed: something went wrong reading the file.')).toBeInTheDocument();
  });

  it('warns about replace and asks for confirmation', async () => {
    const repo = createMemoryRepo();
    await repo.upsertUserQuestion(userQ('keep'));
    const json = JSON.stringify(await exportBackup(createMemoryRepo()));
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<BackupControls repo={repo} onImported={() => {}} />);
    await userEvent.click(screen.getByLabelText('Replace my data'));
    expect(screen.getByText('Replace deletes all your questions, settings and history first.')).toBeInTheDocument();
    await userEvent.upload(screen.getByLabelText(/import backup/i, { selector: 'input[type=file]' }), new File([json], 'b.json'));
    expect(confirm).toHaveBeenCalled();
    expect((await repo.getUserQuestions()).map((q) => q.id)).toEqual(['keep']);
  });
});

describe('StorageBanner', () => {
  it('keeps an empty live region mounted so later messages are announced', async () => {
    const { rerender } = render(<StorageBanner persistent />);
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    rerender(<StorageBanner persistent={false} />);
    expect(await screen.findByText("Progress won't be saved in this browser session.")).toBeInTheDocument();
  });
});
