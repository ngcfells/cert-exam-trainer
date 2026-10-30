import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PbqView } from './PbqView';
import { pbqFixture } from '../../../domain/pbqFixtures';
import { ExamRunner } from '../ExamRunner';
import type { AssembledExam, ExamItem } from '../../../exam/assemble';
import { mcq } from '../../../exam/testFixtures';

function setup(item: ExamItem, value = {}) {
  const onChange = vi.fn();
  render(<PbqView item={item} value={value} onChange={onChange} />);
  return { onChange, user: userEvent.setup() };
}

describe('PBQ templates', () => {
  it('match: picking a choice for a prompt sets that part', async () => {
    const { onChange, user } = setup({ question: pbqFixture('match'), elementOrder: ['c3', 'c1', 'c2'] }, { p2: 'c1' });
    const select = screen.getByRole('combobox', { name: 'T-p1' });
    expect([...select.querySelectorAll('option')].map((o) => o.textContent)).toEqual(['Choose…', 'T-c3', 'T-c1', 'T-c2']);
    await user.selectOptions(select, 'T-c2');
    expect(onChange).toHaveBeenLastCalledWith({ p1: 'c2', p2: 'c1' });
  });

  it('order: moving a step writes the full order', async () => {
    const { onChange, user } = setup({ question: pbqFixture('order'), elementOrder: ['s3', 's1', 's2'] });
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      expect.stringContaining('T-s3'),
      expect.stringContaining('T-s1'),
      expect.stringContaining('T-s2'),
    ]);
    expect(screen.getByRole('button', { name: 'Move T-s3 up' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Move T-s3 down' }));
    expect(onChange).toHaveBeenLastCalledWith({ '0': 's1', '1': 's3', '2': 's2' });
  });

  it('order: shows a saved response order', () => {
    setup({ question: pbqFixture('order'), elementOrder: ['s3', 's1', 's2'] }, { '0': 's2', '1': 's1', '2': 's3' });
    expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('T-s2');
  });

  it('config: each field is a labelled select', async () => {
    const { onChange, user } = setup({ question: pbqFixture('config') });
    await user.selectOptions(screen.getByRole('combobox', { name: 'Join' }), 'T-left');
    expect(onChange).toHaveBeenLastCalledWith({ f1: 'left' });
  });

  it('diagram: draws an image and labels each zone', async () => {
    const { onChange, user } = setup({ question: pbqFixture('diagram'), elementOrder: ['l2', 'l1'] });
    expect(screen.getByRole('img', { name: 'Stem' })).toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Destination box' }), 'T-l2');
    expect(onChange).toHaveBeenLastCalledWith({ z1: 'l2' });
  });
});

describe('ExamRunner with a PBQ', () => {
  it('keeps a PBQ answer across navigation and marks it answered', async () => {
    const exam: AssembledExam = {
      exam: 'T-001',
      seed: 1,
      items: [{ question: pbqFixture('config') }, { question: mcq('A0', 'A'), optionOrder: ['a', 'b', 'c', 'd'] }],
      mcqCount: 1,
      pbqWeightSum: 3,
    };
    const user = userEvent.setup();
    render(<ExamRunner exam={exam} timeLimitMs={600_000} startedAt={new Date()} onSubmit={vi.fn()} />);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Join' }), 'T-left');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Previous' }));
    expect(screen.getByRole('combobox', { name: 'Join' })).toHaveValue('left');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Review' }));
    expect(screen.getByRole('button', { name: 'Question 1, answered' })).toBeInTheDocument();
  });
});
