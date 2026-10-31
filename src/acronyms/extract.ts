import type { Question } from '../domain/types';

/** Words in capitals that are not acronyms: SQL keywords and functions, log levels, and plain emphasis. */
export const NOT_ACRONYMS: ReadonlySet<string> = new Set([
  'SELECT', 'FROM', 'WHERE', 'GROUP', 'BY', 'ORDER', 'HAVING', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER', 'CROSS',
  'ON', 'AS', 'AND', 'OR', 'NOT', 'NULL', 'IN', 'IS', 'LIKE', 'UNION', 'ALL', 'DISTINCT', 'LIMIT', 'ASC', 'DESC',
  'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'VIEW', 'INDEX', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
  'COUNT', 'SUM', 'AVG', 'MIN', 'MAX',
  'EXISTS', 'EXCEPT', 'INTERSECT', 'CAST', 'EXTRACT', 'VARCHAR', 'CHAR', 'INT', 'INTEGER', 'DECIMAL', 'FLOAT', 'DATE', 'YEAR', 'MONTH',
  'BETWEEN', 'COALESCE', 'OFFSET', 'PARTITION', 'OVER', 'WITH', 'TOP', 'ROUND', 'TRIM', 'UPPER', 'LOWER', 'CONCAT', 'IF', 'IFNULL', 'ISNULL',
  'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'TRUE', 'FALSE',
  'COUNTIF', 'COUNTIFS', 'SUMIF', 'SUMIFS', 'AVERAGEIF', 'DATEDIFF', 'DATEADD', 'STDEV', 'MEDIAN', 'MODE', 'LEN', 'MID', 'SUBSTR', 'NOW', 'TODAY',
  'IFERROR', 'VLOOKUP', 'XLOOKUP', 'AVERAGE', 'REPLACE', 'NULLIF', 'GETDATE', 'DATEPART', 'VAR',
  'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL',
  'TWO', 'THREE', 'FOUR', 'NO', 'YES',
]);

// 2–8 letters or digits, starting with a letter, with an optional plural "s".
const TOKEN = /\b([A-Z][A-Z0-9]{1,7})s?\b/g;

/** Acronym tokens in `text`, sorted and unique (docs/acronyms.md has the rule). */
export function extractAcronyms(text: string): string[] {
  const found = new Set<string>();
  for (const [, t] of text.matchAll(TOKEN)) {
    if ((t.match(/[A-Z]/g) ?? []).length >= 2 && !NOT_ACRONYMS.has(t)) found.add(t);
  }
  return [...found].sort();
}

function strings(x: unknown): string[] {
  if (typeof x === 'string') return [x];
  if (Array.isArray(x)) return x.flatMap(strings);
  if (x && typeof x === 'object') return Object.values(x).flatMap(strings);
  return [];
}

/** Every piece of text a learner reads in a question: stem, explanations and payload strings. */
export function questionText(q: Question): string {
  return [q.stem, q.explanation, ...strings(q.partExplanations), ...strings(q.payload)].join('\n');
}
