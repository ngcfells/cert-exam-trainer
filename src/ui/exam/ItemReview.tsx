import { acceptedText, partCorrect, partIds, partLabel, valueText, type PartMap } from '../../domain/pbq';
import { formatNumericAnswer } from '../../domain/numeric';
import { displayStem, effectivePick, pickHint } from '../../domain/pick';
import type { McqAnswer, McqPayload, Question } from '../../domain/types';
import type { ItemResponse } from '../../exam/scoring';
import { Table } from '../Table';
import { RichText } from '../RichText';
import { AnswerMark } from '../marks/AnswerMark';

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
          <AnswerMark key="r" size="small" level={partCorrect(q, id, given) ? 'right' : 'wrong'} />,
        ])}
      />
      {notes.length > 0 && (
        <ul>
          {notes.map((id) => (
            <li key={id}><RichText text={q.partExplanations![id]} /></li>
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
          <strong><RichText text={displayStem(q)} /></strong>
        </p>
      )}
      {showStem && q.type === 'mcq-multi' && <p className="hint">{pickHint(effectivePick(q))}</p>}
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
          <dd>{picked.length ? <RichText text={optionTexts(q, picked)} /> : 'Not answered'}</dd>
          <dt>Correct answer</dt>
          <dd><RichText text={optionTexts(q, (q.answer as McqAnswer).correct)} /></dd>
        </dl>
      ) : (
        <PartsReview q={q} given={response && !Array.isArray(response) ? response : {}} />
      )}
      <p><RichText text={q.explanation} /></p>
    </>
  );
}
