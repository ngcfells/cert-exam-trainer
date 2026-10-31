import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
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
    const up = screen.getByRole('button', { name: 'Move T-s3 up' });
    expect(up).toHaveAttribute('aria-disabled', 'true');
    await user.click(up);
    expect(onChange).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Move T-s3 down' }));
    expect(onChange).toHaveBeenLastCalledWith({ '0': 's1', '1': 's3', '2': 's2' });
  });

  it('order: Keep this order saves the order shown', async () => {
    const { onChange, user } = setup({ question: pbqFixture('order'), elementOrder: ['s3', 's1', 's2'] });
    await user.click(screen.getByRole('button', { name: 'Keep this order' }));
    expect(onChange).toHaveBeenLastCalledWith({ '0': 's3', '1': 's1', '2': 's2' });
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

  it('config, data and terminal: select options follow the attempt order', () => {
    const opts = (name: string) => within(screen.getByRole('combobox', { name })).getAllByRole('option').map((o) => o.textContent);
    const { unmount } = render(<PbqView item={{ question: pbqFixture('config'), partOrders: { f1: ['left', 'inner'] } }} value={{}} onChange={vi.fn()} />);
    expect(opts('Join')).toEqual(['Choose…', 'T-left', 'T-inner']);
    unmount();
    const r2 = render(<PbqView item={{ question: pbqFixture('data'), partOrders: { f1: ['south', 'north'] } }} value={{}} onChange={vi.fn()} />);
    expect(opts('Top region')).toEqual(['Choose…', 'T-south', 'T-north']);
    r2.unmount();
    render(<PbqView item={{ question: pbqFixture('terminal'), partOrders: { t2: ['a2', 'a1'] } }} value={{}} onChange={vi.fn()} />);
    expect(opts('Next action')).toEqual(['Choose…', 'T-a2', 'T-a1']);
  });

  it('diagram: draws an image and labels each zone', async () => {
    const { onChange, user } = setup({ question: pbqFixture('diagram'), elementOrder: ['l2', 'l1'] });
    expect(screen.getByRole('img', { name: 'Stem' })).toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Destination box' }), 'T-l2');
    expect(onChange).toHaveBeenLastCalledWith({ z1: 'l2' });
  });
});

describe('PBQ templates 5-8', () => {
  it('terminal: typing a command sets that step, and an action is chosen from a list', async () => {
    const { onChange, user } = setup({ question: pbqFixture('terminal') });
    expect(screen.getByRole('region', { name: 'Terminal output' })).toHaveTextContent('app.log db.log');
    await user.type(screen.getByRole('textbox', { name: 'Find errors' }), 'g');
    expect(onChange).toHaveBeenLastCalledWith({ t1: 'g' });
    await user.selectOptions(screen.getByRole('combobox', { name: 'Next action' }), 'T-a2');
    expect(onChange).toHaveBeenLastCalledWith({ t2: 'a2' });
  });

  it('data: renders a captioned table and question fields', async () => {
    const { onChange, user } = setup({ question: pbqFixture('data') });
    const table = screen.getByRole('table', { name: 'Sales by region' });
    expect(within(table).getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Region', 'Sales']);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Top region' }), 'T-north');
    expect(onChange).toHaveBeenLastCalledWith({ f1: 'north' });
  });

  it('hotspot: a checkbox per spot toggles it', async () => {
    const { onChange, user } = setup({ question: pbqFixture('hotspot') }, { s3: 'on' });
    expect(screen.getByRole('checkbox', { name: 'Database' })).toBeChecked();
    await user.click(screen.getByRole('checkbox', { name: 'Web server' }));
    expect(onChange).toHaveBeenLastCalledWith({ s1: 'on', s3: 'on' });
    await user.click(screen.getByRole('checkbox', { name: 'Database' }));
    expect(onChange).toHaveBeenLastCalledWith({});
  });

  it('hotspot: lists checkboxes in the attempt order', () => {
    setup({ question: pbqFixture('hotspot'), elementOrder: ['s3', 's1', 's4', 's2'] });
    expect(screen.getAllByRole('checkbox').map((c) => c.closest('label')!.textContent)).toEqual(['Database', 'Web server', 'Queue', 'Cache']);
  });

  it('buckets: choosing a bucket places the item, and a later choice replaces it', async () => {
    const { onChange, user } = setup({ question: pbqFixture('buckets'), elementOrder: ['i3', 'i1', 'i2'] }, { i1: 'b2' });
    expect(screen.getAllByRole('combobox').map((c) => c.getAttribute('aria-label') ?? c.id)).toHaveLength(3);
    expect(screen.getByRole('group', { name: 'T-b2' })).toHaveTextContent('T-i1');
    // A placed item can be dragged on to another bucket.
    expect(within(screen.getByRole('group', { name: 'T-b2' })).getByText('T-i1')).toHaveAttribute('draggable', 'true');
    await user.selectOptions(screen.getByRole('combobox', { name: 'T-i1' }), 'T-b1');
    expect(onChange).toHaveBeenLastCalledWith({ i1: 'b1' });
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
