import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRepo } from '../../storage/memoryRepo';
import type { Repo } from '../../storage';
import { MAX_OUTBOX, type OutboxReport } from '../../report/outbox';
import { reportConfig } from '../../report/config';
import { WithPanels, PanelProbe } from '../panels/testPanels';
import { usePanels } from '../panels/PanelProvider';
import { ReportButton, type ReportContext } from './ReportButton';
import { ReportPanel } from './ReportPanel';

vi.mock('../../report/config', () => ({
  reportConfig: vi.fn(() => ({ url: 'https://relay.test', siteKey: '0xKEY' })),
}));

const getToken = vi.fn<() => Promise<string>>();
vi.mock('../../report/turnstile', () => ({
  SPAM_CHECK_MESSAGE: 'The spam check could not finish. Check your connection and try again.',
  useTurnstile: () => ({ boxRef: { current: null }, getToken }),
}));

const QCTX: ReportContext = { questionId: 'da2-1-1-mcq-004', exam: 'DA0-002', mode: 'practice' };

interface Posted {
  url: string;
  body: Record<string, unknown>;
}
let posted: Posted[];
let replies: { status: number; body: unknown }[];

function stubRelay() {
  posted = [];
  replies = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (u: RequestInfo | URL, init?: RequestInit) => {
      posted.push({ url: String(u), body: JSON.parse(String(init?.body)) });
      const r = replies.shift() ?? { status: 201, body: { number: 99, url: 'https://github.com/ngcfells/cert-exam-trainer/issues/99' } };
      return new Response(JSON.stringify(r.body), { status: r.status });
    }),
  );
}

function Host({ repo }: { repo: Repo }) {
  const { current } = usePanels();
  return current === 'report' ? <ReportPanel repo={repo} /> : null;
}

function MockRunning() {
  const { setMockDeadline } = usePanels();
  useEffect(() => setMockDeadline(Date.now() + 60_000), [setMockDeadline]);
  return null;
}

function setup(context: ReportContext = QCTX, repo: Repo = createMemoryRepo()) {
  const user = userEvent.setup();
  render(
    <WithPanels>
      <ReportButton context={context} />
      <Host repo={repo} />
      <PanelProbe />
    </WithPanels>,
  );
  return { user, repo };
}

async function openAndFill(user: ReturnType<typeof userEvent.setup>, title = 'Wrong key', details = 'B is right.') {
  await user.click(screen.getByRole('button', { name: 'Report a problem' }));
  const dialog = await screen.findByRole('dialog', { name: 'Report a problem or request a feature' });
  if (title) await user.type(within(dialog).getByLabelText(/^Title/), title);
  if (details) await user.type(within(dialog).getByLabelText(/^Details/), details);
  return dialog;
}

