import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExamPage } from './ExamPage';
import { getBundledQuestions } from '../banks';
import { createMemoryRepo } from '../storage/memoryRepo';
import { questions } from './plural';

describe('ExamPage', () => {
  it('focuses the heading, shows the counts and the source choice, and opens tools', async () => {
    const onNavigate = vi.fn();
    render(<ExamPage repo={createMemoryRepo()} examCode="DA0-002" onNavigate={onNavigate} />);
    const heading = screen.getByRole('heading', { level: 2, name: 'CompTIA Data+ (DA0-002)' });
    expect(heading).toHaveFocus();
    expect(await screen.findByText(`Stock: ${questions(getBundledQuestions('DA0-002').length)} · Custom: 0 questions`)).toBeInTheDocument();
    expect(await screen.findByRole('group', { name: 'Questions to use' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Start mock exam: DA0-002' }));
    expect(onNavigate).toHaveBeenLastCalledWith({ name: 'mock', exam: 'DA0-002' });
    await userEvent.click(screen.getByRole('button', { name: 'My questions: DA0-002' }));
    expect(onNavigate).toHaveBeenLastCalledWith({ name: 'questions', exam: 'DA0-002' });
  });

  it('shows Learn only for an exam with lessons', () => {
    const { unmount } = render(<ExamPage repo={createMemoryRepo()} examCode="DA0-002" onNavigate={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Learn: DA0-002' })).toBeInTheDocument();
    unmount();
    render(<ExamPage repo={createMemoryRepo()} examCode="CY0-001" onNavigate={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Practice: CY0-001' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Learn: CY0-001' })).not.toBeInTheDocument();
  });

  it('says so for an unknown exam', () => {
    render(<ExamPage repo={createMemoryRepo()} examCode="NOPE" onNavigate={vi.fn()} />);
    expect(screen.getByText('Unknown exam.')).toBeInTheDocument();
  });
});
