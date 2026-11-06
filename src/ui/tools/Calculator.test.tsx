import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToolsHarness } from './testHarness';

const NAMES = [
  'plus',
  'minus',
  'times',
  'divide',
  'xʸ, power',
  'percent',
  'plus or minus',
  'square root',
  'M+, memory add',
  'M−, memory subtract',
  'MR, memory recall',
  'MC, memory clear',
  'clear',
  'backspace',
  'equals',
];

async function openCalc() {
  await userEvent.click(screen.getByRole('button', { name: 'Calculator' }));
  return screen.getByRole('dialog', { name: 'Calculator' });
}

describe('Calculator panel', () => {
  it('sits before the Whiteboard button', () => {
    render(<ToolsHarness />);
    const names = screen.getAllByRole('button').map((b) => b.textContent);
    expect(names.indexOf('Calculator')).toBeLessThan(names.indexOf('Whiteboard'));
  });

  it('names every key for screen readers and announces the display', async () => {
    render(<ToolsHarness />);
    const panel = await openCalc();
    for (const n of NAMES) expect(within(panel).getByRole('button', { name: n })).toBeInTheDocument();
    for (const d of '0123456789') expect(within(panel).getByRole('button', { name: d })).toBeInTheDocument();
    const out = within(panel).getByRole('status');
    expect(out.tagName).toBe('OUTPUT');
    expect(out).toHaveAttribute('aria-live', 'polite');
  });

  it('puts what each key shows in its spoken name, for voice control', async () => {
    render(<ToolsHarness />);
    const panel = await openCalc();
    for (const b of within(panel).getAllByRole('button').filter((x) => x.closest('.calc-keys') && /\p{L}/u.test(x.textContent ?? ''))) {
      const name = (b.getAttribute('aria-label') ?? b.textContent ?? '').toLowerCase();
      expect(name).toContain((b.textContent ?? '').toLowerCase());
    }
  });

  it('works from the keyboard', async () => {
    render(<ToolsHarness />);
    const panel = await openCalc();
    await userEvent.keyboard('2+3*4{Enter}');
    expect(within(panel).getByRole('status')).toHaveTextContent('20');
  });

  it('works by tapping keys, and keeps memory across close and reopen', async () => {
    render(<ToolsHarness />);
    let panel = await openCalc();
    await userEvent.click(within(panel).getByRole('button', { name: '5' }));
    await userEvent.click(within(panel).getByRole('button', { name: 'M+, memory add' }));
    await userEvent.click(within(panel).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    panel = await openCalc();
    await userEvent.click(within(panel).getByRole('button', { name: 'clear' }));
    await userEvent.click(within(panel).getByRole('button', { name: 'MR, memory recall' }));
    expect(within(panel).getByRole('status')).toHaveTextContent('5');
  });

  it('shows errors in the display', async () => {
    render(<ToolsHarness />);
    const panel = await openCalc();
    await userEvent.keyboard('1/0{Enter}');
    expect(within(panel).getByRole('status')).toHaveTextContent("Can't divide by zero");
  });

  it('closes on Escape like every panel', async () => {
    render(<ToolsHarness />);
    await openCalc();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Calculator' })).toHaveFocus();
  });
});
