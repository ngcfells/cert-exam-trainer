import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SettingsScreen } from './SettingsScreen';
import { createMemoryRepo } from '../storage/memoryRepo';

describe('SettingsScreen', () => {
  it('holds the display settings and backups, but no question source', async () => {
    render(<SettingsScreen repo={createMemoryRepo()} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Settings' })).toHaveFocus();
    expect(await screen.findByRole('button', { name: /export/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/import backup/i)).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Questions to use' })).not.toBeInTheDocument();
  });
});
