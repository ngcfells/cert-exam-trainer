import { acceptedText, partCorrect, partIds, partLabel, valueText, type PartMap } from '../../domain/pbq';
import { formatNumericAnswer } from '../../domain/numeric';
import type { McqAnswer, McqPayload, Question } from '../../domain/types';
import type { ItemResponse } from '../../exam/scoring';
import { Table } from '../Table';

function optionTexts(q: Question, ids: string[]): string {
  const opts = (q.payload as McqPayload).options;
  return ids.map((id) => opts.find((o) => o.id === id)?.text ?? id).join('; ');
}

function PartsReview({ q, given }: { q: Question; given: PartMap }) {
  const notes = partIds(q).filter((id) => q.partExplanations?.[id]);
  return (
    <>
      <Table
        caption="Parts"
        head={['Part', 'Your answer', 'Correct answer', 'Result']}
        rows={partIds(q).map((id) => [
          id,
          partLabel(q, id),
          given[id] ? valueText(q, id, given[id]) : q.type === 'pbq-hotspot' ? 'Not selected' : 'Not answered',
          acceptedText(q, id),
          partCorrect(q, id, given) ? 'Correct' : 'Incorrect',
        ])}
      />
      {notes.length > 0 && (
        <ul>
          {notes.map((id) => (
            <li key={id}>{q.partExplanations![id]}</li>
          ))}
        </ul>
      )}
    </>
  );
}

/** The user's answer next to the correct one, plus the explanation. */
export function ItemReview({ q, response, showStem = true }: { q: Question; response: ItemResponse | undefined; showStem?: boolean }) {
  const mcqType = q.type === 'mcq-single' || q.type === 'mcq-multi';
  const picked = Array.isArray(response) ? response : [];
  return (
    <>
      {showStem && (
        <p>
          <strong>{q.stem}</strong>
        </p>
      )}
      {q.type === 'numeric' ? (
        <dl>
          <dt>Your answer</dt>
          <dd>{picked[0]?.trim() || 'Not answered'}</dd>
          <dt>Correct answer</dt>
          <dd>{formatNumericAnswer(q)}</dd>
        </dl>
      ) : mcqType ? (
        <dl>
          <dt>Your answer</dt>
          <dd>{picked.length ? optionTexts(q, picked) : 'Not answered'}</dd>
          <dt>Correct answer</dt>
          <dd>{optionTexts(q, (q.answer as McqAnswer).correct)}</dd>
        </dl>
      ) : (
        <PartsReview q={q} given={response && !Array.isArray(response) ? response : {}} />
      )}
      <p>{q.explanation}</p>
    </>
  );
}
