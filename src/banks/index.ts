import { createRegistry } from './registry';
import { dataPlusMeta } from './dataplus/meta';
import { dataPlusQuestions } from './dataplus/questions';

const registry = createRegistry();
registry.registerExam(dataPlusMeta, dataPlusQuestions);

export const { registerExam, listExams, getBundledQuestions } = registry;
