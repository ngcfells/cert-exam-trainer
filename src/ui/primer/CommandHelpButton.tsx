import { useMemo } from 'react';
import type { Question } from '../../domain/types';
import { topicsFor } from '../../primer/match';
import { usePanels } from '../panels/PanelProvider';

/** Opens Command help for the commands this question uses. Hidden when it uses none, and during a mock exam. */
export function CommandHelpButton({ question }: { question: Question }) {
  const { mockDeadline, openCommandHelp } = usePanels();
  const ids = useMemo(() => topicsFor(question).map((t) => t.id), [question]);
  if (ids.length === 0 || mockDeadline !== null) return null;
  return (
    <button type="button" aria-haspopup="dialog" onClick={(e) => openCommandHelp(ids, e.currentTarget)}>
      Command help
    </button>
  );
}
