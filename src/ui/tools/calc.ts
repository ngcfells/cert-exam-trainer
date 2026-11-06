/** A basic desk calculator: each key runs as it is pressed (2 + 3 × 4 = 20). Pure, so it is easy to test. */

type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
export type CalcOp = '+' | '-' | '*' | '/' | '^';
export type CalcKey = Digit | '.' | CalcOp | '=' | '%' | '±' | '√' | 'M+' | 'M-' | 'MR' | 'MC' | 'C';

export interface CalcState {
  display: string;
  acc: number | null;
  op: CalcOp | null;
  /** The next digit starts a new number. */
  fresh: boolean;
  memory: number;
  error: string | null;
}

export const CALC_START: CalcState = { display: '0', acc: null, op: null, fresh: true, memory: 0, error: null };

export const DIV_ZERO = "Can't divide by zero";
export const NOT_A_NUMBER = 'Not a number';

const MAX_DIGITS = 15;

/** 12 significant digits, `.` as the decimal mark, no grouping. Null for NaN or infinity. */
function format(v: number): string | null {
  if (!Number.isFinite(v)) return null;
  const n = Number(v.toPrecision(12));
  if (Object.is(n, -0) || n === 0) return '0';
  const s = String(n);
  return s.includes('e') ? n.toPrecision(12).replace(/\.?0+e/, 'e') : s;
}

function apply(a: number, op: CalcOp, b: number): number | typeof DIV_ZERO {
  switch (op) {
    case '+':
      return a + b;
    case '-':
      return a - b;
    case '*':
      return a * b;
    case '/':
      return b === 0 ? DIV_ZERO : a / b;
    case '^':
      return a ** b;
  }
}

const isDigit = (k: CalcKey): k is Digit => /^[0-9]$/.test(k);

/** Shows a computed value, or the error it causes. */
function show(s: CalcState, v: number | typeof DIV_ZERO, rest: Partial<CalcState> = {}): CalcState {
  if (v === DIV_ZERO) return { ...s, ...rest, error: DIV_ZERO, display: '0', acc: null, op: null, fresh: true };
  const text = format(v);
  if (text === null) return { ...s, ...rest, error: NOT_A_NUMBER, display: '0', acc: null, op: null, fresh: true };
  return { ...s, ...rest, display: text, fresh: true };
}

export function press(state: CalcState, k: CalcKey): CalcState {
  let s = state;
  if (s.error) {
    s = { ...CALC_START, memory: s.memory };
    if (!isDigit(k) && k !== '.') return s;
  }
  const cur = Number(s.display);

  if (isDigit(k)) {
    if (s.fresh) return { ...s, display: k, fresh: false };
    if (s.display.replace(/[-.]/g, '').length >= MAX_DIGITS) return s;
    if (s.display === '0') return { ...s, display: k };
    if (s.display === '-0') return { ...s, display: `-${k}` };
    return { ...s, display: s.display + k };
  }

  switch (k) {
    case '.':
      if (s.fresh) return { ...s, display: '0.', fresh: false };
      return s.display.includes('.') ? s : { ...s, display: `${s.display}.` };
    case '+':
    case '-':
    case '*':
    case '/':
    case '^': {
      if (s.op !== null && s.acc !== null && !s.fresh) {
        const next = show(s, apply(s.acc, s.op, cur));
        return next.error ? next : { ...next, acc: Number(next.display), op: k };
      }
      return { ...s, acc: s.op !== null && s.fresh && s.acc !== null ? s.acc : cur, op: k, fresh: true };
    }
    case '=':
      if (s.op === null || s.acc === null) return { ...s, fresh: true };
      return show(s, apply(s.acc, s.op, cur), { acc: null, op: null });
    case '%':
      return show(s, cur / 100);
    case '±':
      if (s.display === '0') return s;
      return { ...s, display: s.display.startsWith('-') ? s.display.slice(1) : `-${s.display}` };
    case '√':
      return show(s, Math.sqrt(cur));
    case 'M+':
      return { ...s, memory: s.memory + cur, fresh: true };
    case 'M-':
      return { ...s, memory: s.memory - cur, fresh: true };
    case 'MR':
      return show(s, s.memory);
    case 'MC':
      return { ...s, memory: 0 };
    case 'C':
      return { ...CALC_START, memory: s.memory };
  }
  return s;
}

const KEYBOARD: Record<string, CalcKey> = {
  Enter: '=',
  '=': '=',
  Escape: 'C',
  Delete: 'C',
  '.': '.',
  '+': '+',
  '-': '-',
  '*': '*',
  '/': '/',
  '^': '^',
  '%': '%',
};

export function keyFromKeyboard(e: { key: string }): CalcKey | null {
  if (/^[0-9]$/.test(e.key)) return e.key as Digit;
  return KEYBOARD[e.key] ?? null;
}
