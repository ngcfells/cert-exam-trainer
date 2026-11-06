import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LEAVE_MOCK, LEAVE_RUN, LeaveGuards, navBack, useLeaveGuard, useNavUp } from './nav';
import { LeaveGuardProvider, TestNav } from './testNav';

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

  it('a guard with onLeave calls it on OK and still stays on the screen', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const guards = new LeaveGuards();
    const onLeave = vi.fn();
    guards.add({ message: LEAVE_MOCK, onLeave });
    expect(guards.confirmLeave()).toBe(false);
    expect(confirm).toHaveBeenCalledWith(LEAVE_MOCK);
    expect(onLeave).toHaveBeenCalledTimes(1);
  });

  it('a guard with onLeave does nothing on Cancel', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const guards = new LeaveGuards();
    const onLeave = vi.fn();
    guards.add({ message: LEAVE_MOCK, onLeave });
    expect(guards.confirmLeave()).toBe(false);
    expect(onLeave).not.toHaveBeenCalled();
  });

  it('useLeaveGuard passes onLeave to its guard', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const guards = new LeaveGuards();
    const onLeave = vi.fn();
    function MockGuard() {
      useLeaveGuard(true, LEAVE_MOCK, onLeave);
      return null;
    }
    render(
      <LeaveGuardProvider guards={guards}>
        <MockGuard />
      </LeaveGuardProvider>,
    );
    expect(guards.confirmLeave()).toBe(false);
    expect(onLeave).toHaveBeenCalledTimes(1);
  });
});

function Level({ label, onUp }: { label: string | null; onUp: () => void }) {
  useNavUp(label, onUp);
  return null;
}

describe('inner levels and Back', () => {
  it('shows the inner level on the bar, swaps it, and clears it on unmount', async () => {
    const onUp = vi.fn();
    const ui = (label: string | null, show = true) => <TestNav>{show && <Level label={label} onUp={onUp} />}</TestNav>;
    const { rerender } = render(ui('← Back to lessons'));
    expect(screen.getByRole('button', { name: '← Back to lessons' })).toBeInTheDocument();

    rerender(ui('← Back to lesson'));
    expect(screen.queryByRole('button', { name: '← Back to lessons' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '← Back to lesson' }));
    expect(onUp).toHaveBeenCalledTimes(1);

    rerender(ui(null));
    expect(screen.getByRole('button', { name: '← Back' })).toBeInTheDocument();
    rerender(ui('← Back to lessons'));
    rerender(ui('← Back to lessons', false));
    expect(screen.getByRole('button', { name: '← Back' })).toBeInTheDocument();
  });

  it('navBack climbs the inner level, else goes to the parent, and does neither when the user stays', () => {
    const guards = new LeaveGuards();
    const api = { guards, setUp: () => {}, clearUp: () => {} };
    const onUp = vi.fn();
    const toParent = vi.fn();
    expect(navBack(api, { label: 'x', onUp }, toParent)).toBe(true);
    expect(onUp).toHaveBeenCalledTimes(1);
    expect(toParent).not.toHaveBeenCalled();
    expect(navBack(api, null, toParent)).toBe(true);
    expect(toParent).toHaveBeenCalledTimes(1);

    guards.add({ message: LEAVE_RUN });
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    expect(navBack(api, { label: 'x', onUp }, toParent)).toBe(false);
    expect(navBack(api, null, toParent)).toBe(false);
    expect(onUp).toHaveBeenCalledTimes(1);
    expect(toParent).toHaveBeenCalledTimes(1);
  });
});
