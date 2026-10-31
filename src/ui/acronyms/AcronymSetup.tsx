import type { AcronymEntry, AcronymSource } from '../../acronyms/list';
import { assembleDeck, MIN_CHOICE_ENTRIES, type DeckScope, type Direction } from '../../acronyms/quiz';
import type { ExamMeta } from '../../domain/types';
import { isDue, parseSrsRecords } from '../../study/srs';
import { plural, Table, toCount, useFocusHeading } from '../kit';
import './acronyms.css';

export interface DeckChoices {
  mode: 'flashcards' | 'quiz';
  show: Direction;
  scope: DeckScope;
  count: number;
  answer: 'type' | 'choose';
  /** 0 = untimed. */
  minutes: number;
}

export const DEFAULT_DECK: DeckChoices = { mode: 'flashcards', show: 'term', scope: 'due', count: 20, answer: 'type', minutes: 0 };
export const MAX_CARDS = 200;
const TIME_OPTIONS = [0, 2, 5, 10];
export const SOURCE_LABELS: Record<AcronymSource, string> = { official: 'Official', community: 'Community', mine: 'Mine' };

export function AcronymSetup({
  meta,
  entries,
  srs,
  value,
  onChange,
  onStart,
  onCancel,
}: {
  meta: ExamMeta;
  entries: AcronymEntry[];
  srs: unknown[];
  value: DeckChoices;
  onChange: (v: DeckChoices) => void;
  onStart: () => void;
  onCancel: () => void;
}) {
  // Mounted once per visit to the setup, including after "Study again".
  const headingRef = useFocusHeading();
  const now = new Date();
  const terms = new Set(entries.map((a) => a.term));
  const due = parseSrsRecords(srs).filter((r) => r.exam === meta.code && r.kind === 'acronym' && terms.has(r.itemId) && isDue(r, now)).length;
  const available = assembleDeck({ entries, srs, exam: meta.code, now, seed: 1, scope: value.scope, count: entries.length }).length;
  const canChoose = entries.length >= MIN_CHOICE_ENTRIES;
  const answer = canChoose ? value.answer : 'type';
  const set = (patch: Partial<DeckChoices>) => onChange({ ...value, ...patch });

  let note = `${plural(Math.min(value.count, available), 'card')} ready.`;
  if (available === 0) note = 'Nothing due. Choose "All" to study every card.';
  else if (value.count < 1) note = 'Enter how many cards to study.';

  const radio = <K extends keyof DeckChoices>(name: K, v: DeckChoices[K], label: string, disabled = false) => (
    <label>
      <input type="radio" name={`acr-${name}`} checked={(name === 'answer' ? answer : value[name]) === v} disabled={disabled} onChange={() => set({ [name]: v })} />
      {label}
    </label>
  );

  return (
    <section className="study-setup" aria-labelledby="acr-h">
      <h2 id="acr-h" ref={headingRef} tabIndex={-1}>{`Acronyms: ${meta.name} (${meta.code})`}</h2>
      {entries.length === 0 ? (
        <p>No acronyms for this exam with the current source setting.</p>
      ) : (
        <>
          <p>{`${plural(entries.length, 'acronym')}, ${due} due for review`}</p>
          <fieldset>
            <legend>Mode</legend>
            {radio('mode', 'flashcards', 'Flashcards')}
            {radio('mode', 'quiz', 'Quiz')}
          </fieldset>
          <fieldset>
            <legend>Show</legend>
            {radio('show', 'term', 'Acronym')}
            {radio('show', 'expansion', 'Meaning')}
          </fieldset>
          <fieldset>
            <legend>Cards</legend>
            {radio('scope', 'due', 'Due and new')}
            {radio('scope', 'all', 'All')}
            <label>
              Number of cards
              <input type="number" min={1} max={MAX_CARDS} value={value.count || ''} onChange={(e) => set({ count: toCount(e.target.value, MAX_CARDS) })} />
            </label>
          </fieldset>
          {value.mode === 'quiz' && (
            <>
              <fieldset aria-describedby={canChoose ? undefined : 'acr-choose-hint'}>
                <legend>Answer</legend>
                {radio('answer', 'type', 'Type it')}
                {radio('answer', 'choose', 'Choose', !canChoose)}
                {!canChoose && <p id="acr-choose-hint">{`Choosing needs at least ${MIN_CHOICE_ENTRIES} acronyms.`}</p>}
              </fieldset>
              <fieldset>
                <legend>Time</legend>
                {TIME_OPTIONS.map((m) => (
                  <span key={m}>{radio('minutes', m, m === 0 ? 'None' : `${m} minutes`)}</span>
                ))}
              </fieldset>
            </>
          )}
          <p role="status">{note}</p>
          <button type="button" className="primary" disabled={available === 0 || value.count < 1} onClick={onStart}>
            Start
          </button>{' '}
        </>
      )}
      <button type="button" onClick={onCancel}>
        {entries.length === 0 ? 'Back' : 'Cancel'}
      </button>
      {entries.length > 0 && (
        <details className="acronym-list">
          <summary>Full list</summary>
          <Table caption="Full list of acronyms" head={['Acronym', 'Meaning', 'Source']} rows={entries.map((a) => [a.term, a.term, a.expansion, SOURCE_LABELS[a.source]])} />
        </details>
      )}
    </section>
  );
}
