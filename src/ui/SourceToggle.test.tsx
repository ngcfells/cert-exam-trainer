import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRepo } from '../storage/memoryRepo';
import { SourceToggle } from './SourceToggle';

describe('SourceToggle', () => {
  it('offers Stock and Custom choices and saves per exam', async () => {
    const repo = createMemoryRepo();
    render(<SourceToggle repo={repo} examCode="DA0-002" />);
    const group = await screen.findByRole('group', { name: 'Questions to use' });
    const labels = Array.from(group.querySelectorAll('label')).map((l) => l.textContent);
    expect(labels).toEqual(['Stock + Custom', 'Stock only', 'Custom only']);
    expect(screen.getByRole('radio', { name: 'Stock + Custom' })).toBeChecked();
    await userEvent.click(screen.getByRole('radio', { name: 'Custom only' }));
    await waitFor(async () => expect(await repo.getSetting('sourceFilter:DA0-002')).toBe('mine'));
    expect(await repo.getSetting('sourceFilter')).toBeUndefined();
  });
});
