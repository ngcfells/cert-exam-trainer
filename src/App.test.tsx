import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRepo } from './storage/memoryRepo';
import { LEAVE_MOCK } from './ui/nav';
import App from './App';
import type { Repo } from './storage';
import { loadInProgress, saveInProgress } from './exam/inProgress';
import { sampleMock } from './exam/testMock';

// A test may set `next.repo` to open the app on data it prepared; otherwise each render gets an empty repo.
const next = vi.hoisted(() => ({ repo: null as Repo | null }));
vi.mock('./storage', async (orig) => ({
  ...(await orig<typeof import('./storage')>()),
  openRepo: async () => {
    const repo = next.repo ?? createMemoryRepo();
    next.repo = null;
    return { repo, persistent: true };
  },
}));

afterEach(() => {
  vi.restoreAllMocks();
  window.history.replaceState(null, '');
});

describe('App Settings panel', () => {
  it('opens Settings over an exam page without losing what is underneath', async () => {
    render(<App />);
    await userEvent.click(await screen.findByRole('button', { name: /\(DA0-002\)/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Practice: DA0-002' }));
    const count = await screen.findByRole('spinbutton', { name: 'Number of questions' });
    await userEvent.clear(count);
    await userEvent.type(count, '7');

    await userEvent.click(screen.getByRole('button', { name: 'Settings' }));
    const panel = screen.getByRole('dialog', { name: 'Settings' });
    expect(within(panel).getByRole('group', { name: 'Theme' })).toBeInTheDocument();
    expect(within(panel).queryByLabelText(/Import/)).not.toBeInTheDocument();

    // Theme applies at once, while the panel is open.
    await userEvent.click(within(panel).getByRole('radio', { name: /dark/i }));
    expect(document.documentElement.dataset.theme).toBe('dark');

    await userEvent.click(within(panel).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog', { name: 'Settings' })).not.toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Number of questions' })).toHaveValue(7);
    expect(screen.getByRole('button', { name: 'Settings' })).toHaveFocus();
  });

  it('opens the full Settings page from Home, which has no Settings button of its own', async () => {
    render(<App />);
    await userEvent.click(await screen.findByRole('button', { name: 'Settings' }));
    expect(await screen.findByRole('heading', { level: 2, name: 'Settings' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Import backup/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Settings' })).not.toBeInTheDocument();
  });
});

/** What the browser does on Back from our trap entry: fire popstate for the entry below it. */
const browserBack = () => act(() => void window.dispatchEvent(new PopStateEvent('popstate', { state: null })));

describe('App browser Back', () => {
  it('climbs one level per Back, re-arming below Home and not on Home', async () => {
    const push = vi.spyOn(window.history, 'pushState').mockImplementation(() => {});
    render(<App />);
    await userEvent.click(await screen.findByRole('button', { name: /\(DA0-002\)/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Practice: DA0-002' }));
    expect(await screen.findByRole('heading', { level: 2, name: /^Practice:/ })).toBeInTheDocument();
    expect(push).toHaveBeenCalledTimes(1);

    browserBack();
    expect(await screen.findByRole('heading', { level: 2, name: /\(DA0-002\)$/ })).toHaveFocus();
    expect(push).toHaveBeenCalledTimes(2);

    browserBack();
    expect(await screen.findByRole('heading', { level: 2, name: 'Exams' })).toHaveFocus();
    expect(push).toHaveBeenCalledTimes(2);
  });

  it('asks before leaving a running mock, stays when declined, and scores it on the spot when accepted', async () => {
    const push = vi.spyOn(window.history, 'pushState').mockImplementation(() => {});
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<App />);
    await userEvent.click(await screen.findByRole('button', { name: /\(DA0-002\)/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Start mock exam: DA0-002' }));
    await userEvent.click(await screen.findByRole('checkbox', { name: 'I understand' }));
    await userEvent.click(screen.getByRole('button', { name: 'Start exam' }));
    const pushes = push.mock.calls.length;

    browserBack();
    expect(confirm).toHaveBeenCalledWith(LEAVE_MOCK);
    expect(screen.queryByRole('heading', { level: 2, name: /\(DA0-002\)$/ })).not.toBeInTheDocument();
    // Still on the run, so the trap is pushed again for the next Back.
    expect(push).toHaveBeenCalledTimes(pushes + 1);
    expect(screen.getByRole('timer')).toBeInTheDocument();

    // OK ends and scores the exam; the results show here, and the next Back leaves freely.
    confirm.mockReturnValue(true);
    await userEvent.click(screen.getAllByRole('button', { name: '← Back to Data+' })[0]);
    expect(await screen.findByRole('heading', { level: 2, name: /your score/i })).toBeInTheDocument();
    expect(screen.getByText('Ended because you left the exam.')).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('button', { name: '← Back to Data+' })[0]);
    expect(await screen.findByRole('heading', { level: 2, name: /\(DA0-002\)$/ })).toBeInTheDocument();
  });
});

describe('App mock recovery', () => {
  it('opens on the mock results when a mock was cut off by a refresh or close', async () => {
    const repo = createMemoryRepo();
    await saveInProgress(repo, sampleMock());
    next.repo = repo;
    render(<App />);
    expect(await screen.findByRole('heading', { name: /your score/i })).toBeInTheDocument();
    expect(screen.getByText('Ended because you left the exam.')).toBeInTheDocument();
    expect(await loadInProgress(repo)).toBeNull();
    expect(await repo.listRecords('results')).toHaveLength(1);
  });
});
