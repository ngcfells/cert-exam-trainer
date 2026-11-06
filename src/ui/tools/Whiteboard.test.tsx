import { describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToolsHarness } from './testHarness';

async function openBoard() {
  await userEvent.click(screen.getByRole('button', { name: 'Whiteboard' }));
  return screen.getByRole('dialog', { name: 'Whiteboard' });
}

describe('Whiteboard panel', () => {
  it('keeps typed notes across close and reopen', async () => {
    render(<ToolsHarness />);
    let panel = await openBoard();
    await userEvent.type(within(panel).getByRole('textbox', { name: 'Notes' }), 'mean is 4');
    await userEvent.click(within(panel).getByRole('button', { name: 'Close' }));
    panel = await openBoard();
    expect(within(panel).getByRole('textbox', { name: 'Notes' })).toHaveValue('mean is 4');
  });

  it('draws strokes with the pointer and clears them', async () => {
    render(<ToolsHarness />);
    const panel = await openBoard();
    const canvas = within(panel).getByLabelText('Drawing area');
    expect(canvas.tagName).toBe('CANVAS');
    expect(canvas.style.touchAction).toBe('none');
    const clear = within(panel).getByRole('button', { name: 'Clear drawing' });
    expect(clear).toBeDisabled();

    fireEvent.pointerDown(canvas, { clientX: 1, clientY: 1, pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientX: 5, clientY: 5, pointerId: 1 });
    fireEvent.pointerUp(canvas, { clientX: 5, clientY: 5, pointerId: 1 });
    expect(clear).toBeEnabled();

    await userEvent.click(clear);
    expect(clear).toBeDisabled();
  });

  it('starts empty in a new run', async () => {
    render(<ToolsHarness />);
    let panel = await openBoard();
    await userEvent.type(within(panel).getByRole('textbox', { name: 'Notes' }), 'old run');
    cleanup();
    render(<ToolsHarness />);
    panel = await openBoard();
    expect(within(panel).getByRole('textbox', { name: 'Notes' })).toHaveValue('');
  });
});
