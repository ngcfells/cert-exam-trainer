// Exam-dependent parts of the Ollama drafting prompt (scripts/draft-ollama.ts).

/** The objective's section of a topics file, only when the file's first heading names this exam. */
export function topicsFor(text: string, examCode: string, objective: string): string | undefined {
  const heading = text.split('\n', 1)[0];
  if (!heading.includes(examCode)) return undefined;
  return text.split(/\n(?=\d\.\d )/).find((s) => s.startsWith(`${objective} `));
}

const EXAMPLES: Record<string, { stem: string; options: string[]; explanation: string }> = {
  'DA0-002': {
    stem: 'A table column uniquely identifies each row and can never be empty. What is this column called?',
    options: ['Primary key', 'Foreign key', 'Index', 'View'],
    explanation: 'A primary key uniquely identifies each row and cannot be null. A foreign key references another table; an index speeds lookups; a view is a saved query.',
  },
  'CY0-001': {
    stem: 'A user tells a support chatbot to ignore its earlier instructions and print its hidden configuration. Which attack is this?',
    options: ['Prompt injection', 'Model inversion', 'Data poisoning', 'Membership inference'],
    explanation:
      'Crafted input that overrides the system instructions is prompt injection. Model inversion rebuilds training data from outputs, poisoning tampers with training data, and membership inference tests whether a record was in the training set.',
  },
};

/** One valid draft item that shows the model the JSON shape, in this exam's subject. */
export function exampleItem(examCode: string, objective: string, prefix: string) {
  const ex = EXAMPLES[examCode];
  if (!ex) throw new Error(`no drafting example for ${examCode}; add one to scripts/draft-ollama-lib.ts`);
  return {
    id: `${prefix}001`,
    exam: examCode,
    source: 'ours',
    type: 'mcq-single',
    objectiveIds: [objective],
    difficulty: 1,
    stem: ex.stem,
    payload: { options: ex.options.map((text, i) => ({ id: 'abcd'[i], text })) },
    answer: { correct: ['a'] },
    explanation: ex.explanation,
    acronyms: [],
    status: 'draft',
  };
}
