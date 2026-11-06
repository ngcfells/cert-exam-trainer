import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { dataPlusMeta } from '../../banks/dataplus/meta';
import type { Tip } from '../../tips/types';
import { TIPS } from '../../tips/list';
import { applyTips, getTips, resetTipsForTests } from './prefs';
import { TipBox } from './TipBox';

afterEach(() => resetTipsForTests());

const study: Tip = { id: 'know-acronyms', group: 'study', text: 'You get {minutes} minutes.' };
const room = TIPS.find((t) => t.group === 'test-room')!;

function setup(first: Tip = study) {
  applyTips({ on: true, progress: { count: 0, gap: 10, seen: [first.id] } });
  const onClose = vi.fn();
  render(<TipBox first={first} meta={dataPlusMeta} onClose={onClose} />);
  return { onClose, box: screen.getByRole('region') };
}

describe('TipBox', () => {
  it('is a region named by its group heading, showing the filled text', () => {
    const { box } = setup();
    expect(box).toHaveAccessibleName('Study tip');
    expect(within(box).getByRole('heading', { level: 3, name: 'Study tip' })).toBeInTheDocument();
    expect(box).toHaveTextContent(`You get ${dataPlusMeta.timeLimitMinutes} minutes.`);
  });

  it('names a test-room tip as such', () => {
    const { box } = setup(room);
    expect(box).toHaveAccessibleName('Test-room tip');
  });

  it('announces politely and does not move focus', () => {
    const before = document.createElement('button');
    document.body.appendChild(before);
    before.focus();
    const { box } = setup();
    expect(document.activeElement).toBe(before);
    const live = box.querySelector('[aria-live="polite"]');
    expect(live).toHaveTextContent(`You get ${dataPlusMeta.timeLimitMinutes} minutes.`);
    before.remove();
  });

  it('cycles with Next and Previous, asking for a new tip only past the end of its history', async () => {
    const user = userEvent.setup();
    const { box } = setup();
    const prev = within(box).getByRole('button', { name: 'Previous tip' });
    const next = within(box).getByRole('button', { name: 'Next tip' });
    expect(prev).toBeDisabled();

    await user.click(next);
    const seen1 = getTips().progress.seen;
    expect(seen1).toHaveLength(2);
    const second = TIPS.find((t) => t.id === seen1[1])!;
    expect(box).not.toHaveTextContent('You get');
    expect(prev).toBeEnabled();

    await user.click(prev);
    expect(box).toHaveTextContent(`You get ${dataPlusMeta.timeLimitMinutes} minutes.`);
    expect(prev).toBeDisabled();
    expect(getTips().progress.seen).toEqual(seen1);

    await user.click(next);
    expect(getTips().progress.seen).toEqual(seen1);
    expect(box.querySelector('[aria-live="polite"]')!.textContent).toContain(second.text.slice(0, 20));

    await user.click(next);
    expect(getTips().progress.seen).toHaveLength(3);
  });

  it('moves focus to Next tip when Previous tip reaches the first tip and disables itself', async () => {
    const user = userEvent.setup();
    const { box } = setup();
    await user.click(within(box).getByRole('button', { name: 'Next tip' }));
    const prev = within(box).getByRole('button', { name: 'Previous tip' });
    prev.focus();
    await user.keyboard('{Enter}');
    expect(prev).toBeDisabled();
    expect(document.activeElement).toBe(within(box).getByRole('button', { name: 'Next tip' }));
  });

  it('Close tip calls onClose', async () => {
    const user = userEvent.setup();
    const { box, onClose } = setup();
    await user.click(within(box).getByRole('button', { name: 'Close tip' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('holds only its three buttons as controls', () => {
    const { box } = setup();
    expect(box.querySelectorAll('button, input, select, textarea, a[href]')).toHaveLength(3);
  });
});
