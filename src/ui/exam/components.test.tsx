import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { formatTime } from './formatTime';
import { McqView } from './McqView';
import { TopBar } from './TopBar';
import { ReviewGrid } from './ReviewGrid';
import { mcq, numeric } from '../../exam/testFixtures';
import { NumericView } from './NumericView';
import { ItemReview } from './ItemReview';

describe('formatTime', () => {
  it('formats m:ss and h:mm:ss', () => {
    expect(formatTime(3_599_000)).toBe('59:59');
    expect(formatTime(3_600_000)).toBe('1:00:00');
    expect(formatTime(61_500)).toBe('1:01');
    expect(formatTime(-5)).toBe('0:00');
  });
});

describe('NumericView', () => {
  const item = { question: numeric('N0', 'A') };
  it('labels the input with the stem, shows the unit and reports raw text', async () => {
    const onChange = vi.fn();
    const { rerender } = render(<NumericView item={item} value="" onChange={onChange} />);
    const input = screen.getByLabelText('Number N0');
    expect(input).toHaveAttribute('type', 'text');
    expect(input).toHaveAttribute('inputmode', 'decimal');
    expect(input).toHaveAccessibleDescription('Answer in %');
    expect(screen.getByText('%')).toBeInTheDocument();
    await userEvent.type(input, '7');
    expect(onChange).toHaveBeenLastCalledWith(['7']);
    rerender(<NumericView item={item} value="7" onChange={onChange} />);
    await userEvent.clear(input);
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it('flags text that is not a number only after leaving the field', async () => {
    render(<NumericView item={item} value="abc" onChange={() => {}} />);
    expect(screen.getByLabelText('Number N0')).not.toHaveAttribute('aria-invalid');
    await userEvent.click(screen.getByLabelText('Number N0'));
    await userEvent.tab();
    expect(screen.getByLabelText('Number N0')).toHaveAccessibleDescription(/Enter a number, such as 12\.5/);
    expect(screen.getByLabelText('Number N0')).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('ItemReview for numeric', () => {
  it('shows the given and correct answers', () => {
    const { rerender } = render(<ItemReview q={numeric('N0', 'A')} response={['24']} />);
    expect(screen.getByText('24')).toBeInTheDocument();
    expect(screen.getByText('25% (± 0.5)')).toBeInTheDocument();
    rerender(<ItemReview q={numeric('N0', 'A')} response={undefined} />);
    expect(screen.getByText('Not answered')).toBeInTheDocument();
  });
});

describe('McqView', () => {
  it('shows code in the stem as a block and code in an option inline', () => {
    const base = mcq('A0', 'A');
    const question = { ...base, stem: 'This script fails:\n```bash\nset -e\n  rm "$TMP"\n```\nWhy?', payload: { options: [{ id: 'a', text: 'Run `set -u`' }, { id: 'b', text: 'b' }] } };
    render(<McqView item={{ question }} selected={[]} onChange={vi.fn()} />);
    const block = screen.getByRole('group').querySelector('legend code.code-block');
    expect(block?.textContent).toBe('set -e\n  rm "$TMP"');
    expect(screen.getByLabelText('Run set -u').closest('label')!.querySelector('code')?.textContent).toBe('set -u');
  });

  it('renders options in optionOrder and selects one', async () => {
    const onChange = vi.fn();
    render(<McqView item={{ question: mcq('A0', 'A'), optionOrder: ['c', 'a', 'd', 'b'] }} selected={[]} onChange={onChange} />);
    const radios = screen.getAllByRole('radio');
    expect(radios.map((r) => r.closest('label')!.textContent)).toEqual(['A0-c', 'A0-a', 'A0-d', 'A0-b']);
    await userEvent.click(screen.getByLabelText('A0-b'));
    expect(onChange).toHaveBeenCalledWith(['b']);
    expect(screen.getByRole('group', { name: 'Stem A0' })).toBeInTheDocument();
  });

  it('select two: toggles checkboxes and locks the rest at two picks', async () => {
    const onChange = vi.fn();
    const item = { question: mcq('A0', 'A', 'mcq-multi'), optionOrder: ['a', 'b', 'c', 'd'] };
    const { rerender } = render(<McqView item={item} selected={[]} onChange={onChange} />);
    expect(screen.getByText('Select 2.')).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('A0-a'));
    expect(onChange).toHaveBeenLastCalledWith(['a']);
    rerender(<McqView item={item} selected={['a']} onChange={onChange} />);
    expect(screen.getByLabelText('A0-b')).toBeEnabled();
    await userEvent.click(screen.getByLabelText('A0-c'));
    expect(onChange).toHaveBeenLastCalledWith(['a', 'c']);
    rerender(<McqView item={item} selected={['a', 'c']} onChange={onChange} />);
    expect(screen.getByLabelText('A0-b')).toBeDisabled();
    expect(screen.getByLabelText('A0-d')).toBeDisabled();
    expect(screen.getByLabelText('A0-a')).toBeEnabled();
    onChange.mockClear();
    await userEvent.click(screen.getByLabelText('A0-b'));
    expect(onChange).not.toHaveBeenCalled();
    await userEvent.click(screen.getByLabelText('A0-a'));
    expect(onChange).toHaveBeenLastCalledWith(['c']);
    rerender(<McqView item={item} selected={['c']} onChange={onChange} />);
    expect(screen.getByLabelText('A0-b')).toBeEnabled();
  });

  it('select two: a fresh view with two picks starts locked (after Next / Previous)', () => {
    const item = { question: mcq('A0', 'A', 'mcq-multi') };
    render(<McqView item={item} selected={['a', 'c']} onChange={() => {}} />);
    expect(screen.getByLabelText('A0-b')).toBeDisabled();
  });

  it('select all: no cap, and every choice can be picked', () => {
    const item = { question: { ...mcq('A0', 'A', 'mcq-multi'), pick: 'all' as const } };
    render(<McqView item={item} selected={['a', 'b', 'c']} onChange={() => {}} />);
    expect(screen.getByText('Select all that apply.')).toBeInTheDocument();
    expect(screen.getByLabelText('A0-d')).toBeEnabled();
  });

  it('adds the count to a stem that lacks it, and allows that many picks', () => {
    const q = { ...mcq('A0', 'A', 'mcq-multi'), stem: 'Which apply?', answer: { correct: ['a', 'b', 'c', 'd'] } };
    render(<McqView item={{ question: q }} selected={['a', 'b', 'c']} onChange={() => {}} />);
    expect(screen.getByText('Which apply? (Choose four.)')).toBeInTheDocument();
    expect(screen.getByLabelText('A0-d')).toBeEnabled();
  });
});

describe('ItemReview for multi-answer', () => {
  it('shows the stem with its count and the hint', () => {
    const q = { ...mcq('A0', 'A', 'mcq-multi'), stem: 'Which apply?' };
    render(<ItemReview q={q} response={['a']} />);
    expect(screen.getByText('Which apply? (Choose two.)')).toBeInTheDocument();
    expect(screen.getByText('Select 2.')).toBeInTheDocument();
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
