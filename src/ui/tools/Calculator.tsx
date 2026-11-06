import { useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import { keyFromKeyboard, press, type CalcKey, type CalcState } from './calc';

/** Each key: what it shows, and its spoken name when that differs. A spoken name starts with any letters the key shows, so voice control can say them. */
const KEYS: [CalcKey, string, string?][] = [
  ['MC', 'MC', 'MC, memory clear'],
  ['MR', 'MR', 'MR, memory recall'],
  ['M+', 'M+', 'M+, memory add'],
  ['M-', 'M−', 'M−, memory subtract'],
  ['C', 'C', 'clear'],
  ['±', '±', 'plus or minus'],
  ['%', '%', 'percent'],
  ['/', '÷', 'divide'],
  ['7', '7'],
  ['8', '8'],
  ['9', '9'],
  ['*', '×', 'times'],
  ['4', '4'],
  ['5', '5'],
  ['6', '6'],
  ['-', '−', 'minus'],
  ['1', '1'],
  ['2', '2'],
  ['3', '3'],
  ['+', '+', 'plus'],
  ['0', '0'],
  ['.', '.', 'point'],
  ['√', '√', 'square root'],
  ['^', 'xʸ', 'xʸ, power'],
  ['⌫', '⌫', 'backspace'],
  ['=', '=', 'equals'],
];

export function Calculator({ state, onChange }: { state: CalcState; onChange: Dispatch<SetStateAction<CalcState>> }) {
  const hit = useCallback((k: CalcKey) => onChange((s) => press(s, k)), [onChange]);
  const ref = useRef<HTMLDivElement>(null);
  // Typed keys anywhere in the calculator; the keys themselves are the native, tappable path.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    function onKeyDown(e: KeyboardEvent) {
      // Escape closes the panel, as in every panel. Enter on a focused key presses that key.
      if (e.key === 'Escape' || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Enter' && e.target instanceof HTMLButtonElement) return;
      const k = keyFromKeyboard(e);
      if (!k) return;
      e.preventDefault();
      hit(k);
    }
    el.addEventListener('keydown', onKeyDown);
    return () => el.removeEventListener('keydown', onKeyDown);
  }, [hit]);
  return (
    <div className="calc" ref={ref}>
      {/* Focusable so typing has a place to land when the panel opens. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
      <output className="calc-display" aria-live="polite" aria-label="Calculator display" tabIndex={0} data-autofocus>
        {state.error ?? state.display}
      </output>
      <div className="calc-keys">
        {KEYS.map(([k, shown, spoken]) => (
          <button key={k} type="button" className={k === '=' ? 'calc-equals' : undefined} aria-label={spoken} onClick={() => hit(k)}>
            {shown}
          </button>
        ))}
      </div>
      <p className="calc-help">Type numbers and + − * / ^ %, Enter for equals, Backspace to delete a digit, Delete to clear.</p>
    </div>
  );
}
