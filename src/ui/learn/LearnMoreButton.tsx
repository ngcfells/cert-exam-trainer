import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { metaFor } from '../../banks/metas';
import type { Question } from '../../domain/types';
import { learnUrl, searchPhrase, sourcesFor } from '../../learn/learn';
import { usePanels } from '../panels/PanelProvider';
import { ExternalLink, LINKS_NOTE } from '../primer/ExternalLink';
import './learn.css';

/** After an answer: a menu of free sites that search for this question's topic. Hidden during a mock. */
export function LearnMoreButton({ question }: { question: Question }) {
  const { mockDeadline } = usePanels();
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const phrase = useMemo(() => searchPhrase(question, metaFor(question.exam)), [question]);
  const sources = useMemo(() => sourcesFor(question.exam), [question.exam]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      btn.current?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);
  if (mockDeadline !== null) return null;
  return (
    <div className="learn-more">
      <button ref={btn} type="button" aria-expanded={open} aria-controls={menuId} onClick={() => setOpen((o) => !o)}>
        <span aria-hidden="true">🤔 </span>Learn more
      </button>
      {open && (
        <div id={menuId}>
          <p className="hint">Search a free site for: {phrase}. {LINKS_NOTE}</p>
          <ul className="learn-more-list">
            {sources.map((s) => (
              <li key={s.id}>
                <ExternalLink href={learnUrl(s, phrase)}>{s.label}</ExternalLink>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
