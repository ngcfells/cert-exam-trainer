import { createContext, useContext, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { Panel } from '../panels/Panel';
import { usePanels } from '../panels/PanelProvider';
import { CALC_START, type CalcState } from './calc';
import { Calculator } from './Calculator';
import { Whiteboard, type Stroke } from './Whiteboard';
import './tools.css';

interface RunTools {
  calc: CalcState;
  setCalc: Dispatch<SetStateAction<CalcState>>;
  text: string;
  setText: Dispatch<SetStateAction<string>>;
  strokes: Stroke[];
  setStrokes: Dispatch<SetStateAction<Stroke[]>>;
}

const RunToolsContext = createContext<RunTools | null>(null);

/** The calculator memory and the whiteboard for one run. Unmounting it (the run ended) drops them. */
export function RunToolsProvider({ children }: { children: ReactNode }) {
  const [calc, setCalc] = useState<CalcState>(CALC_START);
  const [text, setText] = useState('');
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const value = useMemo(() => ({ calc, setCalc, text, setText, strokes, setStrokes }), [calc, text, strokes]);
  return <RunToolsContext.Provider value={value}>{children}</RunToolsContext.Provider>;
}

function useRunTools(): RunTools {
  const t = useContext(RunToolsContext);
  if (!t) throw new Error('useRunTools needs a RunToolsProvider');
  return t;
}

/** Calculator and Whiteboard, side by side. `disabled` once the run has ended. */
export function ToolButtons({ disabled = false }: { disabled?: boolean }) {
  const { open } = usePanels();
  return (
    <div className="tool-buttons">
      <button type="button" aria-haspopup="dialog" disabled={disabled} onClick={(e) => open('calculator', e.currentTarget)}>
        Calculator
      </button>
      <button type="button" aria-haspopup="dialog" disabled={disabled} onClick={(e) => open('whiteboard', e.currentTarget)}>
        Whiteboard
      </button>
    </div>
  );
}

/** The open tool panel, if any. */
export function ToolPanels() {
  const { current, close } = usePanels();
  const t = useRunTools();
  if (current === 'calculator')
    return (
      <Panel kind="calculator" title="Calculator" onClose={() => close()}>
        <Calculator state={t.calc} onChange={t.setCalc} />
      </Panel>
    );
  if (current === 'whiteboard')
    return (
      <Panel kind="whiteboard" title="Whiteboard" onClose={() => close()}>
        <Whiteboard text={t.text} onText={t.setText} strokes={t.strokes} onStrokes={t.setStrokes} />
      </Panel>
    );
  return null;
}
