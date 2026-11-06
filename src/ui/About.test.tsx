import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { About } from './About';
import { DISCLAIMER_POINTS, REPORT_PRIVACY } from './legal';

describe('About', () => {
  it('shows name, disclaimer, licenses, version, privacy and user-content lines', () => {
    render(<About />);
    const h = screen.getByRole('heading', { name: 'About Cert Exam Trainer' });
    expect(h).toHaveFocus();
    const list = screen.getByRole('list', { name: 'Disclaimer' });
    expect(within(list).getAllByRole('listitem').map((li) => li.textContent)).toEqual([...DISCLAIMER_POINTS]);
    expect(screen.getByText('Free to use and share, including by businesses and trainers. You may not sell it or charge for access to it.')).toBeInTheDocument();
    expect(screen.getByText(/MIT with the Commons Clause/)).toBeInTheDocument();
    expect(screen.getByText(/CC BY-NC 4\.0/)).toBeInTheDocument();
    expect(screen.getByText(`Version ${__APP_VERSION__}`)).toBeInTheDocument();
    expect(screen.getByText('Your progress and questions stay in this browser. The app sends nothing over the network unless you send a report.')).toBeInTheDocument();
    expect(screen.getByText('Questions you add or import are yours; do not add copyrighted exam content.')).toBeInTheDocument();
  });

  it('says what a report sends', () => {
    render(<About />);
    expect(screen.getByText(REPORT_PRIVACY)).toBeInTheDocument();
    expect(REPORT_PRIVACY).toBe(
      'A report sends what you type and the app version, and for a problem with a question, which question. If you leave technical details ticked, it also sends the exam, mode and browser. Your answers and saved data are never sent.',
    );
  });

  it('shows the online-app line on file:', () => {
    render(<About protocol="file:" />);
    const link = screen.getByRole('link', { name: 'the online app' });
    expect(link).toHaveAttribute('href', 'https://ngcfells.github.io/cert-exam-trainer/');
    expect(link.closest('p')).toHaveTextContent('To report a problem, use the online app.');
  });

  it('has the Ko-fi tip link', () => {
    render(<About />);
    expect(screen.getByText('If you would like to help cover the costs of development, you can leave a tip on Ko-fi.')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /Tips/ });
    expect(link).toHaveAccessibleName('Tips (opens Ko-fi in a new tab)');
    expect(link).toHaveAttribute('href', 'https://ko-fi.com/M5K429C47U');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('has no in-screen Back; the nav bar is the way out', () => {
    render(<About />);
    expect(screen.queryByRole('button', { name: /back/i })).not.toBeInTheDocument();
  });
});
