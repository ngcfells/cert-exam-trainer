import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { dataPlusFixtureQuestions } from '../../banks/dataplus/fixture';
import type { Question } from '../../domain/types';
import { ReviewScreen } from './ReviewScreen';

const mcqs = dataPlusFixtureQuestions.filter((q) => q.type.startsWith('mcq'));
const order = dataPlusFixtureQuestions.find((q) => q.type === 'pbq-order')!;
const questions: Question[] = [...mcqs.map((q) => ({ ...q, status: 'approved' as const })), { ...order, status: 'draft' }];

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const posted = (i = 0) => JSON.parse(fetchMock.mock.calls[i][1].body as string) as { question: Question; note?: string };

describe('ReviewScreen', () => {
  it('lists approved items by default with the answer key and explanation', () => {
    render(<ReviewScreen examCode="DA0-002" questions={questions} onExit={() => {}} />);
    expect(screen.getByText(`Item 1 of ${mcqs.length}`)).toBeInTheDocument();
    expect(screen.getByText(mcqs[0].stem)).toBeInTheDocument();
    const key = screen.getByRole('region', { name: 'Answer key' });
    expect(within(key).getByText('Primary key')).toBeInTheDocument();
    expect(within(key).getByText(mcqs[0].explanation)).toBeInTheDocument();
  });

  it('filters by status, objective and type', async () => {
    const user = userEvent.setup();
    render(<ReviewScreen examCode="DA0-002" questions={questions} onExit={() => {}} />);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'all');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Type' }), 'pbq-order');
    expect(screen.getByText('Item 1 of 1')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Answer key' })).getAllByRole('row').length).toBeGreaterThan(1);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Objective' }), '5.4');
    expect(screen.getByText('No items match.')).toBeInTheDocument();
  });

  it('filters to typed-number items', async () => {
    const user = userEvent.setup();
    const num = dataPlusFixtureQuestions.find((q) => q.type === 'numeric')!;
    render(<ReviewScreen examCode="DA0-002" questions={[...questions, { ...num, status: 'approved' }]} onExit={() => {}} />);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Type' }), 'numeric');
    expect(screen.getByText('Item 1 of 1')).toBeInTheDocument();
  });

  it('approve posts the item as approved and moves on', async () => {
    const user = userEvent.setup();
    render(<ReviewScreen examCode="DA0-002" questions={questions} onExit={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Approve' }));
    expect(fetchMock).toHaveBeenCalledWith('/__review/item', expect.objectContaining({ method: 'POST' }));
    expect(posted().question).toMatchObject({ id: mcqs[0].id, status: 'approved' });
    expect(await screen.findByText(`Item 2 of ${mcqs.length}`)).toBeInTheDocument();
  });

  it('reject needs a note and posts the item back to draft', async () => {
    const user = userEvent.setup();
    render(<ReviewScreen examCode="DA0-002" questions={questions} onExit={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Reject' }));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Say why you are rejecting it.');
    await user.type(screen.getByRole('textbox', { name: 'Reject note' }), 'Two answers are defensible');
    await user.click(screen.getByRole('button', { name: 'Reject' }));
    expect(posted()).toMatchObject({ question: { id: mcqs[0].id, status: 'draft' }, note: 'Two answers are defensible' });
    expect(await screen.findByText(`Item 1 of ${mcqs.length - 1}`)).toBeInTheDocument();
  });

  it('edit validates the JSON and saves it', async () => {
    const user = userEvent.setup();
    render(<ReviewScreen examCode="DA0-002" questions={questions} onExit={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const box = screen.getByRole('textbox', { name: 'Item JSON' });
    await user.clear(box);
    await user.click(box);
    await user.paste('{"id":"x"}');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/^type: /);
    expect(fetchMock).not.toHaveBeenCalled();
    await user.clear(box);
    await user.paste(JSON.stringify({ ...questions[0], stem: 'A new stem?' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(posted().question.stem).toBe('A new stem?');
    expect(await screen.findByText('A new stem?')).toBeInTheDocument();
  });

  it('shows a server error and stays on the item', async () => {
    fetchMock.mockResolvedValueOnce(new Response('bad objective', { status: 400 }));
    const user = userEvent.setup();
    render(<ReviewScreen examCode="DA0-002" questions={questions} onExit={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Approve' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('bad objective');
    expect(screen.getByText(`Item 1 of ${mcqs.length}`)).toBeInTheDocument();
  });

  it('summarises bank checks', () => {
    render(<ReviewScreen examCode="DA0-002" questions={questions} onExit={() => {}} />);
    const checks = screen.getByRole('region', { name: 'Bank checks' });
    expect(within(checks).getByText(/MCQs: 3 of 500/)).toBeInTheDocument();
    expect(within(checks).getByText(/PBQs: 0 of 80/)).toBeInTheDocument();
    expect(within(checks).getByRole('table', { name: 'Objective coverage' })).toBeInTheDocument();
    expect(within(checks).getByText(/Near duplicates: 0/)).toBeInTheDocument();
  });
});
