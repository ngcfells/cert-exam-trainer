import { useEffect, useId, useState } from 'react';
import { getSourceFilter, SOURCE_SETTING, type SourceFilter } from '../banks/pool';
import type { Repo } from '../storage';

const LABELS: Record<SourceFilter, string> = { ours: 'Ours', mine: 'Mine', both: 'Both' };

/** Ours / Mine / Both; every mode reads this setting through loadPool. */
export function SourceToggle({ repo }: { repo: Repo }) {
  const [value, setValue] = useState<SourceFilter | null>(null);
  const [error, setError] = useState('');
  const name = useId();

  useEffect(() => {
    void getSourceFilter(repo).then(setValue);
  }, [repo]);

  async function choose(v: SourceFilter) {
    setValue(v);
    try {
      await repo.setSetting(SOURCE_SETTING, v);
      setError('');
    } catch {
      setError('Could not save this choice.');
    }
  }

  if (!value) return null;
  return (
    <fieldset className="source-toggle">
      <legend>Questions from</legend>
      {(Object.keys(LABELS) as SourceFilter[]).map((v) => (
        <label key={v}>
          <input type="radio" name={name} checked={value === v} onChange={() => void choose(v)} />
          {LABELS[v]}
        </label>
      ))}
      <p className="hint">Applies to mock exams, practice, cram and progress.</p>
      {error && <p role="alert">{error}</p>}
    </fieldset>
  );
}
