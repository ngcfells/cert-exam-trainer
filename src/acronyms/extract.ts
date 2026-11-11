import type { Question } from '../domain/types';
import { stripCode } from '../domain/richText';

/** Words in capitals that are not acronyms: SQL keywords and functions, log levels, HTTP methods, and plain emphasis. */
export const NOT_ACRONYMS: ReadonlySet<string> = new Set([
  'SELECT', 'FROM', 'WHERE', 'GROUP', 'BY', 'ORDER', 'HAVING', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER', 'CROSS',
  'ON', 'AS', 'AND', 'OR', 'NOT', 'NULL', 'IN', 'IS', 'LIKE', 'UNION', 'ALL', 'USING', 'DISTINCT', 'LIMIT', 'ASC', 'DESC',
  'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'VIEW', 'INDEX', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
  'COUNT', 'SUM', 'AVG', 'MIN', 'MAX',
  // Roman numerals, as in "Type II error".
  'II', 'III',
  'EXISTS', 'EXCEPT', 'INTERSECT', 'CAST', 'EXTRACT', 'VARCHAR', 'CHAR', 'INT', 'INTEGER', 'DECIMAL', 'FLOAT', 'DATE', 'YEAR', 'MONTH',
  'BETWEEN', 'COALESCE', 'OFFSET', 'PARTITION', 'OVER', 'WITH', 'TOP', 'ROUND', 'TRIM', 'UPPER', 'LOWER', 'CONCAT', 'IF', 'IFNULL', 'ISNULL',
  'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'TRUE', 'FALSE',
  'COUNTIF', 'COUNTIFS', 'SUMIF', 'SUMIFS', 'AVERAGEIF', 'DATEDIFF', 'DATEADD', 'STDEV', 'MEDIAN', 'MODE', 'LEN', 'MID', 'SUBSTR', 'NOW', 'TODAY',
  'IFERROR', 'VLOOKUP', 'XLOOKUP', 'AVERAGE', 'REPLACE', 'NULLIF', 'GETDATE', 'DATEPART', 'VAR',
  'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL',
  // Placeholders in real help text, as in "Usage: ls [OPTION]... [FILE]...".
  'OPTION', 'FILE',
  // HTTP methods (DELETE is above). POST stays a token: AT0-001 lists it as an acronym.
  'GET', 'PUT', 'PATCH', 'HEAD', 'OPTIONS',
  // Product name, as in ".NET".
  'NET',
  // Exit status word in real systemd output, as in "status=1/FAILURE".
  'FAILURE',
  // Names, not acronyms: the MITRE Corporation, its ATT&CK knowledge base (read as ATT and CK) and the WHOIS lookup.
  'MITRE', 'ATT', 'CK', 'WHOIS',
  'TWO', 'THREE', 'FOUR', 'NO', 'YES',
]);

// 2–8 letters or digits, starting with a letter, with an optional plural "s".
const TOKEN = /\b([A-Z][A-Z0-9]{1,7})s?\b/g;

/** Acronym tokens in `text` outside code, sorted and unique (docs/acronyms.md has the rule). */
export function extractAcronyms(text: string): string[] {
  const found = new Set<string>();
  for (const [, t] of stripCode(text).matchAll(TOKEN)) {
    if ((t.match(/[A-Z]/g) ?? []).length >= 2 && !NOT_ACRONYMS.has(t)) found.add(t);
  }
  return [...found].sort();
}

/**
 * True when `token` is a listed term, or one of the parts of a compound term split on "/" or spaces.
 * The extractor reads "CI/CD" as CI and CD, and "PCI DSS" as PCI and DSS, so those parts are covered.
 */
export function acronymCovered(token: string, terms: ReadonlySet<string>): boolean {
  if (terms.has(token)) return true;
  for (const term of terms) if (/[/\s]/.test(term) && term.split(/[/\s]+/).includes(token)) return true;
  return false;
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
