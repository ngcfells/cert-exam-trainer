import { createRegistry } from './registry';
import { dataPlusMeta } from './dataplus/meta';
import { dataPlusQuestions } from './dataplus/questions';
import { secAiMeta } from './secai/meta';
import { secAiQuestions } from './secai/questions';
import { autoOpsMeta } from './autoops/meta';
import { autoOpsQuestions } from './autoops/questions';
import { cysaMeta } from './cysa/meta';
import { cysaQuestions } from './cysa/questions';

const registry = createRegistry();
registry.registerExam(dataPlusMeta, dataPlusQuestions);
registry.registerExam(secAiMeta, secAiQuestions);
registry.registerExam(autoOpsMeta, autoOpsQuestions);
registry.registerExam(cysaMeta, cysaQuestions);

export const { registerExam, listExams, getBundledQuestions } = registry;
