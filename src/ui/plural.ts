export const plural = (n: number, word: string) => `${n} ${n === 1 ? word : `${word}s`}`;
export const questions = (n: number) => plural(n, 'question');
