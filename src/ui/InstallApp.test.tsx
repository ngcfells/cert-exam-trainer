import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InstallApp } from './InstallApp';
import { setInstallEnv, resetInstallEnv } from '../install';

afterEach(() => resetInstallEnv());

describe('InstallApp', () => {
  it('renders nothing outside the hosted build', () => {
    setInstallEnv({ pwa: false, standalone: false, ios: false });
    const { container } = render(<InstallApp />);
    expect(container).toBeEmptyDOMElement();
  });

  it('tells the learner where the browser menu installs it when no install offer has come', () => {
    setInstallEnv({ pwa: true, standalone: false, ios: false });
    render(<InstallApp />);
    expect(screen.getByRole('heading', { name: 'Install as an app' })).toBeInTheDocument();
    expect(screen.getByText(/Install app or Add to Home screen/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Install app' })).toBeNull();
  });

  it('shows the Add to Home Screen hint on iOS', () => {
    setInstallEnv({ pwa: true, standalone: false, ios: true });
    render(<InstallApp />);
    expect(screen.getByText(/Add to Home Screen/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Install app' })).toBeNull();
  });

  it('says so when already installed', () => {
    setInstallEnv({ pwa: true, standalone: true, ios: false });
    render(<InstallApp />);
    expect(screen.getByText(/works offline/i)).toBeInTheDocument();
  });

  it('shows Install app when the browser offers it, and runs the prompt', async () => {
    setInstallEnv({ pwa: true, standalone: false, ios: false });
    render(<InstallApp />);
    const prompt = vi.fn().mockResolvedValue(undefined);
    const ev = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt,
      userChoice: Promise.resolve({ outcome: 'accepted' }),
    });
    act(() => {
      window.dispatchEvent(ev);
    });
    expect(ev.defaultPrevented).toBe(true);
    await userEvent.click(await screen.findByRole('button', { name: 'Install app' }));
    expect(prompt).toHaveBeenCalled();
  });
});
