// Shared argument parsing for the drafting scripts: a required --exam <code>, other --name value
// flags, and the remaining positional arguments.
import { getBundledQuestions } from '../src/banks';
import { metaFor } from '../src/banks/metas';
import { bankFor } from '../src/banks/paths';
import type { ExamMeta, Question } from '../src/domain/types';

export interface ScriptArgs {
  flags: Record<string, string>;
  positional: string[];
}

export function parseArgs(argv: string[]): ScriptArgs {
  const flags: Record<string, string> = {};
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--') continue;
    if (a.startsWith('--')) {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith('--')) throw new Error(`${a} needs a value`);
      flags[a.slice(2)] = v;
      i++;
    } else positional.push(a);
  }
  return { flags, positional };
}

/** The exam named by --exam, with its metadata and every shipped item (drafts included). */
export function examFromArgs(args: ScriptArgs): { meta: ExamMeta; items: Question[] } {
  const code = args.flags.exam;
  if (!code) throw new Error('missing --exam <code>, for example --exam CY0-001');
  bankFor(code);
  const meta = metaFor(code);
  if (!meta) throw new Error(`unknown exam "${code}"`);
  return { meta, items: getBundledQuestions(code, { includeDrafts: true }) };
}
