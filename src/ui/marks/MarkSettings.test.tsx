import { afterEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRepo } from '../../storage/memoryRepo';
import { MarkSettings } from './MarkSettings';
import { applyMarks, DEFAULT_MARKS, getMarks, MARK_NAMES, MARK_STYLES, MARKS_SETTING, SOUND_SETTING } from './prefs';

afterEach(() => applyMarks(DEFAULT_MARKS));

describe('MarkSettings', () => {
  it('lists seven styles with the banner chosen and sound off by default', async () => {
    render(<MarkSettings repo={createMemoryRepo()} />);
    const group = await screen.findByRole('group', { name: 'Answer marks' });
    expect(within(group).getAllByRole('radio').map((r) => r.getAttribute('aria-label') ?? r.closest('label')?.textContent)).toHaveLength(7);
    for (const s of MARK_STYLES) expect(within(group).getByRole('radio', { name: MARK_NAMES[s] })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Check and X banner' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Play a sound when an answer is checked' })).not.toBeChecked();
    expect(within(group).queryByRole('status')).toBeNull();
  });

  it('a style choice applies and saves at once', async () => {
    const repo = createMemoryRepo();
    render(<MarkSettings repo={repo} />);
    await userEvent.click(await screen.findByRole('radio', { name: "Grader's stamp" }));
    expect(getMarks().style).toBe('stamp');
    expect(await repo.getSetting(MARKS_SETTING)).toBe('stamp');
  });

  it('the sound checkbox saves true', async () => {
    const repo = createMemoryRepo();
    render(<MarkSettings repo={repo} />);
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Play a sound when an answer is checked' }));
    expect(getMarks().sound).toBe(true);
    expect(await repo.getSetting(SOUND_SETTING)).toBe(true);
  });
});
