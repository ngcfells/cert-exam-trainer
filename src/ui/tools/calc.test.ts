import { describe, expect, it } from 'vitest';
import { CALC_START, keyFromKeyboard, press, type CalcKey, type CalcState } from './calc';

const run = (keys: CalcKey[], from: CalcState = CALC_START): CalcState => keys.reduce(press, from);

describe('calculator engine', () => {
  it('runs each key as pressed, like a desk calculator', () => {
    expect(run(['2', '+', '3', '*', '4', '=']).display).toBe('20');
  });

  it('handles percent, sign and square root', () => {
    expect(run(['5', '0', '%']).display).toBe('0.5');
    expect(run(['9', '±']).display).toBe('-9');
    expect(run(['1', '6', '√']).display).toBe('4');
  });

  it('shows 12 significant digits with a dot and no grouping', () => {
    expect(run(['2', '^', '0', '.', '5', '=']).display).toBe('1.41421356237');
    expect(run(['1', '0', '0', '0', '0', '0', '0', '*', '1', '0', '0', '0', '0', '0', '0', '=']).display).toBe('1000000000000');
  });

  it('reports divide by zero and impossible results', () => {
    expect(run(['1', '/', '0', '=']).error).toBe("Can't divide by zero");
    expect(run(['9', '±', '√']).error).toBe('Not a number');
    expect(run(['8', '±', '^', '0', '.', '5', '=']).error).toBe('Not a number');
  });

  it('clears an error on the next key', () => {
    const err = run(['1', '/', '0', '=']);
    const seven = press(err, '7');
    expect(seven.display).toBe('7');
    expect(seven.error).toBeNull();
    const plus = press(err, '+');
    expect(plus.display).toBe('0');
    expect(plus.error).toBeNull();
    expect(plus.op).toBeNull();
  });

  it('keeps a memory', () => {
    expect(run(['5', 'M+', '3', 'M+', 'MR']).display).toBe('8');
    expect(run(['5', 'M+', '3', 'M-', 'MR']).display).toBe('2');
    expect(run(['5', 'M+', 'MC']).memory).toBe(0);
    const cleared = run(['5', 'M+', '2', '+', '3', 'C']);
    expect(cleared.display).toBe('0');
    expect(cleared.op).toBeNull();
    expect(cleared.memory).toBe(5);
  });

  it('rounds away float noise', () => {
    expect(run(['0', '.', '1', '+', '0', '.', '2', '=']).display).toBe('0.3');
  });

  it('keeps full precision behind the 12 digits it shows', () => {
    expect(run(['1', '/', '3', '=', '*', '3', '=']).display).toBe('1');
    expect(run(['1', '/', '3', '*', '3', '=']).display).toBe('1');
    expect(run(['2', '√', '*', '2', '√', '=']).display).toBe('2');
    // Typing over a result starts a new number.
    expect(run(['1', '/', '3', '=', '5']).display).toBe('5');
  });

  it('backspace deletes the last typed digit, never a result', () => {
    expect(run(['1', '2', '3', '⌫']).display).toBe('12');
    expect(run(['7', '⌫']).display).toBe('0');
    expect(run(['7', '±', '⌫']).display).toBe('0');
    expect(run(['1', '.', '⌫']).display).toBe('1');
    expect(run(['2', '+', '3', '=', '⌫']).display).toBe('5');
  });

  it('± right after an operator starts a negative number', () => {
    expect(run(['5', '+', '±', '3', '=']).display).toBe('2');
    expect(run(['5', '*', '±', '2', '=']).display).toBe('-10');
  });

  it('maps keyboard keys', () => {
    expect(keyFromKeyboard({ key: ',' })).toBe('.');
    expect(keyFromKeyboard({ key: 'Backspace' })).toBe('⌫');
    expect(keyFromKeyboard({ key: 'Enter' })).toBe('=');
    expect(keyFromKeyboard({ key: 'Escape' })).toBe('C');
    expect(keyFromKeyboard({ key: '7' })).toBe('7');
    expect(keyFromKeyboard({ key: '^' })).toBe('^');
    expect(keyFromKeyboard({ key: 'x' })).toBeNull();
  });
});