let online = true;
beforeEach(() => {
  online = true;
  vi.spyOn(navigator, 'onLine', 'get').mockImplementation(() => online);
  getToken.mockReset();
  let n = 0;
  getToken.mockImplementation(async () => `token-${++n}`);
  stubRelay();
  vi.mocked(reportConfig).mockReturnValue({ url: 'https://relay.test', siteKey: '0xKEY' });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('ReportButton', () => {
  it('hides the button when reports are off', () => {
    vi.mocked(reportConfig).mockReturnValue(null);
    setup();
    expect(screen.queryByRole('button', { name: 'Report a problem' })).toBeNull();
  });

  it('hides the button while a mock is running', async () => {
    render(
      <WithPanels>
        <MockRunning />
        <ReportButton context={QCTX} />
      </WithPanels>,
    );
    await act(async () => {});
    expect(screen.queryByRole('button', { name: 'Report a problem' })).toBeNull();
  });

  it('opens a dialog', async () => {
    const { user } = setup();
    const btn = screen.getByRole('button', { name: 'Report a problem' });
    expect(btn).toHaveAttribute('aria-haspopup', 'dialog');
    await user.click(btn);
    expect(screen.getByTestId('panel-probe')).toHaveAttribute('data-current', 'report');
  });
});

describe('ReportForm', () => {
  it('defaults to a question problem when opened from a question', async () => {
    const { user } = setup();
    const dialog = await openAndFill(user, '', '');
    expect(within(dialog).getByRole('radio', { name: 'A problem with this question' })).toBeChecked();
    expect(within(dialog).getByRole('radio', { name: 'A bug in the app' })).not.toBeChecked();
    expect(within(dialog).getByText('Your report becomes a public issue on GitHub.')).toBeInTheDocument();
    expect(within(dialog).getByText('Email or GitHub name. Issues are public, so this will be public too.')).toBeInTheDocument();
    expect(within(dialog).getByRole('checkbox', { name: 'Include technical details' })).toBeChecked();
  });

  it('offers only bug and feature without a question', async () => {
    const { user } = setup({});
    const dialog = await openAndFill(user, '', '');
    expect(within(dialog).queryByRole('radio', { name: 'A problem with this question' })).toBeNull();
    expect(within(dialog).getByRole('radio', { name: 'A bug in the app' })).toBeChecked();
    expect(within(dialog).getByRole('radio', { name: 'A feature request' })).toBeInTheDocument();
  });

  it('shows an error summary for an empty title and moves focus to it', async () => {
    const { user } = setup();
    const dialog = await openAndFill(user, '', 'Some details');
    await user.click(within(dialog).getByRole('button', { name: 'Send' }));
    const summary = await within(dialog).findByRole('group', { name: /problem to fix/ });
    await waitFor(() => expect(summary).toHaveFocus());
    const link = within(summary).getByRole('link', { name: 'Enter a title' });
    const title = within(dialog).getByLabelText(/^Title/);
    expect(title).toHaveAttribute('aria-invalid', 'true');
    await user.click(link);
    expect(title).toHaveFocus();
    expect(posted).toHaveLength(0);
  });

  it('sends and shows the issue link', async () => {
    const { user } = setup();
    const dialog = await openAndFill(user);
    await user.click(within(dialog).getByRole('button', { name: 'Send' }));
    const done = await within(dialog).findByText('Sent, thank you.');
    await waitFor(() => expect(done.closest('[tabindex="-1"]')).toHaveFocus());
    const link = within(dialog).getByRole('link', { name: /View issue #99/ });
    expect(link).toHaveAttribute('href', 'https://github.com/ngcfells/cert-exam-trainer/issues/99');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(posted).toHaveLength(1);
    expect(posted[0].url).toBe('https://relay.test/report');
    expect(posted[0].body).toMatchObject({
      type: 'question',
      title: 'Wrong key',
      details: 'B is right.',
      questionId: 'da2-1-1-mcq-004',
      version: __APP_VERSION__,
      turnstileToken: 'token-1',
      context: { exam: 'DA0-002', mode: 'practice' },
    });
    expect((posted[0].body.context as { userAgent: string }).userAgent).toBe(navigator.userAgent);
  });

  it('sends no context when the box is unticked', async () => {
    const { user } = setup();
    const dialog = await openAndFill(user);
    await user.click(within(dialog).getByRole('checkbox', { name: 'Include technical details' }));
    await user.click(within(dialog).getByRole('button', { name: 'Send' }));
    await within(dialog).findByText('Sent, thank you.');
    expect(posted[0].body).not.toHaveProperty('context');
    expect(posted[0].body.questionId).toBe('da2-1-1-mcq-004');
  });

  it('saves to the outbox when offline and sends later with a fresh token', async () => {
    online = false;
    const { user, repo } = setup();
    const dialog = await openAndFill(user);
    await user.click(within(dialog).getByRole('button', { name: 'Send' }));
    await within(dialog).findByText('Saved on this device. You can send it when you are back online.');
    expect(getToken).not.toHaveBeenCalled();
    const saved = await repo.listOutbox();
    expect(saved).toHaveLength(1);
    expect(saved[0]).not.toHaveProperty('turnstileToken');

    online = true;
    const waiting = within(dialog).getByRole('region', { name: 'Waiting to send' });
    await user.click(within(waiting).getByRole('button', { name: 'Send Wrong key' }));
    await within(waiting).findByRole('link', { name: /View issue #99/ });
    expect(getToken).toHaveBeenCalledTimes(1);
    expect(posted[0].body.turnstileToken).toBe('token-1');
    expect(posted[0].body.id).toBe(saved[0].id);
    expect(posted[0].body).not.toHaveProperty('savedAt');
    expect(await repo.listOutbox()).toHaveLength(0);
  });

  it('saves to the outbox when the relay cannot be reached', async () => {
    const { user, repo } = setup();
    replies.push({ status: 503, body: {} });
    const dialog = await openAndFill(user);
    await user.click(within(dialog).getByRole('button', { name: 'Send' }));
    await within(dialog).findByText('Saved on this device. You can send it when you are back online.');
    expect(await repo.listOutbox()).toHaveLength(1);
  });

  it('keeps the same id and the text when retrying a failed send', async () => {
    const { user } = setup();
    replies.push({ status: 400, body: { error: 'Something was wrong' } });
    const dialog = await openAndFill(user);
    await user.click(within(dialog).getByRole('button', { name: 'Send' }));
    await within(dialog).findByText('Something was wrong');
    expect(within(dialog).getByLabelText(/^Title/)).toHaveValue('Wrong key');
    await user.click(within(dialog).getByRole('button', { name: 'Send' }));
    await within(dialog).findByText('Sent, thank you.');
    expect(posted).toHaveLength(2);
    expect(posted[1].body.id).toBe(posted[0].body.id);
    expect(posted[1].body.turnstileToken).toBe('token-2');
  });

  it('shows the spam-check error and keeps the text', async () => {
    getToken.mockRejectedValueOnce(new Error('The spam check could not finish. Check your connection and try again.'));
    const { user } = setup();
    const dialog = await openAndFill(user);
    await user.click(within(dialog).getByRole('button', { name: 'Send' }));
    await within(dialog).findByText('The spam check could not finish. Check your connection and try again.');
    expect(within(dialog).getByLabelText(/^Details/)).toHaveValue('B is right.');
    expect(posted).toHaveLength(0);
  });

  it('shows the full-outbox message', async () => {
    online = false;
    const repo = createMemoryRepo();
    for (let i = 1; i <= MAX_OUTBOX; i++) {
      const r: OutboxReport = {
        id: `3b241101-e2bb-4255-8caf-${String(i).padStart(12, '0')}`,
        type: 'bug',
        title: `Old ${i}`,
        details: 'x',
        version: '0.1.0',
        savedAt: '2026-11-06T12:00:00.000Z',
      };
      await repo.putOutbox(r);
    }
    const { user } = setup(QCTX, repo);
    const dialog = await openAndFill(user);
    await user.click(within(dialog).getByRole('button', { name: 'Send' }));
    await within(dialog).findByText('10 reports are already waiting. Send or discard one first.');
    expect(within(dialog).getByLabelText(/^Title/)).toHaveValue('Wrong key');
  });

  it('opening from inside another panel returns focus to that panel opener', async () => {
    const user = userEvent.setup();
    function Opener() {
      const { open, current } = usePanels();
      return (
        <>
          <button type="button" onClick={(e) => open('settings', e.currentTarget)}>
            Settings
          </button>
          {current === 'settings' && (
            <dialog open className="panel">
              <ReportButton context={{}} label="Report a bug or request a feature" />
            </dialog>
          )}
        </>
      );
    }
    render(
      <WithPanels>
        <Opener />
        <Host repo={createMemoryRepo()} />
      </WithPanels>,
    );
    const settings = screen.getByRole('button', { name: 'Settings' });
    await user.click(settings);
    await user.click(screen.getByRole('button', { name: 'Report a bug or request a feature' }));
    const dialog = await screen.findByRole('dialog', { name: 'Report a problem or request a feature' });
    await user.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(settings).toHaveFocus());
  });
});
