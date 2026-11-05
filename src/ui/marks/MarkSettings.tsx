import { useEffect, useId, useState } from 'react';
import type { Repo } from '../../storage';
import { AnswerMark } from './AnswerMark';
import { applyMarks, loadMarks, MARK_NAMES, MARK_STYLES, MARKS_SETTING, SOUND_SETTING, type MarkPrefs } from './prefs';

/** Settings: the answer mark style (with a static preview of each) and the sound switch. */
export function MarkSettings({ repo }: { repo: Repo }) {
  const [state, setState] = useState<MarkPrefs | null>(null);
  const [error, setError] = useState('');
  const name = useId();

  useEffect(() => {
    void loadMarks(repo).then(setState);
  }, [repo]);

  async function save(next: MarkPrefs) {
    setState(next);
    applyMarks(next);
    try {
      await repo.setSetting(MARKS_SETTING, next.style);
      await repo.setSetting(SOUND_SETTING, next.sound);
      setError('');
    } catch {
      setError('Could not save this choice.');
    }
  }

  if (!state) return null;
  return (
    <div className="display-settings mark-settings">
      <fieldset>
        <legend>Answer marks</legend>
        {MARK_STYLES.map((s) => (
          <label key={s}>
            <input type="radio" name={name} checked={state.style === s} onChange={() => void save({ ...state, style: s })} />
            {MARK_NAMES[s]}
            <span className="mark-preview" aria-hidden="true">
              <AnswerMark level="right" markStyle={s} />
            </span>
          </label>
        ))}
      </fieldset>
      <label className="check">
        <input type="checkbox" checked={state.sound} onChange={(e) => void save({ ...state, sound: e.target.checked })} />
        Play a sound when an answer is checked
      </label>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
