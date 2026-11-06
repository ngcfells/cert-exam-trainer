import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { mcq } from '../../exam/testFixtures';
import { PanelProbe, WithPanels } from '../panels/testPanels';
import { usePanels } from '../panels/PanelProvider';
import { StudyRunner, type StudyItem } from './StudyRunner';

vi.mock('../../report/config', () => ({ reportConfig: () => ({ url: 'https://relay.test', siteKey: '0xKEY' }) }));

const order = ['a', 'b', 'c', 'd'];
const items: StudyItem[] = [
  { kind: 'question', item: { question: mcq('A0', 'A'), optionOrder: order } },
  { kind: 'acronym', card: { term: 'SQL', expansion: 'Structured Query Language' } },
];

function ContextProbe() {
  const { reportContext } = usePanels();
  return <span data-testid="report-context">{JSON.stringify(reportContext)}</span>;
}

describe('StudyRunner report button', () => {
  it('shows Report a problem for the current question with its id', async () => {
    const user = userEvent.setup();
    render(
      <WithPanels>
        <StudyRunner items={items} feedback="instant" startedAt={new Date()} onFinish={() => {}} mode="practice" />
        <PanelProbe />
        <ContextProbe />
      </WithPanels>,
    );
    await user.click(screen.getByRole('button', { name: 'Report a problem' }));
    expect(screen.getByTestId('panel-probe')).toHaveAttribute('data-current', 'report');
    expect(JSON.parse(screen.getByTestId('report-context').textContent!)).toEqual({ questionId: 'A0', exam: mcq('A0', 'A').exam, mode: 'practice' });
  });

  it('shows no report button on an acronym card', async () => {
    const user = userEvent.setup();
    render(
      <WithPanels>
        <StudyRunner items={items} feedback="instant" startedAt={new Date()} onFinish={() => {}} mode="practice" />
      </WithPanels>,
    );
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.queryByRole('button', { name: 'Report a problem' })).toBeNull();
  });
});
