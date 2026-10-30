import { useState, type FormEvent } from 'react';
import type { AcronymEntry } from '../../acronyms/list';
import { deleteUserAcronym, saveUserAcronym } from '../../acronyms/userList';
import type { Repo } from '../../storage';

export function MyAcronyms({
  repo,
  examCode,
  mine,
  suggestions,
  onChanged,
}: {
  repo: Repo;
  examCode: string;
  mine: AcronymEntry[];
  /** Terms found in the user's questions that no list covers yet. */
  suggestions: string[];
  onChanged: () => Promise<void>;
}) {
  const [term, setTerm] = useState('');
  const [expansion, setExpansion] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const errorOn = error.startsWith('Enter what') ? 'meaning' : error ? 'term' : null;

  async function save(e: FormEvent) {
    e.preventDefault();
    setMessage('');
    try {
      const r = await saveUserAcronym(repo, examCode, term, expansion);
      if (r.error) {
        setError(r.error);
        return;
      }
      setError('');
      setMessage(`Saved ${term.trim().toUpperCase()}.`);
      setTerm('');
      setExpansion('');
      await onChanged();
    } catch {
      setError('Could not save the acronym.');
    }
  }

  async function remove(t: string) {
    if (!window.confirm(`Delete ${t} from your acronyms?`)) return;
    try {
      await deleteUserAcronym(repo, examCode, t);
      setMessage(`Deleted ${t}.`);
      await onChanged();
    } catch {
      setMessage(`Could not delete ${t}.`);
    }
  }

  return (
    <section className="my-acronyms" aria-labelledby="my-acr-h">
      <h3 id="my-acr-h">My acronyms</h3>
      <p>Your own acronyms are kept in this browser only.</p>
      {suggestions.length > 0 && (
        <>
          <h4>Found in your questions</h4>
          <ul className="acronym-suggestions">
            {suggestions.map((t) => (
              <li key={t}>
                <button
                  type="button"
                  aria-label={`Add ${t}`}
                  onClick={() => {
                    setTerm(t);
                    setError('');
                    document.getElementById('my-acr-meaning')?.focus();
                  }}
                >
                  {t}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <form onSubmit={(e) => void save(e)} noValidate>
        <label>
          Acronym
          <input
            id="my-acr-term"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            aria-invalid={errorOn === 'term' || undefined}
            aria-describedby={errorOn === 'term' ? 'my-acr-error' : undefined}
          />
        </label>
        <label>
          Meaning
          <input
            id="my-acr-meaning"
            value={expansion}
            onChange={(e) => setExpansion(e.target.value)}
            aria-invalid={errorOn === 'meaning' || undefined}
            aria-describedby={errorOn === 'meaning' ? 'my-acr-error' : undefined}
          />
        </label>
        <button type="submit">Save acronym</button>
        <p id="my-acr-error" className="field-error" role="alert">
          {error}
        </p>
      </form>
      <p role="status">{message}</p>
      {mine.length > 0 && (
        <table>
          <caption>Your acronyms</caption>
          <thead>
            <tr>
              <th scope="col">Acronym</th>
              <th scope="col">Meaning</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {mine.map((a) => (
              <tr key={a.term}>
                <th scope="row">{a.term}</th>
                <td>{a.expansion}</td>
                <td>
                  <button type="button" aria-label={`Edit ${a.term}`} onClick={() => {
                      setTerm(a.term);
                      setExpansion(a.expansion);
                      setError('');
                      document.getElementById('my-acr-meaning')?.focus();
                    }}
                  >
                    Edit
                  </button>{' '}
                  <button type="button" aria-label={`Delete ${a.term}`} onClick={() => void remove(a.term)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
