import { dataPlusQuestions } from '../banks/dataplus/questions';
import type { AssembledExam } from './assemble';
import type { MockInProgress } from './inProgress';

/** Test data: a two-item DA0-002 mock in progress, built from approved MCQs in the bank. */
export function sampleMock(over: Partial<MockInProgress> = {}): MockInProgress {
  const qs = dataPlusQuestions.filter((q) => q.type.startsWith('mcq') && q.status === 'approved').slice(0, 2);
  const exam: AssembledExam = {
    exam: 'DA0-002',
    seed: 42,
    items: qs.map((question) => ({ question, optionOrder: (question.payload as { options: { id: string }[] }).options.map((o) => o.id) })),
    mcqCount: qs.length,
    pbqWeightSum: 0,
  };
  const first = qs[0];
  return {
    exam,
    startedAt: new Date(1_000_000).toISOString(),
    savedAt: new Date(1_060_000).toISOString(),
    responses: { [first.id]: [(first.answer as { correct: string[] }).correct[0]] },
    flagged: [qs[1].id],
    ...over,
  };
}
