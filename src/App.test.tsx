import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRepo } from './storage/memoryRepo';
import { LEAVE_RUN } from './ui/nav';
import App from './App';

vi.mock('./storage', async (orig) => ({
  ...(await orig<typeof import('./storage')>()),
  openRepo: async () => ({ repo: createMemoryRepo(), persistent: true }),
}));

afterEach(() => {
  vi.restoreAllMocks();
  window.history.replaceState(null, '');
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

  it('asks before leaving a running mock, stays when declined, and leaves when accepted', async () => {
    const push = vi.spyOn(window.history, 'pushState').mockImplementation(() => {});
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<App />);
    await userEvent.click(await screen.findByRole('button', { name: /\(DA0-002\)/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Start mock exam: DA0-002' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Start exam' }));
    const pushes = push.mock.calls.length;

    browserBack();
    expect(confirm).toHaveBeenCalledWith(LEAVE_RUN);
    expect(screen.queryByRole('heading', { level: 2, name: /\(DA0-002\)$/ })).not.toBeInTheDocument();
    // Still on the run, so the trap is pushed again for the next Back.
    expect(push).toHaveBeenCalledTimes(pushes + 1);

    confirm.mockReturnValue(true);
    await userEvent.click(screen.getAllByRole('button', { name: '← Back to Data+' })[0]);
    expect(await screen.findByRole('heading', { level: 2, name: /\(DA0-002\)$/ })).toBeInTheDocument();
  });
});
