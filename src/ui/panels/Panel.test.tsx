import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Panel } from './Panel';
import { PanelProvider, usePanels, usePanelState } from './PanelProvider';

describe('Panel', () => {
  it('is a dialog named by its title; Close and Escape call onClose', async () => {
    const onClose = vi.fn();
    render(
      <Panel kind="settings" title="Settings" onClose={onClose}>
        <input aria-label="inside" />
      </Panel>,
    );
    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    screen.getByRole('textbox', { name: 'inside' }).focus();
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

function Harness() {
  const api = usePanelState();
  return (
    <PanelProvider api={api}>
      <Body />
    </PanelProvider>
  );
}

function Body() {
  const { current, open, close } = usePanels();
  return (
    <>
      <button type="button" onClick={(e) => open('settings', e.currentTarget)}>
        Open settings
      </button>
      {current === 'settings' && (
        <Panel kind="settings" title="Settings" onClose={() => close()}>
          <button type="button" onClick={() => open('calculator', null)}>
            Switch
          </button>
        </Panel>
      )}
      {current === 'calculator' && (
        <Panel kind="calculator" title="Calculator" onClose={() => close()}>
          <p>calc</p>
        </Panel>
      )}
    </>
  );
}

describe('PanelProvider', () => {
  it('keeps one panel open at a time and returns focus to the opener', async () => {
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Open settings' });
    await userEvent.click(opener);
    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Switch' }));
    expect(screen.queryByRole('dialog', { name: 'Settings' })).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Calculator' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await userEvent.click(opener);
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(opener).toHaveFocus();
  });
});
