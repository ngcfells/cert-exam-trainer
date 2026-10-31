import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { LEAVE_RUN, LeaveGuardProvider, LeaveGuards, useLeaveGuard } from './nav';

function Guarded({ active, message }: { active: boolean; message?: string }) {
  useLeaveGuard(active, message);
  return null;
}

afterEach(() => vi.restoreAllMocks());

describe('leave guards', () => {
  it('lets the user leave without asking when nothing is guarded', () => {
    const confirm = vi.spyOn(window, 'confirm');
    const guards = new LeaveGuards();
    render(
      <LeaveGuardProvider guards={guards}>
        <Guarded active={false} />
      </LeaveGuardProvider>,
    );
    expect(guards.confirmLeave()).toBe(true);
    expect(confirm).not.toHaveBeenCalled();
  });

  it('asks with the run message while active, and stops asking once cleared or unmounted', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const guards = new LeaveGuards();
    const ui = (active: boolean) => (
      <LeaveGuardProvider guards={guards}>
        <Guarded active={active} />
      </LeaveGuardProvider>
    );
    const { rerender, unmount } = render(ui(true));
    expect(guards.confirmLeave()).toBe(false);
    expect(confirm).toHaveBeenCalledWith(LEAVE_RUN);

    confirm.mockReturnValue(true);
    expect(guards.confirmLeave()).toBe(true);

    confirm.mockClear();
    rerender(ui(false));
    expect(guards.confirmLeave()).toBe(true);
    expect(confirm).not.toHaveBeenCalled();

    rerender(ui(true));
    unmount();
    expect(guards.confirmLeave()).toBe(true);
    expect(confirm).not.toHaveBeenCalled();
  });

  it('uses the newest guard message', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const guards = new LeaveGuards();
    render(
      <LeaveGuardProvider guards={guards}>
        <Guarded active />
        <Guarded active message="Discard your changes?" />
      </LeaveGuardProvider>,
    );
    guards.confirmLeave();
    expect(confirm).toHaveBeenCalledWith('Discard your changes?');
  });
});
