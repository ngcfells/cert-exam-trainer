/** Letters, digits, spaces, hyphens and periods only: nothing that changes a URL. */
export const SEARCH_TERM_PATTERN = /^[A-Za-z0-9 .-]+$/;

/** A bank question's own search phrase: 2 to 6 words, at most 50 characters. */
export function isValidSearchTerm(s: string): boolean {
  if (s.length > 50 || !SEARCH_TERM_PATTERN.test(s)) return false;
  const words = s.trim().split(/\s+/).filter(Boolean).length;
  return words >= 2 && words <= 6;
}
