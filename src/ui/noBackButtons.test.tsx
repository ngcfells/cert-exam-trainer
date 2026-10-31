import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { createMemoryRepo } from '../storage/memoryRepo';
import type { AssembledExam } from '../exam/assemble';
import { buildResult } from '../exam/result';
import { scoreExam } from '../exam/scoring';
import { mcq, meta3 } from '../exam/testFixtures';
import { About } from './About';
import { AcronymFlow } from './acronyms/AcronymFlow';
import { MyQuestions } from './author/MyQuestions';
import { MockExamFlow } from './exam/MockExamFlow';
import { ResultsScreen } from './exam/ResultsScreen';
import { LearnFlow } from './learn/LearnFlow';
import { SettingsScreen } from './SettingsScreen';
import { CramFlow } from './study/CramFlow';
import { PracticeFlow } from './study/PracticeFlow';
import { ProgressScreen } from './study/ProgressScreen';

// The nav bar is the one way back, so no screen carries its own.
const OLD_BACK = /^(back|cancel|back to .*|home|.*all exams)$/i;
const ANY = /./;

function results(): ReactElement {
  const exam: AssembledExam = { exam: 'T-001', seed: 1, items: [{ question: mcq('Q1', meta3.domains[0].id) }], mcqCount: 1, pbqWeightSum: 0 };
  const report = scoreExam(exam, {}, meta3);
  const result = buildResult({ exam, responses: {}, flagged: [], report, startedAt: new Date(0), finishedAt: new Date(1), autoSubmitted: false });
  return <ResultsScreen meta={meta3} exam={exam} result={result} report={report} saveError={null} />;
}

/** [name, screen, its heading, whether the heading takes focus on arrival] */
const screens: [string, () => ReactElement, RegExp, boolean][] = [
  ['mock setup', () => <MockExamFlow repo={createMemoryRepo()} examCode="DA0-002" seed={1} />, /^Mock exam:/, true],
  ['practice setup', () => <PracticeFlow repo={createMemoryRepo()} examCode="DA0-002" seed={1} />, /^Practice:/, true],
  ['cram setup', () => <CramFlow repo={createMemoryRepo()} examCode="DA0-002" seed={1} />, /^Cram:/, true],
  ['progress', () => <ProgressScreen repo={createMemoryRepo()} examCode="DA0-002" />, /^Progress:/, false],
  ['my questions', () => <MyQuestions repo={createMemoryRepo()} examCode="DA0-002" onEdit={() => {}} />, /^My questions:/, true],
  ['learn', () => <LearnFlow repo={createMemoryRepo()} examCode="DA0-002" />, ANY, false],
  ['acronyms', () => <AcronymFlow repo={createMemoryRepo()} examCode="DA0-002" seed={1} />, ANY, false],
  ['about', () => <About />, /^About/, true],
  ['settings', () => <SettingsScreen repo={createMemoryRepo()} />, /^Settings$/, true],
  ['results', results, ANY, false],
];

describe('no in-screen back buttons', () => {
  for (const [name, ui, heading, focused] of screens) {
    it(name, async () => {
      render(ui());
      const h = (await screen.findAllByRole('heading', { level: 2, name: heading }))[0];
      if (focused) expect(h).toHaveFocus();
      expect(screen.queryByRole('button', { name: OLD_BACK })).not.toBeInTheDocument();
    });
  }
});
