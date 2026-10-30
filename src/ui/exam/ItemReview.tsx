import { acceptedText, partCorrect, partIds, partLabel, valueText, type PartMap } from '../../domain/pbq';
import type { McqAnswer, McqPayload, Question } from '../../domain/types';
import type { ItemResponse } from '../../exam/scoring';

function optionTexts(q: Question, ids: string[]): string {
  const opts = (q.payload as McqPayload).options;
  return ids.map((id) => opts.find((o) => o.id === id)?.text ?? id).join('; ');
}

function PartsReview({ q, given }: { q: Question; given: PartMap }) {
  const notes = partIds(q).filter((id) => q.partExplanations?.[id]);
  return (
    <>
      <table>
        <caption>Parts</caption>
        <thead>
          <tr>
            <th scope="col">Part</th>
            <th scope="col">Your answer</th>
            <th scope="col">Correct answer</th>
            <th scope="col">Result</th>
          </tr>
        </thead>
        <tbody>
          {partIds(q).map((id) => (
            <tr key={id}>
              <th scope="row">{partLabel(q, id)}</th>
              <td>{given[id] ? valueText(q, id, given[id]) : q.type === 'pbq-hotspot' ? 'Not selected' : 'Not answered'}</td>
              <td>{acceptedText(q, id)}</td>
              <td>{partCorrect(q, id, given) ? 'Correct' : 'Incorrect'}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
      {mcqType ? (
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
