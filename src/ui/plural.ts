export function questions(n: number): string {
  return `${n} ${n === 1 ? 'question' : 'questions'}`;
}

export function problems(n: number): string {
  return `${n} ${n === 1 ? 'problem' : 'problems'}`;
}
