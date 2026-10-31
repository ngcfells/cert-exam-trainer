import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Home } from './Home';
import { StorageBanner } from './StorageBanner';
import { createMemoryRepo } from '../storage/memoryRepo';
import { exportBackup } from '../storage/backup';
import { userQ } from '../storage/testFixtures';

afterEach(() => vi.unstubAllEnvs());

describe('Home', () => {
  it('shows the Data+ row with bundled and user counts', async () => {
    vi.stubEnv('DEV', false);
    render(<Home repo={createMemoryRepo()} persistent />);
    const row = (await screen.findByText('CompTIA Data+ (DA0-002)')).closest('li')!;
    expect(within(row).getByText('11 questions (ours)')).toBeInTheDocument();
    expect(await within(row).findByText('0 questions (mine)')).toBeInTheDocument();
  });

  it('toggle persists', async () => {
    const user = userEvent.setup();
    const repo = createMemoryRepo();
    render(<Home repo={repo} persistent />);
    expect(await screen.findByRole('radio', { name: 'Both' })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: 'Mine' }));
    expect(await repo.getSetting('sourceFilter')).toBe('mine');
  });

  it('offers mock exam, practice, cram and progress for each exam', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(<Home repo={createMemoryRepo()} persistent onNavigate={onNavigate} />);
    for (const [name, screenName] of [
      ['Start mock exam: DA0-002', 'mock'],
      ['Practice: DA0-002', 'practice'],
      ['Cram: DA0-002', 'cram'],
      ['Progress: DA0-002', 'progress'],
      ['My questions: DA0-002', 'questions'],
      ['Acronyms: DA0-002', 'acronyms'],
      ['Learn: DA0-002', 'learn'],
    ] as const) {
      await user.click(screen.getByRole('button', { name }));
      expect(onNavigate).toHaveBeenLastCalledWith({ name: screenName, exam: 'DA0-002' });
    }
  });

  it('shows the storage banner only when not persistent', async () => {
    const { rerender } = render(<StorageBanner persistent />);
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    rerender(<StorageBanner persistent={false} />);
    expect(await screen.findByRole('status')).toHaveTextContent("Progress won't be saved in this browser session.");
  });

  it('announces an import error in the live region', async () => {
    const user = userEvent.setup();
    render(<Home repo={createMemoryRepo()} persistent />);
    const file = new File(['{not json'], 'bad.json', { type: 'application/json' });
    await user.upload(screen.getByLabelText(/import backup/i, { selector: 'input[type=file]' }), file);
    expect(await screen.findByText(/not valid JSON/i)).toBeInTheDocument();
    expect(screen.getByText(/not valid JSON/i).closest('[aria-live="polite"]')).not.toBeNull();
  });

  it('updates the mine count after a successful import', async () => {
    const user = userEvent.setup();
    const source = createMemoryRepo();
    await source.upsertUserQuestion(userQ('u1'));
    const json = JSON.stringify(await exportBackup(source));
    render(<Home repo={createMemoryRepo()} persistent />);
    await user.upload(screen.getByLabelText(/import backup/i, { selector: 'input[type=file]' }), new File([json], 'b.json', { type: 'application/json' }));
    expect(await screen.findByText('1 question (mine)')).toBeInTheDocument();
    expect(screen.getByText(/imported 1 question/i)).toBeInTheDocument();
  });
});
