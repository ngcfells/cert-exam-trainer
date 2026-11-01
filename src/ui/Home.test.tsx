import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Home } from './Home';
import { StorageBanner } from './StorageBanner';
import { createMemoryRepo } from '../storage/memoryRepo';

describe('Home', () => {
  it('shows a card per exam with Stock and Custom counts, opening the exam page', async () => {
    const onNavigate = vi.fn();
    render(<Home repo={createMemoryRepo()} persistent onNavigate={onNavigate} />);
    const card = await screen.findByRole('button', { name: /CompTIA Data\+ \(DA0-002\)/ });
    expect(card).toHaveTextContent(/Stock: \d+ questions/);
    expect(card).toHaveTextContent(/Custom: 0 questions/);
    expect(screen.getByRole('button', { name: /CompTIA SecAI\+ \(CY0-001\)/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /CompTIA AutoOps\+ \(AT0-001\)/ })).toBeInTheDocument();
    await userEvent.click(card);
    expect(onNavigate).toHaveBeenLastCalledWith({ name: 'exam', exam: 'DA0-002' });
    await userEvent.click(screen.getByRole('button', { name: 'About' }));
    expect(onNavigate).toHaveBeenLastCalledWith({ name: 'about' });
    // The source choice lives on each exam page; Settings sits in the app header.
    expect(screen.queryByRole('group', { name: 'Questions to use' })).not.toBeInTheDocument();
  });

  it('shows the storage banner only when not persistent', async () => {
    const { rerender } = render(<StorageBanner persistent />);
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    rerender(<StorageBanner persistent={false} />);
    expect(await screen.findByRole('status')).toHaveTextContent("Progress won't be saved in this browser session.");
  });
});
