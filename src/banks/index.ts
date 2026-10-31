import { createRegistry } from './registry';
import { dataPlusMeta } from './dataplus/meta';
import { dataPlusQuestions } from './dataplus/questions';
import { secAiMeta } from './secai/meta';
import { secAiQuestions } from './secai/questions';

const registry = createRegistry();
registry.registerExam(dataPlusMeta, dataPlusQuestions);
registry.registerExam(secAiMeta, secAiQuestions);

export const { registerExam, listExams, getBundledQuestions } = registry;
