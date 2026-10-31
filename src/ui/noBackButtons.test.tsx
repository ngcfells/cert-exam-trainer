import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { createMemoryRepo } from '../storage/memoryRepo';
import { MyQuestions } from './author/MyQuestions';
import { MockExamFlow } from './exam/MockExamFlow';
import { CramFlow } from './study/CramFlow';
import { PracticeFlow } from './study/PracticeFlow';
import { ProgressScreen } from './study/ProgressScreen';

// The nav bar is the one way back, so no screen carries its own.
const OLD_BACK = /^(back|cancel|back to .*)$/i;

const screens: [string, () => ReactElement, RegExp][] = [
  ['mock setup', () => <MockExamFlow repo={createMemoryRepo()} examCode="DA0-002" seed={1} />, /^Mock exam:/],
  ['practice setup', () => <PracticeFlow repo={createMemoryRepo()} examCode="DA0-002" seed={1} />, /^Practice:/],
  ['cram setup', () => <CramFlow repo={createMemoryRepo()} examCode="DA0-002" seed={1} />, /^Cram:/],
  ['progress', () => <ProgressScreen repo={createMemoryRepo()} examCode="DA0-002" />, /^Progress:/],
  ['my questions', () => <MyQuestions repo={createMemoryRepo()} examCode="DA0-002" onEdit={() => {}} />, /^My questions:/],
];

describe('no in-screen back buttons', () => {
  for (const [name, ui, heading] of screens) {
    it(name, async () => {
      render(ui());
      expect(await screen.findByRole('heading', { level: 2, name: heading })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: OLD_BACK })).not.toBeInTheDocument();
    });
  }
});
