import { describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

  it('ends a stroke when the browser takes the pointer away', async () => {
    render(<ToolsHarness />);
    const panel = await openBoard();
    const canvas = within(panel).getByLabelText('Drawing area');
    const clear = within(panel).getByRole('button', { name: 'Clear drawing' });
    fireEvent.pointerDown(canvas, { clientX: 1, clientY: 1, pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientX: 5, clientY: 5, pointerId: 1 });
    fireEvent(canvas, new Event('lostpointercapture', { bubbles: true }));
    // The stroke is kept, and a later move with the same pointer does not keep drawing it.
    expect(clear).toBeEnabled();
    fireEvent.pointerMove(canvas, { clientX: 9, clientY: 9, pointerId: 1 });
    fireEvent.pointerUp(canvas, { clientX: 9, clientY: 9, pointerId: 1 });
    await userEvent.click(clear);
    expect(clear).toBeDisabled();
  });

  it('repaints the ink when the theme changes, so it never matches the new background', async () => {
    const calls = vi.fn();
    const spy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      calls();
      return { setTransform() {}, clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {} } as unknown as CanvasRenderingContext2D;
    } as never);
    const listeners: (() => void)[] = [];
    const mm = vi.fn(() => ({ matches: false, addEventListener: (_: string, f: () => void) => listeners.push(f), removeEventListener() {} }));
    vi.stubGlobal('matchMedia', mm);
    try {
      render(<ToolsHarness />);
      await openBoard();
      const before = calls.mock.calls.length;
      document.documentElement.dataset.theme = 'dark';
      await waitFor(() => expect(calls.mock.calls.length).toBeGreaterThan(before));
      const afterTheme = calls.mock.calls.length;
      for (const f of listeners) f();
      expect(calls.mock.calls.length).toBeGreaterThan(afterTheme);
    } finally {
      delete document.documentElement.dataset.theme;
      spy.mockRestore();
      vi.unstubAllGlobals();
    }
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
