import type { Question } from '../../domain/types';
import { cysaItems } from './items';
import { cysaFixtureQuestions } from './fixture';

// Unit tests and the e2e build set VITE_BANK=fixture so they run against a small fixed bank.
export const cysaQuestions: Question[] = import.meta.env.VITE_BANK === 'fixture' ? cysaFixtureQuestions : cysaItems;
