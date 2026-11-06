import { useEffect, useState } from 'react';
import type { Repo } from '../../storage';
import { applyTips, getTips, loadTips, resetTips, setTipsOn, useTipsOn } from './prefs';

/** Settings: study tips on or off, and a button that starts them over (issue #3). */
export function TipSettings({ repo }: { repo: Repo }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const on = useTipsOn();

  useEffect(() => {
    // A failed read still shows the controls, from what the app already holds.
    void loadTips(repo).then(
      (p) => applyTips(p, repo),
      () => applyTips(getTips(), repo),
    ).then(() => setReady(true));
  }, [repo]);

  async function run(job: () => Promise<void>, done = '') {
    try {
      await job();
      setError('');
      setStatus(done);
    } catch {
      setStatus('');
      setError('Could not save this choice.');
    }
  }

  if (!ready) return null;
  return (
    <div className="display-settings tip-settings">
      <fieldset>
        <legend>Study tips</legend>
        <label className="check">
          <input type="checkbox" checked={on} onChange={(e) => void run(() => setTipsOn(e.target.checked))} />
          Show study tips in practice and cram
        </label>
        <button type="button" onClick={() => void run(resetTips, 'Tips start over from the beginning.')}>
          Start the tips over
        </button>
      </fieldset>
      <p role="status">{status}</p>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
