export interface LearnSource {
  id: string;
  label: string;
  /** Exam codes this source suits, or 'all'. */
  exams: string[] | 'all';
  /** The source's search page for a phrase (the phrase is plain text; this encodes it). */
  url: (phrase: string) => string;
}

const enc = encodeURIComponent;
const CODING = ['AT0-001', 'DA0-002'];

// Each pattern was loaded once by hand (2026-11-10). W3Schools has no stable search URL of its own,
// so it searches its own site through DuckDuckGo.
export const LEARN_SOURCES: LearnSource[] = [
  { id: 'w3schools', label: 'W3Schools', exams: CODING, url: (p) => `https://duckduckgo.com/?q=${enc(`${p} site:w3schools.com`)}` },
  { id: 'freecodecamp', label: 'freeCodeCamp', exams: CODING, url: (p) => `https://www.freecodecamp.org/news/search/?query=${enc(p)}` },
  { id: 'khan', label: 'Khan Academy', exams: CODING, url: (p) => `https://www.khanacademy.org/search?page_search_query=${enc(p)}` },
  { id: 'mdn', label: 'MDN Web Docs', exams: CODING, url: (p) => `https://developer.mozilla.org/en-US/search?q=${enc(p)}` },
  { id: 'messer', label: 'Professor Messer', exams: ['CY0-001'], url: (p) => `https://www.professormesser.com/?s=${enc(p)}` },
  { id: 'mslearn', label: 'Microsoft Learn', exams: ['AT0-001', 'CY0-001'], url: (p) => `https://learn.microsoft.com/en-us/search/?terms=${enc(p)}` },
  { id: 'web', label: 'Web search', exams: 'all', url: (p) => `https://duckduckgo.com/?q=${enc(p)}` },
];
