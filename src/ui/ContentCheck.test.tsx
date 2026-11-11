import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { CheckResult } from '../integrity/check';
import type { ExamDiff, Release } from '../integrity/manifest';
import { ContentCheck, describeDiff } from './ContentCheck';
import { Disclaimer } from './Disclaimer';
import { ONLINE_APP_URL } from './legal';

const release = { id: 'a'.repeat(64), date: '2026-11-10', commit: 'abc1234', appVersion: '0.1.0', exams: {} } as Release;
const diff = (over: Partial<ExamDiff> = {}): ExamDiff => ({
  exam: 'DA0-002', changed: [], missing: [], extra: [], metaDiffers: false, lessonsChanged: [], lessonsMissing: [], lessonsExtra: [], ...over,
});

async function checked(result: CheckResult, update = vi.fn<() => Promise<'reloading' | 'none'>>(async () => 'none')) {
  render(<ContentCheck check={async () => result} update={update} />);
  await userEvent.click(screen.getByRole('button', { name: 'Check content' }));
  return { status: screen.getByRole('status'), update };
}

describe('ContentCheck', () => {
  it('shows the section and nothing in the status before a check', () => {
    render(<ContentCheck check={vi.fn()} update={vi.fn()} />);
    expect(screen.getByRole('heading', { level: 3, name: 'Check the content' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('says Checking while it runs and disables the button', async () => {
    let finish: (r: CheckResult) => void = () => undefined;
    render(<ContentCheck check={() => new Promise<CheckResult>((r) => (finish = r))} update={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Check content' }));
    expect(screen.getByRole('status')).toHaveTextContent('Checking…');
    expect(screen.getByRole('button', { name: 'Check content' })).toBeDisabled();
    finish({ kind: 'error' });
    expect(await screen.findByText('Could not reach the official list. Check your connection and try again.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Check content' })).toBeEnabled();
  });

  it('verified: names the release date', async () => {
    const { status } = await checked({ kind: 'verified', release });
    expect(status).toHaveTextContent('Verified. The stock content matches the current official release (10 Nov 2026).');
    expect(screen.queryByRole('button', { name: 'Update now' })).not.toBeInTheDocument();
  });

  it('out of date: offers the update, and says so when none is there yet', async () => {
    const { status, update } = await checked({ kind: 'outdated', current: release });
    expect(status).toHaveTextContent('This content is official but out of date.');
    await userEvent.click(screen.getByRole('button', { name: 'Update now' }));
    expect(update).toHaveBeenCalledTimes(1);
    expect(status).toHaveTextContent('No newer version is available yet. Try again in a few minutes.');
    expect(screen.getByRole('button', { name: 'Update now' })).toBeEnabled();
  });

  it('out of date: waits for the reload when a newer version was found', async () => {
    await checked({ kind: 'outdated', current: release }, vi.fn<() => Promise<'reloading' | 'none'>>(async () => 'reloading'));
    await userEvent.click(screen.getByRole('button', { name: 'Update now' }));
    expect(screen.getByRole('button', { name: 'Update now' })).toBeDisabled();
    expect(screen.queryByText(/No newer version/)).not.toBeInTheDocument();
  });

  it('does not match: gives the counts and the official address', async () => {
    const { status } = await checked({
      kind: 'mismatch',
      diffs: [diff({ changed: ['q1', 'q2'], extra: ['q3'], lessonsMissing: ['l1'], metaDiffers: true }), diff({ exam: 'CY0-001', changed: ['q1'] })],
    });
    expect(status).toHaveTextContent('This content does not match any official release.');
    expect(within(status).getByText('DA0-002: 3 questions and 1 lesson differ; the exam details differ.')).toBeInTheDocument();
    expect(within(status).getByText('CY0-001: 1 question differs.')).toBeInTheDocument();
    expect(status).toHaveTextContent(`Do not rely on this copy. Use the official app at ${ONLINE_APP_URL}.`);
    expect(within(status).getByRole('link', { name: ONLINE_APP_URL })).toHaveAttribute('href', ONLINE_APP_URL);
    expect(screen.queryByRole('button', { name: 'Update now' })).not.toBeInTheDocument();
  });

  it('could not check: never says verified', async () => {
    const { status } = await checked({ kind: 'error' });
    expect(status).toHaveTextContent('Could not reach the official list. Check your connection and try again.');
    expect(status).not.toHaveTextContent('Verified');
  });
});

describe('describeDiff', () => {
  it('handles details only and lessons only', () => {
    expect(describeDiff(diff({ metaDiffers: true }))).toBe('DA0-002: the exam details differ.');
    expect(describeDiff(diff({ lessonsChanged: ['l1', 'l2'] }))).toBe('DA0-002: 2 lessons differ.');
  });
});

describe('Disclaimer', () => {
  it('says when the copy is not official, with the official address', () => {
    render(<Disclaimer official={false} />);
    expect(screen.getByText('This is not the official copy of Cert Exam Trainer.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: ONLINE_APP_URL })).toHaveAttribute('href', ONLINE_APP_URL);
  });

  it('says nothing extra in the official app', () => {
    render(<Disclaimer official />);
    expect(screen.queryByText(/not the official copy/)).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
