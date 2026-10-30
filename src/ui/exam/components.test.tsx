import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { formatTime } from './formatTime';
import { McqView } from './McqView';
import { TopBar } from './TopBar';
import { ReviewGrid } from './ReviewGrid';
import { mcq } from '../../exam/testFixtures';

describe('formatTime', () => {
  it('formats m:ss and h:mm:ss', () => {
    expect(formatTime(3_599_000)).toBe('59:59');
    expect(formatTime(3_600_000)).toBe('1:00:00');
    expect(formatTime(61_500)).toBe('1:01');
    expect(formatTime(-5)).toBe('0:00');
  });
});

describe('McqView', () => {
  it('renders options in optionOrder and selects one', async () => {
    const onChange = vi.fn();
    render(<McqView item={{ question: mcq('A0', 'A'), optionOrder: ['c', 'a', 'd', 'b'] }} selected={[]} onChange={onChange} />);
    const radios = screen.getAllByRole('radio');
    expect(radios.map((r) => r.closest('label')!.textContent)).toEqual(['A0-c', 'A0-a', 'A0-d', 'A0-b']);
    await userEvent.click(screen.getByLabelText('A0-b'));
    expect(onChange).toHaveBeenCalledWith(['b']);
    expect(screen.getByRole('group', { name: 'Stem A0' })).toBeInTheDocument();
  });

  it('toggles checkboxes for select-all', async () => {
    const onChange = vi.fn();
    const item = { question: mcq('A0', 'A', 'mcq-multi'), optionOrder: ['a', 'b', 'c', 'd'] };
    const { rerender } = render(<McqView item={item} selected={[]} onChange={onChange} />);
    expect(screen.getByText('Select all that apply.')).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('A0-a'));
    expect(onChange).toHaveBeenLastCalledWith(['a']);
    rerender(<McqView item={item} selected={['a']} onChange={onChange} />);
    await userEvent.click(screen.getByLabelText('A0-c'));
    expect(onChange).toHaveBeenLastCalledWith(['a', 'c']);
    rerender(<McqView item={item} selected={['a', 'c']} onChange={onChange} />);
    await userEvent.click(screen.getByLabelText('A0-a'));
    expect(onChange).toHaveBeenLastCalledWith(['c']);
  });
});

describe('TopBar', () => {
  it('shows position, toggles the flag and announces milestones once', async () => {
    const onToggleFlag = vi.fn();
    const props = { index: 2, total: 10, flagged: false, onToggleFlag };
    const { rerender } = render(<TopBar {...props} remainingMs={601_000} />);
    expect(screen.getByText('Question 3 of 10')).toBeInTheDocument();
    const flag = screen.getByRole('button', { name: /flag/i });
    expect(flag).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(flag);
    expect(onToggleFlag).toHaveBeenCalled();
    const live = screen.getByTestId('timer-announcer');
    expect(live).toHaveTextContent('');
    rerender(<TopBar {...props} remainingMs={599_000} />);
    expect(live).toHaveTextContent('10 minutes remaining');
    rerender(<TopBar {...props} remainingMs={598_000} />);
    expect(live).toHaveTextContent('10 minutes remaining');
    rerender(<TopBar {...props} remainingMs={59_000} />);
    expect(live).toHaveTextContent('1 minute remaining');
  });
});

describe('ReviewGrid', () => {
  it('names each item by state and jumps', async () => {
    const onJump = vi.fn();
    render(
      <ReviewGrid
        items={[
          { index: 0, answered: true, flagged: false },
          { index: 1, answered: false, flagged: true },
        ]}
        onJump={onJump}
      />,
    );
    expect(screen.getByRole('button', { name: 'Question 1, answered' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Question 2, unanswered, flagged' }));
    expect(onJump).toHaveBeenCalledWith(1);
  });
});
