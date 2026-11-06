import { afterEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRepo } from '../../storage/memoryRepo';
import type { Repo } from '../../storage';
import { getTips, resetTipsForTests, TIP_PROGRESS_SETTING, TIPS_SETTING } from './prefs';
import { TipSettings } from './TipSettings';

afterEach(() => resetTipsForTests());

const box = () => screen.findByRole('checkbox', { name: 'Show study tips in practice and cram' });

describe('TipSettings', () => {
  it('holds the on switch, checked by default, in a Study tips group', async () => {
    render(<TipSettings repo={createMemoryRepo()} />);
    const group = await screen.findByRole('group', { name: 'Study tips' });
    expect(within(group).getByRole('checkbox', { name: 'Show study tips in practice and cram' })).toBeChecked();
    expect(within(group).getByRole('button', { name: 'Start the tips over' })).toBeInTheDocument();
  });

  it('shows a stored off', async () => {
    const repo = createMemoryRepo();
    await repo.setSetting(TIPS_SETTING, false);
    render(<TipSettings repo={repo} />);
    expect(await box()).not.toBeChecked();
  });

  it('unchecking saves off and turns tips off at once', async () => {
    const repo = createMemoryRepo();
    render(<TipSettings repo={repo} />);
    await userEvent.click(await box());
    expect(await box()).not.toBeChecked();
    expect(await repo.getSetting(TIPS_SETTING)).toBe(false);
    expect(getTips().on).toBe(false);
  });

  it('Start the tips over clears the seen list and the count', async () => {
    const repo = createMemoryRepo();
    await repo.setSetting(TIP_PROGRESS_SETTING, { count: 7, gap: 15, seen: ['key-word'] });
    render(<TipSettings repo={repo} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Start the tips over' }));
    expect(screen.getByRole('status')).toHaveTextContent('Tips start over from the beginning.');
    const p = (await repo.getSetting<{ count: number; seen: string[] }>(TIP_PROGRESS_SETTING))!;
    expect(p.count).toBe(0);
    expect(p.seen).toEqual([]);
  });

  it('shows an alert when a write fails', async () => {
    const base = createMemoryRepo();
    const repo: Repo = { ...base, setSetting: () => Promise.reject(new Error('quota')) };
    render(<TipSettings repo={repo} />);
    await userEvent.click(await box());
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save this choice.');
  });

  it('still shows the controls when the saved settings cannot be read', async () => {
    const base = createMemoryRepo();
    const repo: Repo = { ...base, getSetting: () => Promise.reject(new Error('read')) };
    render(<TipSettings repo={repo} />);
    expect(await box()).toBeChecked();
  });
});
