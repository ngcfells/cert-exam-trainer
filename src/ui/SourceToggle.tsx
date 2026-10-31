import { useEffect, useId, useState } from 'react';
import { getSourceFilter, setSourceFilter, type SourceFilter } from '../banks/pool';
import type { Repo } from '../storage';

// Stored values stay ours / mine / both; only the words on screen are Stock and Custom.
const LABELS: [SourceFilter, string][] = [
  ['both', 'Stock + Custom'],
  ['ours', 'Stock only'],
  ['mine', 'Custom only'],
];

/** The exam's own source choice; every mode reads it through loadPool. */
export function SourceToggle({ repo, examCode }: { repo: Repo; examCode: string }) {
  const [value, setValue] = useState<SourceFilter | null>(null);
  const [error, setError] = useState('');
  const name = useId();

  useEffect(() => {
    void getSourceFilter(repo, examCode).then(setValue);
  }, [repo, examCode]);

  async function choose(v: SourceFilter) {
    setValue(v);
    try {
      await setSourceFilter(repo, examCode, v);
      setError('');
    } catch {
      setError('Could not save this choice.');
    }
  }

  if (!value) return null;
  return (
    <fieldset className="source-toggle">
      <legend>Questions to use</legend>
      {LABELS.map(([v, label]) => (
        <label key={v}>
          <input type="radio" name={name} checked={value === v} onChange={() => void choose(v)} />
          {label}
        </label>
      ))}
      <p className="hint">Applies to mock exams, practice, cram, progress and acronyms for this exam.</p>
      {error && <p role="alert">{error}</p>}
    </fieldset>
  );
}
