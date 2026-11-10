import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect } from 'react';
import type { Question } from '../../domain/types';
import { TEST_TOPICS } from '../../primer/testTopics';
import { PanelProvider, usePanels, usePanelState } from '../panels/PanelProvider';
import { CommandHelpButton } from './CommandHelpButton';
import { CommandHelpPanel } from './CommandHelpPanel';
import { TopicView } from './TopicView';
import { PrimerScreen } from './PrimerScreen';

vi.mock('../../primer/topics', async () => (await import('../../primer/testTopics')).mockTopicsModule());

const topic = (id: string) => TEST_TOPICS.find((t) => t.id === id)!;

const question = (stem: string): Question => ({
  id: 'q1',
  exam: 'DA0-002',
  source: 'ours',
  type: 'mcq-single',
  objectiveIds: ['1.1'],
  difficulty: 1,
  stem,
  payload: { options: [] },
  answer: { correct: [] },
  explanation: 'e',
  acronyms: [],
  status: 'approved',
});

function Deadline({ ms }: { ms: number }) {
  const { setMockDeadline } = usePanels();
  useEffect(() => setMockDeadline(ms), [ms, setMockDeadline]);
  return null;
}

function App({ q, deadline }: { q: Question; deadline?: number }) {
  const api = usePanelState();
  return (
    <PanelProvider api={api}>
      {deadline !== undefined && <Deadline ms={deadline} />}
      <CommandHelpButton question={q} />
      {api.current === 'command-help' && <CommandHelpPanel />}
    </PanelProvider>
  );
}

describe('TopicView', () => {
  it('shows the exam layer and hides Learn more until pressed', async () => {
    render(<TopicView topic={topic('grep')} level={3} />);
    expect(screen.getByRole('heading', { level: 3, name: 'grep' })).toBeInTheDocument();
    expect(screen.getByText('What grep is for.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Worked example' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Exam trap' })).toBeInTheDocument();
    const more = screen.getByRole('button', { name: 'Learn more' });
    expect(more).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('heading', { name: 'More about grep' })).toBeNull();
    await userEvent.click(more);
    expect(more).toHaveAttribute('aria-expanded', 'true');
    const section = document.getElementById(more.getAttribute('aria-controls')!)!;
    expect(within(section).getByRole('heading', { level: 4, name: 'More about grep' })).toBeInTheDocument();
    expect(within(section).getByRole('table', { name: 'More about grep: Bash and PowerShell' })).toBeInTheDocument();
  });

  it('FormsTable is a table with a caption and labelled cells', () => {
    render(<TopicView topic={topic('grep')} level={3} />);
    const table = screen.getByRole('table', { name: 'grep: Bash and PowerShell' });
    expect(within(table).getAllByRole('columnheader').map((c) => c.textContent)).toEqual(['Bash', 'PowerShell', 'What it does']);
    const cells = table.querySelectorAll('td');
    expect(cells.length).toBe(3);
    expect([...cells].map((c) => c.getAttribute('data-label'))).toEqual(['Bash', 'PowerShell', 'What it does']);
    expect(within(table).getByText('grep -x').tagName).toBe('CODE');
  });

  it('a single-column topic shows where and two columns', () => {
    render(<TopicView topic={topic('sql')} level={3} />);
    expect(screen.getByText('You type these at a database prompt.')).toBeInTheDocument();
    const table = screen.getByRole('table', { name: 'sql: what to type' });
    expect(within(table).getAllByRole('columnheader').map((c) => c.textContent)).toEqual(['Type this', 'What it does']);
  });

  it('external links open in a new tab and say so', async () => {
    render(<TopicView topic={topic('grep')} level={3} />);
    await userEvent.click(screen.getByRole('button', { name: 'Learn more' }));
    const link = screen.getByRole('link', { name: /grep manual/ });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
    expect(link).toHaveAccessibleName(expect.stringMatching(/\(opens in a new tab\)$/));
    expect(screen.getByText('Links open in a new tab and need an internet connection.')).toBeInTheDocument();
  });
});

describe('Command help', () => {
  it('renders nothing for a question with no topic', () => {
    render(<App q={question('Pick the best chart.')} />);
    expect(screen.queryByRole('button', { name: 'Command help' })).toBeNull();
  });

  it('renders nothing while a mock deadline is set', () => {
    render(<App q={question('Run `grep x f`.')} deadline={Date.now() + 60_000} />);
    expect(screen.queryByRole('button', { name: 'Command help' })).toBeNull();
  });

  it('opens the panel with the first matched topic shown and returns focus to the button on Close', async () => {
    render(<App q={question('Run `sed s/a/b/ f | grep b`.')} />);
    const button = screen.getByRole('button', { name: 'Command help' });
    expect(button).toHaveAttribute('aria-haspopup', 'dialog');
    await userEvent.click(button);
    const dialog = screen.getByRole('dialog', { name: 'Command help' });
    expect(within(dialog).getByRole('heading', { level: 3, name: 'grep' })).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(button).toHaveFocus();
  });

  it('the panel offers the other matched topics and the shell basics; choosing one shows it with Learn more closed', async () => {
    render(<App q={question('Run `sed s/a/b/ f | grep b`.')} />);
    await userEvent.click(screen.getByRole('button', { name: 'Command help' }));
    const dialog = screen.getByRole('dialog', { name: 'Command help' });
    expect(within(dialog).getByRole('button', { name: 'grep' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Learn more' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'sed' }));
    expect(within(dialog).getByRole('button', { name: 'sed' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(dialog).getByRole('heading', { level: 3, name: 'sed' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Learn more' })).toHaveAttribute('aria-expanded', 'false');
    expect(within(dialog).getByRole('heading', { name: 'Shell basics' })).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'paths' }));
    expect(within(dialog).getByRole('heading', { level: 3, name: 'paths' })).toBeInTheDocument();
  });
});

describe('PrimerScreen', () => {
  it('lists Shell basics first, then the exam groups', () => {
    render(<PrimerScreen examCode="DA0-002" />);
    expect(screen.getByRole('heading', { level: 2, name: 'Command primer: DA0-002' })).toHaveFocus();
    const h3 = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(h3).toEqual(['Practice safely', 'Shell basics', 'Working with text']);
    expect(screen.getByRole('heading', { level: 4, name: 'terminal' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 4, name: 'grep' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 4, name: 'sed' })).not.toBeInTheDocument();
  });

  it('Show all topics adds topics this exam does not use', async () => {
    render(<PrimerScreen examCode="DA0-002" />);
    const toggle = screen.getByRole('button', { name: 'Show all topics' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('heading', { level: 4, name: 'sed' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Data (SQL and pandas)' })).toBeInTheDocument();
    await userEvent.click(toggle);
    expect(screen.queryByRole('heading', { level: 4, name: 'sed' })).not.toBeInTheDocument();
  });

  it('a contents button moves focus to the topic heading', async () => {
    render(<PrimerScreen examCode="DA0-002" />);
    const contents = screen.getByRole('navigation', { name: 'Topics on this page' });
    await userEvent.click(within(contents).getByRole('button', { name: 'grep' }));
    expect(screen.getByRole('heading', { level: 4, name: 'grep' })).toHaveFocus();
  });

  it('practice links are external', () => {
    render(<PrimerScreen examCode="DA0-002" />);
    const link = screen.getByRole('link', { name: /Try Linux/ });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByText('A whole system in your browser.', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Links open in a new tab and need an internet connection.')).toBeInTheDocument();
  });
});
