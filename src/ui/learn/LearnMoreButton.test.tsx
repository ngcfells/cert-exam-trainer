import { describe, it, expect } from 'vitest';
import { useEffect } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Question } from '../../domain/types';
import { mcq } from '../../exam/testFixtures';
import { WithPanels } from '../panels/testPanels';
import { usePanels } from '../panels/PanelProvider';
import { LearnMoreButton } from './LearnMoreButton';

function q(over: Partial<Question> = {}): Question {
  return { ...mcq('L1', '1'), exam: 'AT0-001', searchTerm: 'DNS TTL', ...over };
}

function InMock({ question }: { question: Question }) {
  const { setMockDeadline } = usePanels();
  useEffect(() => setMockDeadline(Date.now() + 60_000), [setMockDeadline]);
  return <LearnMoreButton question={question} />;
}

function view(question: Question) {
  return render(<WithPanels><LearnMoreButton question={question} /></WithPanels>);
}

describe('LearnMoreButton', () => {
  it('is a labelled button that opens and closes a menu', async () => {
    view(q());
    const btn = screen.getByRole('button', { name: /learn more/i });
    expect(btn).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link')).toBeNull();
    await userEvent.click(btn);
    expect(btn).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(btn);
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('lists the exam sources as new-tab links carrying the encoded phrase', async () => {
    view(q());
    await userEvent.click(screen.getByRole('button', { name: /learn more/i }));
    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThan(1);
    for (const a of links) {
      expect(a).toHaveAttribute('target', '_blank');
      expect(a.getAttribute('rel')).toContain('noopener');
      expect(a.getAttribute('rel')).toContain('noreferrer');
      expect(a.getAttribute('href')).toContain('DNS%20TTL');
    }
    expect(screen.getByRole('link', { name: /W3Schools/ })).toBeInTheDocument();
  });

  it('keeps an ampersand in the phrase from adding a parameter', async () => {
    view(q({ searchTerm: undefined, acronyms: ['C#', 'R&D'] }));
    await userEvent.click(screen.getByRole('button', { name: /learn more/i }));
    const href = screen.getByRole('link', { name: /MDN/ }).getAttribute('href')!;
    expect(href).toContain('C%23%20R%26D');
    expect(href.split('?')[1].split('&')).toHaveLength(1);
  });

  it('closes on Escape and returns focus to the button', async () => {
    view(q());
    const btn = screen.getByRole('button', { name: /learn more/i });
    await userEvent.click(btn);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('link')).toBeNull();
    expect(btn).toHaveFocus();
  });

  it('offers only the web search for an exam with no sources of its own', async () => {
    view(q({ exam: 'USER-1' }));
    await userEvent.click(screen.getByRole('button', { name: /learn more/i }));
    const list = screen.getByRole('list');
    expect(within(list).getAllByRole('link')).toHaveLength(1);
    expect(screen.getByRole('link', { name: /Web search/ })).toBeInTheDocument();
  });

  it('is hidden during a live mock', () => {
    render(<WithPanels><InMock question={q()} /></WithPanels>);
    expect(screen.queryByRole('button', { name: /learn more/i })).toBeNull();
  });
});
