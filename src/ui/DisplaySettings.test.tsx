import { afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRepo } from '../storage/memoryRepo';
import { DisplaySettings } from './DisplaySettings';
import { loadDisplay, MOTION_SETTING, TEXT_SIZE_SETTING, THEME_SETTING } from './display';

const root = document.documentElement;

afterEach(() => {
  delete root.dataset.theme;
  delete root.dataset.motion;
  delete root.dataset.textSize;
});

describe('DisplaySettings', () => {
  it('theme radios set data-theme and store the choice', async () => {
    const repo = createMemoryRepo();
    render(<DisplaySettings repo={repo} />);
    const group = await screen.findByRole('group', { name: 'Theme' });
    expect(group).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: 'Dark' }));
    expect(root.dataset.theme).toBe('dark');
    expect(await repo.getSetting(THEME_SETTING)).toBe('dark');
    await userEvent.click(screen.getByRole('radio', { name: 'Match system' }));
    expect(root.dataset.theme).toBeUndefined();
    expect(await repo.getSetting(THEME_SETTING)).toBe('system');
  });

  it('reduce motion checkbox sets data-motion and stores true', async () => {
    const repo = createMemoryRepo();
    render(<DisplaySettings repo={repo} />);
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Reduce motion' }));
    expect(root.dataset.motion).toBe('reduce');
    expect(await repo.getSetting(MOTION_SETTING)).toBe(true);
  });

  it('text size radios set data-text-size and store the choice', async () => {
    const repo = createMemoryRepo();
    render(<DisplaySettings repo={repo} />);
    await screen.findByRole('group', { name: 'Text size' });
    await userEvent.click(screen.getByRole('radio', { name: 'Extra large' }));
    expect(root.dataset.textSize).toBe('larger');
    expect(await repo.getSetting(TEXT_SIZE_SETTING)).toBe('larger');
    await userEvent.click(screen.getByRole('radio', { name: 'Normal' }));
    expect(root.dataset.textSize).toBeUndefined();
    expect((await loadDisplay(repo)).textSize).toBe('normal');
  });

  it('loadDisplay falls back on unknown stored values', async () => {
    const repo = createMemoryRepo();
    await repo.setSetting(THEME_SETTING, 'purple');
    await repo.setSetting(MOTION_SETTING, 'yes');
    expect(await loadDisplay(repo)).toEqual({ theme: 'system', reducedMotion: false, textSize: 'normal' });
  });
});
