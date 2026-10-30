import type { Question } from '../../domain/types';
import { dataPlusItems } from './items';
import { dataPlusFixtureQuestions } from './fixture';

// Unit tests and the e2e build set VITE_BANK=fixture so they run against a small fixed bank.
export const dataPlusQuestions: Question[] =
  import.meta.env.VITE_BANK === 'fixture' ? dataPlusFixtureQuestions : dataPlusItems;
