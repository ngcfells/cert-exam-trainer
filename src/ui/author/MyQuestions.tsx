import { useCallback, useEffect, useId, useState, type ChangeEvent } from 'react';
import type { Question } from '../../domain/types';
import type { Repo } from '../../storage';
import { ImportError } from '../../storage/backup';
import { exportPack, importPack } from '../../storage/pack';
import { dateStamp, downloadJson } from '../download';
import { LoadError } from '../study/LoadError';
import { questions as plural } from '../plural';
import { ContentNotice, NOTICE_SETTING } from './ContentNotice';
import { ellipsize, STATUS_LABELS, TYPE_LABELS } from './typeLabels';
import './author.css';

export function packFileName(exam: string, d: Date): string {
  return `cert-exam-trainer-questions-${exam}-${dateStamp(d)}.json`;
}

export function MyQuestions({
  repo,
  examCode,
  onExit,
  onEdit,
}: {
  repo: Repo;
  examCode: string;
  onExit: () => void;
  /** No id = new question. */
  onEdit: (id?: string) => void;
}) {
  const [list, setList] = useState<Question[] | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [failed, setFailed] = useState(false);
  const [message, setMessage] = useState('');
  const fileId = useId();

  const refresh = useCallback(async () => {
    try {
      const [qs, ok] = await Promise.all([repo.getUserQuestions(examCode), repo.getSetting<boolean>(NOTICE_SETTING)]);
      setList(qs.sort((a, b) => a.stem.localeCompare(b.stem)));
      setAccepted(ok === true);
    } catch {
      setFailed(true);
    }
  }, [repo, examCode]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function accept() {
    try {
      await repo.setSetting(NOTICE_SETTING, true);
      setAccepted(true);
    } catch {
      setMessage('Could not save your answer. Please try again.');
    }
  }

  async function remove(q: Question) {
    if (!window.confirm(`Delete this question?\n\n${ellipsize(q.stem, 120)}`)) return;
    try {
      await repo.deleteUserQuestion(q.id);
      setMessage('Question deleted.');
      await refresh();
    } catch {
      setMessage('Delete failed. Please try again.');
    }
  }

  async function onExport() {
    try {
      const pack = await exportPack(repo, examCode);
      downloadJson(packFileName(examCode, new Date()), pack);
      setMessage(`Exported ${plural(pack.questions.length)}.`);
    } catch {
      setMessage('Export failed. Please try again.');
    }
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const res = await importPack(repo, await file.text(), examCode);
      const skipped = res.skipped.length
        ? ` Skipped ${res.skipped.length}: ${res.skipped.map((s) => `${s.id} (${s.reason})`).join(', ')}.`
        : '';
      setMessage(`Imported ${plural(res.imported)}.${skipped}`);
      await refresh();
    } catch (err) {
      setMessage(`Import failed: ${err instanceof ImportError ? err.message : 'something went wrong reading the file.'}`);
    } finally {
      input.value = '';
    }
  }

  if (failed) return <LoadError onExit={onExit} />;
  if (!list) return <p>Loading…</p>;
  return (
    <section className="my-questions" aria-labelledby={`${fileId}-h`}>
      <h2 id={`${fileId}-h`}>{`My questions: ${examCode}`}</h2>
      <button type="button" onClick={onExit}>
        Back to home
      </button>
      {accepted ? (
        <div className="author-actions">
          <button type="button" className="primary" onClick={() => onEdit()}>
            Add question
          </button>
          <label htmlFor={fileId}>Import questions (.json)</label>
          <input id={fileId} type="file" accept=".json,application/json" onChange={onFile} />
        </div>
      ) : (
        <ContentNotice onAccept={() => void accept()} />
      )}
      <button type="button" onClick={onExport} disabled={list.length === 0}>
        Export my questions
      </button>
      <p aria-live="polite">{message}</p>
      {list.length === 0 ? (
        <p>You have not added any questions for this exam yet.</p>
      ) : (
        <table>
          <caption>{plural(list.length)}</caption>
          <thead>
            <tr>
              <th scope="col">Question</th>
              <th scope="col">Type</th>
              <th scope="col">Status</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map((q) => (
              <tr key={q.id}>
                <td>{ellipsize(q.stem, 100)}</td>
                <td>{TYPE_LABELS[q.type]}</td>
                <td>{STATUS_LABELS[q.status]}</td>
                <td className="row-actions">
                  <button type="button" onClick={() => onEdit(q.id)} aria-label={`Edit: ${ellipsize(q.stem, 60)}`}>
                    Edit
                  </button>
                  <button type="button" onClick={() => void remove(q)} aria-label={`Delete: ${ellipsize(q.stem, 60)}`}>
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
