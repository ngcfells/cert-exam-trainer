import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsScreen } from './SettingsScreen';
import { createMemoryRepo } from '../storage/memoryRepo';
import { exportBackup } from '../storage/backup';
import { THEME_SETTING } from './display';
import { applyMarks, DEFAULT_MARKS, getMarks, MARKS_SETTING } from './marks/prefs';

afterEach(() => {
  delete document.documentElement.dataset.theme;
  applyMarks(DEFAULT_MARKS);
});

describe('SettingsScreen', () => {
  it('holds the display settings and backups, but no question source', async () => {
    render(<SettingsScreen repo={createMemoryRepo()} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Settings' })).toHaveFocus();
    expect(await screen.findByRole('button', { name: /export/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/import backup/i)).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Questions to use' })).not.toBeInTheDocument();
  });

  it('applies the theme from an imported backup and shows it in the form', async () => {
    const source = createMemoryRepo();
    await source.setSetting(THEME_SETTING, 'dark');
    const json = JSON.stringify(await exportBackup(source));
    render(<SettingsScreen repo={createMemoryRepo()} />);
    expect(await screen.findByLabelText('Match system')).toBeChecked();
    await userEvent.upload(screen.getByLabelText(/import backup/i, { selector: 'input[type=file]' }), new File([json], 'b.json'));
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('dark'));
    expect(await screen.findByLabelText('Dark')).toBeChecked();
  });

  it('applies answer marks from an imported backup at once', async () => {
    const source = createMemoryRepo();
    await source.setSetting(MARKS_SETTING, 'edge');
    const json = JSON.stringify(await exportBackup(source));
    render(<SettingsScreen repo={createMemoryRepo()} />);
    expect(await screen.findByRole('radio', { name: 'Check and X banner' })).toBeChecked();
    await userEvent.upload(screen.getByLabelText(/import backup/i, { selector: 'input[type=file]' }), new File([json], 'b.json'));
    await waitFor(() => expect(getMarks().style).toBe('edge'));
    expect(await screen.findByRole('radio', { name: 'Quiet edge' })).toBeChecked();
  });
});
