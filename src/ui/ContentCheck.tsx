import { useState } from 'react';
import { checkContent, updateApp, type CheckResult } from '../integrity/check';
import type { ExamDiff } from '../integrity/manifest';
import { ONLINE_APP_URL } from './legal';

const count = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;

/** "10 Nov 2026" from "2026-11-10". */
function releaseDate(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/** For example "DA0-002: 3 questions and 1 lesson differ; the exam details differ." */
export function describeDiff(d: ExamDiff): string {
  const questions = d.changed.length + d.missing.length + d.extra.length;
  const lessons = d.lessonsChanged.length + d.lessonsMissing.length + d.lessonsExtra.length;
  const items = [questions ? count(questions, 'question') : '', lessons ? count(lessons, 'lesson') : ''].filter(Boolean);
  const parts = [
    items.length ? `${items.join(' and ')} ${questions + lessons === 1 ? 'differs' : 'differ'}` : '',
    d.metaDiffers ? 'the exam details differ' : '',
  ].filter(Boolean);
  return `${d.exam}: ${parts.join('; ')}.`;
}

/**
 * Settings section, hosted app only: compares the stock content with the official SHA-512/256 hashes (issue #11)
 * and offers the newer version when the content is out of date.
 */
export function ContentCheck({ check = checkContent, update = updateApp }: { check?: typeof checkContent; update?: typeof updateApp }) {
  const [result, setResult] = useState<CheckResult | 'checking' | null>(null);
  const [updating, setUpdating] = useState<'working' | 'none' | null>(null);

  async function run() {
    setUpdating(null);
    setResult('checking');
    setResult(await check());
  }

  async function runUpdate() {
    setUpdating('working');
    if ((await update()) === 'none') setUpdating('none');
  }

  return (
    <section className="content-check" aria-labelledby="content-check-h">
      <h3 id="content-check-h">Check the content</h3>
      <p>
        Compares this app&apos;s stock questions, lessons and exam details with the official list. It sends none of your data; it
        fetches one public file from GitHub.
      </p>
      <button type="button" disabled={result === 'checking'} onClick={() => void run()}>
        Check content
      </button>
      <div role="status">
        {result === 'checking' && <p>Checking…</p>}
        {result !== 'checking' && result?.kind === 'verified' && (
          <p>{`Verified. The stock content matches the current official release (${releaseDate(result.release.date)}).`}</p>
        )}
        {result !== 'checking' && result?.kind === 'outdated' && (
          <>
            <p>This content is official but out of date.</p>
            {updating === 'none' && <p>No newer version is available yet. Try again in a few minutes.</p>}
          </>
        )}
        {result !== 'checking' && result?.kind === 'mismatch' && (
          <>
            <p>
              <strong>This content does not match any official release.</strong>
            </p>
            <ul>
              {result.diffs.map((d) => <li key={d.exam}>{describeDiff(d)}</li>)}
            </ul>
            <p>
              Do not rely on this copy. Use the official app at <a href={ONLINE_APP_URL}>{ONLINE_APP_URL}</a>.
            </p>
          </>
        )}
        {result !== 'checking' && result?.kind === 'error' && <p>Could not reach the official list. Check your connection and try again.</p>}
      </div>
      {result !== 'checking' && result?.kind === 'outdated' && (
        <button type="button" disabled={updating === 'working'} onClick={() => void runUpdate()}>
          Update now
        </button>
      )}
    </section>
  );
}
